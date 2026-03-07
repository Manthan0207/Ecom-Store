package seller

import "time"

type ProductCreateRequest struct {
	Title          string                `json:"title"`
	Description    string                `json:"description"`
	Brand          string                `json:"brand"`
	CategoryID     string                `json:"category_id"`
	TargetAudience string                `json:"target_audience"`
	Status         string                `json:"status"`
	Colors         []ProductColorInput   `json:"colors"`
	Variants       []ProductVariantInput `json:"variants"`
	Images         []ProductImageInput   `json:"images"`
}

type ProductUpdateRequest = ProductCreateRequest

type ProductColorInput struct {
	ColorID   string `json:"color_id"`
	SortOrder int    `json:"sort_order"`
}

type ProductVariantInput struct {
	ColorID        string   `json:"color_id"`
	SKU            string   `json:"sku"`
	Size           string   `json:"size"`
	Price          float64  `json:"price"`
	CompareAtPrice *float64 `json:"compare_at_price"`
	StockQty       int      `json:"stock_qty"`
	IsActive       bool     `json:"is_active"`
}

type ProductImageInput struct {
	ColorID    *string `json:"color_id"`
	ImageURL   string  `json:"image_url"`
	AltText    string  `json:"alt_text"`
	SortOrder  int     `json:"sort_order"`
	IsFeatured bool    `json:"is_featured"`
}

type ProductListItem struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Brand          string    `json:"brand"`
	Status         string    `json:"status"`
	TargetAudience string    `json:"target_audience"`
	CategoryID     *string   `json:"category_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ProductDetails struct {
	ID             string                 `json:"id"`
	Title          string                 `json:"title"`
	Description    string                 `json:"description"`
	Brand          string                 `json:"brand"`
	Status         string                 `json:"status"`
	TargetAudience string                 `json:"target_audience"`
	CategoryID     *string                `json:"category_id"`
	Colors         []ProductColorDetails  `json:"colors"`
	Variants       []ProductVariantDetail `json:"variants"`
	Images         []ProductImageDetail   `json:"images"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

type ProductColorDetails struct {
	ColorID   string `json:"color_id"`
	ColorName string `json:"color_name"`
	HexCode   string `json:"hex_code"`
	SortOrder int    `json:"sort_order"`
}

type ProductVariantDetail struct {
	ID             string   `json:"id"`
	ColorID        string   `json:"color_id"`
	SKU            string   `json:"sku"`
	Size           string   `json:"size"`
	Price          float64  `json:"price"`
	CompareAtPrice *float64 `json:"compare_at_price"`
	StockQty       int      `json:"stock_qty"`
	IsActive       bool     `json:"is_active"`
}

type ProductImageDetail struct {
	ID         string  `json:"id"`
	ColorID    *string `json:"color_id"`
	ImageURL   string  `json:"image_url"`
	AltText    string  `json:"alt_text"`
	SortOrder  int     `json:"sort_order"`
	IsFeatured bool    `json:"is_featured"`
}

type ColorOption struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	HexCode string `json:"hex_code"`
}
