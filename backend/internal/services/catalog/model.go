package catalog

import "time"

type ListItem struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Brand          string    `json:"brand"`
	Category       string    `json:"category"`
	TargetAudience string    `json:"target_audience"`
	PriceMin       float64   `json:"price_min"`
	PriceMax       float64   `json:"price_max"`
	ImageURL       string    `json:"image_url"`
	CreatedAt      time.Time `json:"created_at"`
}

type ColorDetail struct {
	ColorID   string `json:"color_id"`
	ColorName string `json:"color_name"`
	HexCode   string `json:"hex_code"`
	SortOrder int    `json:"sort_order"`
}

type VariantDetail struct {
	ID             string   `json:"id"`
	ColorID        string   `json:"color_id"`
	SKU            string   `json:"sku"`
	Size           string   `json:"size"`
	Price          float64  `json:"price"`
	CompareAtPrice *float64 `json:"compare_at_price"`
	StockQty       int      `json:"stock_qty"`
	IsActive       bool     `json:"is_active"`
}

type ImageDetail struct {
	ID         string  `json:"id"`
	ColorID    *string `json:"color_id"`
	ImageURL   string  `json:"image_url"`
	AltText    string  `json:"alt_text"`
	SortOrder  int     `json:"sort_order"`
	IsFeatured bool    `json:"is_featured"`
}

type ProductDetail struct {
	ID             string         `json:"id"`
	Title          string         `json:"title"`
	Description    string         `json:"description"`
	Brand          string         `json:"brand"`
	Category       string         `json:"category"`
	TargetAudience string         `json:"target_audience"`
	PriceMin       float64        `json:"price_min"`
	PriceMax       float64        `json:"price_max"`
	Colors         []ColorDetail  `json:"colors"`
	Variants       []VariantDetail`json:"variants"`
	Images         []ImageDetail  `json:"images"`
}
