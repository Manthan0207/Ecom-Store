package seller

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	IsSellerAdmin(ctx context.Context, userID string) (bool, error)
	CreateProduct(ctx context.Context, sellerID string, req ProductCreateRequest) (string, error)
	ListProducts(ctx context.Context) ([]ProductListItem, error)
	GetProductByID(ctx context.Context, productID string) (ProductDetails, error)
	UpdateProduct(ctx context.Context, productID string, req ProductUpdateRequest) error
	DeleteProduct(ctx context.Context, productID string) error
	ListColors(ctx context.Context) ([]ColorOption, error)
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) IsSellerAdmin(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM seller_admins WHERE user_id = $1::uuid)`, userID).Scan(&exists)
	return exists, err
}

func (r *PostgresRepository) CreateProduct(ctx context.Context, sellerID string, req ProductCreateRequest) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	productID, colorMap, err := insertProductGraph(ctx, tx, sellerID, req)
	if err != nil {
		return "", err
	}
	if err := insertVariants(ctx, tx, productID, req.Variants, colorMap); err != nil {
		return "", err
	}
	if err := insertImages(ctx, tx, productID, req.Images, colorMap); err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return productID, nil
}

func (r *PostgresRepository) ListProducts(ctx context.Context) ([]ProductListItem, error) {
	rows, err := r.db.Query(ctx, `
SELECT id::text, title, COALESCE(brand, ''), status, target_audience,
       category_id::text, created_at, updated_at
FROM products
ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ProductListItem, 0)
	for rows.Next() {
		var item ProductListItem
		var categoryID *string
		if err := rows.Scan(&item.ID, &item.Title, &item.Brand, &item.Status, &item.TargetAudience, &categoryID, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.CategoryID = categoryID
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) GetProductByID(ctx context.Context, productID string) (ProductDetails, error) {
	var p ProductDetails
	var categoryID *string
	err := r.db.QueryRow(ctx, `
SELECT id::text, title, COALESCE(description,''), COALESCE(brand,''), status,
       target_audience, category_id::text, created_at, updated_at
FROM products
WHERE id = $1::uuid`, productID).Scan(&p.ID, &p.Title, &p.Description, &p.Brand, &p.Status, &p.TargetAudience, &categoryID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ProductDetails{}, pgx.ErrNoRows
		}
		return ProductDetails{}, err
	}
	p.CategoryID = categoryID

	colorRows, err := r.db.Query(ctx, `
SELECT pc.color_id::text, c.name, c.hex_code, pc.sort_order
FROM product_colors pc
JOIN colors c ON c.id = pc.color_id
WHERE pc.product_id = $1::uuid
ORDER BY pc.sort_order ASC, c.name ASC`, productID)
	if err != nil {
		return ProductDetails{}, err
	}
	defer colorRows.Close()
	for colorRows.Next() {
		var c ProductColorDetails
		if err := colorRows.Scan(&c.ColorID, &c.ColorName, &c.HexCode, &c.SortOrder); err != nil {
			return ProductDetails{}, err
		}
		p.Colors = append(p.Colors, c)
	}
	if err := colorRows.Err(); err != nil {
		return ProductDetails{}, err
	}

	variantRows, err := r.db.Query(ctx, `
SELECT v.id::text, pc.color_id::text, v.sku, v.size, v.price, v.compare_at_price, v.stock_qty, v.is_active
FROM product_variants v
JOIN product_colors pc ON pc.id = v.product_color_id
WHERE v.product_id = $1::uuid
ORDER BY v.created_at ASC`, productID)
	if err != nil {
		return ProductDetails{}, err
	}
	defer variantRows.Close()
	for variantRows.Next() {
		var v ProductVariantDetail
		if err := variantRows.Scan(&v.ID, &v.ColorID, &v.SKU, &v.Size, &v.Price, &v.CompareAtPrice, &v.StockQty, &v.IsActive); err != nil {
			return ProductDetails{}, err
		}
		p.Variants = append(p.Variants, v)
	}
	if err := variantRows.Err(); err != nil {
		return ProductDetails{}, err
	}

	imageRows, err := r.db.Query(ctx, `
SELECT i.id::text, pc.color_id::text, i.image_url, COALESCE(i.alt_text,''), i.sort_order, i.is_featured
FROM product_images i
LEFT JOIN product_colors pc ON pc.id = i.product_color_id
WHERE i.product_id = $1::uuid
ORDER BY i.sort_order ASC, i.created_at ASC`, productID)
	if err != nil {
		return ProductDetails{}, err
	}
	defer imageRows.Close()
	for imageRows.Next() {
		var img ProductImageDetail
		if err := imageRows.Scan(&img.ID, &img.ColorID, &img.ImageURL, &img.AltText, &img.SortOrder, &img.IsFeatured); err != nil {
			return ProductDetails{}, err
		}
		p.Images = append(p.Images, img)
	}
	if err := imageRows.Err(); err != nil {
		return ProductDetails{}, err
	}

	return p, nil
}

func (r *PostgresRepository) UpdateProduct(ctx context.Context, productID string, req ProductUpdateRequest) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
UPDATE products
SET title = $1,
    description = $2,
    brand = $3,
    category_id = NULLIF($4,'')::uuid,
    target_audience = $5,
    status = $6,
    updated_at = NOW()
WHERE id = $7::uuid`, req.Title, req.Description, req.Brand, req.CategoryID, req.TargetAudience, req.Status, productID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `DELETE FROM product_images WHERE product_id = $1::uuid`, productID)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM product_variants WHERE product_id = $1::uuid`, productID)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM product_colors WHERE product_id = $1::uuid`, productID)
	if err != nil {
		return err
	}

	colorMap, err := insertProductColors(ctx, tx, productID, req.Colors)
	if err != nil {
		return err
	}
	if err := insertVariants(ctx, tx, productID, req.Variants, colorMap); err != nil {
		return err
	}
	if err := insertImages(ctx, tx, productID, req.Images, colorMap); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) DeleteProduct(ctx context.Context, productID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM products WHERE id = $1::uuid`, productID)
	return err
}

func (r *PostgresRepository) ListColors(ctx context.Context) ([]ColorOption, error) {
	rows, err := r.db.Query(ctx, `SELECT id::text, name, hex_code FROM colors WHERE is_active = TRUE ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	colors := make([]ColorOption, 0)
	for rows.Next() {
		var c ColorOption
		if err := rows.Scan(&c.ID, &c.Name, &c.HexCode); err != nil {
			return nil, err
		}
		colors = append(colors, c)
	}
	return colors, rows.Err()
}

func insertProductGraph(ctx context.Context, tx pgx.Tx, sellerID string, req ProductCreateRequest) (string, map[string]string, error) {
	var productID string
	err := tx.QueryRow(ctx, `
INSERT INTO products(created_by, title, description, brand, category_id, target_audience, status)
VALUES($1::uuid, $2, $3, $4, NULLIF($5,'')::uuid, $6, $7)
RETURNING id::text`, sellerID, req.Title, req.Description, req.Brand, req.CategoryID, req.TargetAudience, req.Status).Scan(&productID)
	if err != nil {
		return "", nil, err
	}

	colorMap, err := insertProductColors(ctx, tx, productID, req.Colors)
	if err != nil {
		return "", nil, err
	}

	return productID, colorMap, nil
}

func insertProductColors(ctx context.Context, tx pgx.Tx, productID string, colors []ProductColorInput) (map[string]string, error) {
	mapByColorID := make(map[string]string, len(colors))
	for _, c := range colors {
		var productColorID string
		err := tx.QueryRow(ctx, `
INSERT INTO product_colors(product_id, color_id, sort_order)
VALUES($1::uuid, $2::uuid, $3)
RETURNING id::text`, productID, c.ColorID, c.SortOrder).Scan(&productColorID)
		if err != nil {
			return nil, err
		}
		mapByColorID[c.ColorID] = productColorID
	}
	return mapByColorID, nil
}

func insertVariants(ctx context.Context, tx pgx.Tx, productID string, variants []ProductVariantInput, colorMap map[string]string) error {
	for _, v := range variants {
		productColorID, ok := colorMap[v.ColorID]
		if !ok {
			return fmt.Errorf("variant references unknown color_id=%s", v.ColorID)
		}
		_, err := tx.Exec(ctx, `
INSERT INTO product_variants(product_id, product_color_id, sku, size, price, compare_at_price, stock_qty, is_active)
VALUES($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8)`, productID, productColorID, v.SKU, v.Size, v.Price, v.CompareAtPrice, v.StockQty, v.IsActive)
		if err != nil {
			return err
		}
	}
	return nil
}

func insertImages(ctx context.Context, tx pgx.Tx, productID string, images []ProductImageInput, colorMap map[string]string) error {
	for _, img := range images {
		var productColorID *string
		if img.ColorID != nil && *img.ColorID != "" {
			mapped, ok := colorMap[*img.ColorID]
			if !ok {
				return fmt.Errorf("image references unknown color_id=%s", *img.ColorID)
			}
			productColorID = &mapped
		}
		_, err := tx.Exec(ctx, `
INSERT INTO product_images(product_id, product_color_id, image_url, alt_text, sort_order, is_featured)
VALUES($1::uuid, $2::uuid, $3, $4, $5, $6)`, productID, productColorID, img.ImageURL, img.AltText, img.SortOrder, img.IsFeatured)
		if err != nil {
			return err
		}
	}
	return nil
}
