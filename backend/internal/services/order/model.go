package order

import "time"

type Address struct {
	FullName    string `json:"full_name"`
	Phone       string `json:"phone"`
	Line1       string `json:"line1"`
	Line2       string `json:"line2"`
	City        string `json:"city"`
	State       string `json:"state"`
	PostalCode  string `json:"postal_code"`
	CountryCode string `json:"country_code"`
}

type CreateOrderItemInput struct {
	VariantID string `json:"variant_id"`
	Quantity  int    `json:"quantity"`
}

type CreateOrderRequest struct {
	Items           []CreateOrderItemInput `json:"items"`
	ShippingAddress Address                `json:"shipping_address"`
	BillingAddress  *Address               `json:"billing_address"`
	PaymentMethod   string                 `json:"payment_method"`
	Notes           string                 `json:"notes"`
}

type OrderItem struct {
	ID             string `json:"id"`
	ProductID      string `json:"product_id"`
	VariantID      string `json:"variant_id"`
	ProductTitle   string `json:"product_title"`
	SKU            string `json:"sku"`
	ColorName      string `json:"color_name"`
	Size           string `json:"size"`
	UnitPriceMinor int64  `json:"unit_price_minor"`
	Quantity       int    `json:"quantity"`
	LineTotalMinor int64  `json:"line_total_minor"`
}

type Order struct {
	ID              string      `json:"id"`
	OrderNumber     string      `json:"order_number"`
	UserID          string      `json:"user_id"`
	Status          string      `json:"status"`
	PaymentStatus   string      `json:"payment_status"`
	PaymentMethod   string      `json:"payment_method"`
	Currency        string      `json:"currency"`
	SubtotalMinor   int64       `json:"subtotal_minor"`
	DiscountMinor   int64       `json:"discount_minor"`
	ShippingMinor   int64       `json:"shipping_minor"`
	TaxMinor        int64       `json:"tax_minor"`
	TotalMinor      int64       `json:"total_minor"`
	ShippingAddress Address     `json:"shipping_address"`
	BillingAddress  *Address    `json:"billing_address"`
	Notes           string      `json:"notes"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	Items           []OrderItem `json:"items"`
}

type ListOrdersResponse struct {
	Items []Order `json:"items"`
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status"`
	Note   string `json:"note"`
}

type UpdatePaymentStatusRequest struct {
	PaymentStatus string `json:"payment_status"`
	Note          string `json:"note"`
}
