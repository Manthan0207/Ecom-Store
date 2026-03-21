package catalog

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	ListActiveProducts(ctx context.Context) ([]ListItem, error)
	GetActiveProductByID(ctx context.Context, productID string) (ProductDetail, error)
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) ListActiveProducts(ctx context.Context) ([]ListItem, error) {
	rows, err := r.db.Query(ctx, `
SELECT p.id::text,
       p.title,
       COALESCE(p.brand, ''),
       COALESCE(c.name, 'Uncategorized') AS category,
       p.target_audience,
       COALESCE(price.min_price, 0) AS min_price,
       COALESCE(price.max_price, 0) AS max_price,
       COALESCE(img.image_url, '') AS image_url,
       p.created_at
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN LATERAL (
  SELECT MIN(v.price)::float8 AS min_price,
         MAX(v.price)::float8 AS max_price
  FROM product_variants v
  WHERE v.product_id = p.id AND v.is_active = TRUE
) price ON true
LEFT JOIN LATERAL (
  SELECT image_url
  FROM product_images
  WHERE product_id = p.id
  ORDER BY is_featured DESC, sort_order ASC, created_at ASC
  LIMIT 1
) img ON true
WHERE p.status = 'active'
ORDER BY p.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ListItem, 0)
	for rows.Next() {
		var item ListItem
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Brand,
			&item.Category,
			&item.TargetAudience,
			&item.PriceMin,
			&item.PriceMax,
			&item.ImageURL,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) GetActiveProductByID(ctx context.Context, productID string) (ProductDetail, error) {
	var p ProductDetail
	row := r.db.QueryRow(ctx, `
SELECT p.id::text,
       p.title,
       COALESCE(p.description, ''),
       COALESCE(p.brand, ''),
       COALESCE(c.name, 'Uncategorized') AS category,
       p.target_audience
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.id = $1::uuid AND p.status = 'active'`, productID)

	if err := row.Scan(&p.ID, &p.Title, &p.Description, &p.Brand, &p.Category, &p.TargetAudience); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ProductDetail{}, pgx.ErrNoRows
		}
		return ProductDetail{}, err
	}

	priceRow := r.db.QueryRow(ctx, `
SELECT COALESCE(MIN(v.price)::float8, 0) AS min_price,
       COALESCE(MAX(v.price)::float8, 0) AS max_price
FROM product_variants v
WHERE v.product_id = $1::uuid AND v.is_active = TRUE`, productID)
	if err := priceRow.Scan(&p.PriceMin, &p.PriceMax); err != nil {
		return ProductDetail{}, err
	}

	colorRows, err := r.db.Query(ctx, `
SELECT pc.color_id::text, c.name, c.hex_code, pc.sort_order
FROM product_colors pc
JOIN colors c ON c.id = pc.color_id
WHERE pc.product_id = $1::uuid
ORDER BY pc.sort_order ASC, c.name ASC`, productID)
	if err != nil {
		return ProductDetail{}, err
	}
	defer colorRows.Close()
	for colorRows.Next() {
		var c ColorDetail
		if err := colorRows.Scan(&c.ColorID, &c.ColorName, &c.HexCode, &c.SortOrder); err != nil {
			return ProductDetail{}, err
		}
		p.Colors = append(p.Colors, c)
	}
	if err := colorRows.Err(); err != nil {
		return ProductDetail{}, err
	}

	variantRows, err := r.db.Query(ctx, `
SELECT v.id::text, pc.color_id::text, v.sku, v.size,
       v.price::float8, v.compare_at_price::float8, v.stock_qty, v.is_active
FROM product_variants v
JOIN product_colors pc ON pc.id = v.product_color_id
WHERE v.product_id = $1::uuid AND v.is_active = TRUE
ORDER BY v.created_at ASC`, productID)
	if err != nil {
		return ProductDetail{}, err
	}
	defer variantRows.Close()
	for variantRows.Next() {
		var v VariantDetail
		if err := variantRows.Scan(
			&v.ID,
			&v.ColorID,
			&v.SKU,
			&v.Size,
			&v.Price,
			&v.CompareAtPrice,
			&v.StockQty,
			&v.IsActive,
		); err != nil {
			return ProductDetail{}, err
		}
		p.Variants = append(p.Variants, v)
	}
	if err := variantRows.Err(); err != nil {
		return ProductDetail{}, err
	}

	imageRows, err := r.db.Query(ctx, `
SELECT i.id::text, pc.color_id::text, i.image_url, COALESCE(i.alt_text, ''),
       i.sort_order, i.is_featured
FROM product_images i
LEFT JOIN product_colors pc ON pc.id = i.product_color_id
WHERE i.product_id = $1::uuid
ORDER BY i.is_featured DESC, i.sort_order ASC, i.created_at ASC`, productID)
	if err != nil {
		return ProductDetail{}, err
	}
	defer imageRows.Close()
	for imageRows.Next() {
		var img ImageDetail
		if err := imageRows.Scan(
			&img.ID,
			&img.ColorID,
			&img.ImageURL,
			&img.AltText,
			&img.SortOrder,
			&img.IsFeatured,
		); err != nil {
			return ProductDetail{}, err
		}
		p.Images = append(p.Images, img)
	}
	if err := imageRows.Err(); err != nil {
		return ProductDetail{}, err
	}

	return p, nil
}
