package order

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	IsSellerAdmin(ctx context.Context, userID string) (bool, error)
	CreateOrder(ctx context.Context, userID, idempotencyKey string, req CreateOrderRequest) (Order, bool, error)
	ListOrdersByUser(ctx context.Context, userID string) ([]Order, error)
	ListOrders(ctx context.Context) ([]Order, error)
	GetOrderByID(ctx context.Context, orderID string) (Order, error)
	UpdateOrderStatus(ctx context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error
	UpdatePaymentStatus(ctx context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

type lockedVariant struct {
	VariantID       string
	ProductID       string
	ProductTitle    string
	SKU             string
	Size            string
	ColorName       string
	StockQty        int
	UnitPriceMinor  int64
	ProductStatus   string
	IsVariantActive bool
}

func (r *PostgresRepository) IsSellerAdmin(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM seller_admins WHERE user_id = $1::uuid)`, userID).Scan(&exists)
	return exists, err
}

func (r *PostgresRepository) CreateOrder(ctx context.Context, userID, idempotencyKey string, req CreateOrderRequest) (Order, bool, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Order{}, false, err
	}
	defer tx.Rollback(ctx)

	lockKey := fmt.Sprintf("%s:%s", userID, idempotencyKey)
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey); err != nil {
		return Order{}, false, err
	}

	var existingOrderID string
	err = tx.QueryRow(ctx, `
SELECT id::text
FROM orders
WHERE user_id = $1::uuid AND idempotency_key = $2
LIMIT 1`, userID, idempotencyKey).Scan(&existingOrderID)
	if err == nil {
		order, getErr := r.getOrderByIDTx(ctx, tx, existingOrderID)
		if getErr != nil {
			return Order{}, false, getErr
		}
		if commitErr := tx.Commit(ctx); commitErr != nil {
			return Order{}, false, commitErr
		}
		return order, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Order{}, false, err
	}

	locked, err := lockAndLoadVariants(ctx, tx, req.Items)
	if err != nil {
		return Order{}, false, err
	}

	subtotalMinor := int64(0)
	for _, item := range req.Items {
		v := locked[item.VariantID]
		if item.Quantity > v.StockQty {
			return Order{}, false, ErrInsufficientStock
		}
		subtotalMinor += int64(item.Quantity) * v.UnitPriceMinor
	}

	shippingAddrJSON, err := json.Marshal(req.ShippingAddress)
	if err != nil {
		return Order{}, false, err
	}
	var billingAddrJSON []byte
	if req.BillingAddress != nil {
		billingAddrJSON, err = json.Marshal(req.BillingAddress)
		if err != nil {
			return Order{}, false, err
		}
	}

	totalMinor := subtotalMinor
	status := "pending"
	paymentStatus := "pending"

	var orderID string
	err = tx.QueryRow(ctx, `
INSERT INTO orders(
  user_id, status, payment_status, payment_method, currency,
  subtotal_minor, discount_minor, shipping_minor, tax_minor, total_minor,
  shipping_address_json, billing_address_json, notes, idempotency_key
)
VALUES ($1::uuid, $2, $3, $4, 'INR', $5, 0, 0, 0, $6, $7::jsonb, NULLIF($8::text,'')::jsonb, $9, $10)
RETURNING id::text`,
		userID,
		status,
		paymentStatus,
		req.PaymentMethod,
		subtotalMinor,
		totalMinor,
		string(shippingAddrJSON),
		string(billingAddrJSON),
		req.Notes,
		idempotencyKey,
	).Scan(&orderID)
	if err != nil {
		return Order{}, false, err
	}

	for _, item := range req.Items {
		v := locked[item.VariantID]
		lineTotal := int64(item.Quantity) * v.UnitPriceMinor
		_, err := tx.Exec(ctx, `
INSERT INTO order_items(
  order_id, product_id, variant_id, product_title, sku, color_name, size,
  unit_price_minor, quantity, line_total_minor
)
VALUES($1::uuid, $2::uuid, $3::uuid, $4, $5, NULLIF($6,''), NULLIF($7,''), $8, $9, $10)`,
			orderID,
			v.ProductID,
			v.VariantID,
			v.ProductTitle,
			v.SKU,
			v.ColorName,
			v.Size,
			v.UnitPriceMinor,
			item.Quantity,
			lineTotal,
		)
		if err != nil {
			return Order{}, false, err
		}

		_, err = tx.Exec(ctx, `
UPDATE product_variants
SET stock_qty = stock_qty - $1,
    updated_at = NOW()
WHERE id = $2::uuid`, item.Quantity, v.VariantID)
		if err != nil {
			return Order{}, false, err
		}
	}

	_, err = tx.Exec(ctx, `
INSERT INTO order_status_history(order_id, from_status, to_status, changed_by_user_id, actor_type, note)
VALUES($1::uuid, NULL, $2, $3::uuid, 'buyer', 'order placed')`, orderID, status, userID)
	if err != nil {
		return Order{}, false, err
	}

	order, err := r.getOrderByIDTx(ctx, tx, orderID)
	if err != nil {
		return Order{}, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Order{}, false, err
	}

	return order, true, nil
}

func lockAndLoadVariants(ctx context.Context, tx pgx.Tx, items []CreateOrderItemInput) (map[string]lockedVariant, error) {
	variantIDs := make([]string, 0, len(items))
	for _, item := range items {
		variantIDs = append(variantIDs, item.VariantID)
	}
	sort.Strings(variantIDs)

	result := make(map[string]lockedVariant, len(items))
	for _, variantID := range variantIDs {
		var v lockedVariant
		err := tx.QueryRow(ctx, `
SELECT v.id::text,
       v.product_id::text,
       p.title,
       v.sku,
       v.size,
       COALESCE(c.name, ''),
       v.stock_qty,
       ROUND(v.price * 100)::bigint,
       p.status,
       v.is_active
FROM product_variants v
JOIN products p ON p.id = v.product_id
LEFT JOIN product_colors pc ON pc.id = v.product_color_id
LEFT JOIN colors c ON c.id = pc.color_id
WHERE v.id = $1::uuid
FOR UPDATE OF v`, variantID).Scan(
			&v.VariantID,
			&v.ProductID,
			&v.ProductTitle,
			&v.SKU,
			&v.Size,
			&v.ColorName,
			&v.StockQty,
			&v.UnitPriceMinor,
			&v.ProductStatus,
			&v.IsVariantActive,
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrVariantNotFound
			}
			return nil, err
		}
		if v.ProductStatus != "active" || !v.IsVariantActive {
			return nil, ErrVariantInactive
		}
		result[v.VariantID] = v
	}
	return result, nil
}

func (r *PostgresRepository) ListOrdersByUser(ctx context.Context, userID string) ([]Order, error) {
	rows, err := r.db.Query(ctx, `
SELECT id::text
FROM orders
WHERE user_id = $1::uuid
ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]Order, 0)
	for rows.Next() {
		var orderID string
		if err := rows.Scan(&orderID); err != nil {
			return nil, err
		}
		order, err := r.GetOrderByID(ctx, orderID)
		if err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}
	return orders, rows.Err()
}

func (r *PostgresRepository) ListOrders(ctx context.Context) ([]Order, error) {
	rows, err := r.db.Query(ctx, `SELECT id::text FROM orders ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]Order, 0)
	for rows.Next() {
		var orderID string
		if err := rows.Scan(&orderID); err != nil {
			return nil, err
		}
		order, err := r.GetOrderByID(ctx, orderID)
		if err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}
	return orders, rows.Err()
}

func (r *PostgresRepository) GetOrderByID(ctx context.Context, orderID string) (Order, error) {
	return r.getOrderByIDTx(ctx, r.db, orderID)
}

func (r *PostgresRepository) getOrderByIDTx(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
	Query(context.Context, string, ...any) (pgx.Rows, error)
}, orderID string) (Order, error) {
	var o Order
	var shippingAddrRaw []byte
	var billingAddrRaw *string
	err := q.QueryRow(ctx, `
SELECT id::text,
       order_number,
       user_id::text,
       status,
       payment_status,
       COALESCE(payment_method, ''),
       currency,
       subtotal_minor,
       discount_minor,
       shipping_minor,
       tax_minor,
       total_minor,
       shipping_address_json,
       billing_address_json::text,
       COALESCE(notes, ''),
       created_at,
       updated_at
FROM orders
WHERE id = $1::uuid`, orderID).Scan(
		&o.ID,
		&o.OrderNumber,
		&o.UserID,
		&o.Status,
		&o.PaymentStatus,
		&o.PaymentMethod,
		&o.Currency,
		&o.SubtotalMinor,
		&o.DiscountMinor,
		&o.ShippingMinor,
		&o.TaxMinor,
		&o.TotalMinor,
		&shippingAddrRaw,
		&billingAddrRaw,
		&o.Notes,
		&o.CreatedAt,
		&o.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Order{}, ErrOrderNotFound
		}
		return Order{}, err
	}

	if len(shippingAddrRaw) > 0 {
		if err := json.Unmarshal(shippingAddrRaw, &o.ShippingAddress); err != nil {
			return Order{}, err
		}
	}
	if billingAddrRaw != nil && strings.TrimSpace(*billingAddrRaw) != "" {
		var billing Address
		if err := json.Unmarshal([]byte(*billingAddrRaw), &billing); err != nil {
			return Order{}, err
		}
		o.BillingAddress = &billing
	}

	itemRows, err := q.Query(ctx, `
SELECT id::text,
       COALESCE(product_id::text, ''),
       COALESCE(variant_id::text, ''),
       product_title,
       sku,
       COALESCE(color_name, ''),
       COALESCE(size, ''),
       unit_price_minor,
       quantity,
       line_total_minor
FROM order_items
WHERE order_id = $1::uuid
ORDER BY created_at ASC`, orderID)
	if err != nil {
		return Order{}, err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var item OrderItem
		if err := itemRows.Scan(
			&item.ID,
			&item.ProductID,
			&item.VariantID,
			&item.ProductTitle,
			&item.SKU,
			&item.ColorName,
			&item.Size,
			&item.UnitPriceMinor,
			&item.Quantity,
			&item.LineTotalMinor,
		); err != nil {
			return Order{}, err
		}
		o.Items = append(o.Items, item)
	}
	if err := itemRows.Err(); err != nil {
		return Order{}, err
	}

	return o, nil
}

func (r *PostgresRepository) UpdateOrderStatus(ctx context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	cmd, err := tx.Exec(ctx, `
UPDATE orders
SET status = $1,
    updated_at = NOW()
WHERE id = $2::uuid AND status = $3`, toStatus, orderID, fromStatus)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrInvalidOrderTransition
	}

	if toStatus == "cancelled" && fromStatus != "cancelled" {
		rows, err := tx.Query(ctx, `
SELECT variant_id::text, quantity
FROM order_items
WHERE order_id = $1::uuid AND variant_id IS NOT NULL`, orderID)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var variantID string
			var qty int
			if err := rows.Scan(&variantID, &qty); err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `
UPDATE product_variants
SET stock_qty = stock_qty + $1,
    updated_at = NOW()
WHERE id = $2::uuid`, qty, variantID)
			if err != nil {
				return err
			}
		}
		if err := rows.Err(); err != nil {
			return err
		}
	}

	_, err = tx.Exec(ctx, `
INSERT INTO order_status_history(order_id, from_status, to_status, changed_by_user_id, actor_type, note)
VALUES($1::uuid, $2, $3, $4::uuid, $5, NULLIF($6,''))`, orderID, fromStatus, toStatus, actorUserID, actorType, note)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) UpdatePaymentStatus(ctx context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	cmd, err := tx.Exec(ctx, `
UPDATE orders
SET payment_status = $1,
    updated_at = NOW()
WHERE id = $2::uuid AND payment_status = $3`, toStatus, orderID, fromStatus)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrInvalidPaymentTransition
	}

	_, err = tx.Exec(ctx, `
INSERT INTO order_status_history(order_id, from_status, to_status, changed_by_user_id, actor_type, note)
VALUES($1::uuid, $2, $3, $4::uuid, $5, NULLIF($6,''))`, orderID, "payment:"+fromStatus, "payment:"+toStatus, actorUserID, actorType, note)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
