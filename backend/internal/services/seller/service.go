package seller

import (
	"context"
	"errors"
	"strings"

	"ecom-store/backend/internal/services/auth"
)

var (
	ErrForbiddenSeller     = errors.New("seller admin access required")
	ErrInvalidProductInput = errors.New("invalid product input")
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) EnsureSellerAdmin(ctx context.Context, userID string) error {
	ok, err := s.repo.IsSellerAdmin(ctx, userID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrForbiddenSeller
	}
	return nil
}

func (s *Service) CreateProduct(ctx context.Context, seller auth.User, req ProductCreateRequest) (string, error) {
	normalizeProductInput(&req)
	if err := validateProductInput(req); err != nil {
		return "", err
	}
	return s.repo.CreateProduct(ctx, seller.ID, req)
}

func (s *Service) ListProducts(ctx context.Context) ([]ProductListItem, error) {
	return s.repo.ListProducts(ctx)
}

func (s *Service) GetProductByID(ctx context.Context, productID string) (ProductDetails, error) {
	return s.repo.GetProductByID(ctx, productID)
}

func (s *Service) UpdateProduct(ctx context.Context, productID string, req ProductUpdateRequest) error {
	normalizeProductInput((*ProductCreateRequest)(&req))
	if err := validateProductInput(ProductCreateRequest(req)); err != nil {
		return err
	}
	return s.repo.UpdateProduct(ctx, productID, req)
}

func (s *Service) DeleteProduct(ctx context.Context, productID string) error {
	return s.repo.DeleteProduct(ctx, productID)
}

func (s *Service) ListColors(ctx context.Context) ([]ColorOption, error) {
	return s.repo.ListColors(ctx)
}

func normalizeProductInput(req *ProductCreateRequest) {
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.Brand = strings.TrimSpace(req.Brand)
	req.TargetAudience = strings.TrimSpace(strings.ToLower(req.TargetAudience))
	req.Status = strings.TrimSpace(strings.ToLower(req.Status))

	for i := range req.Variants {
		req.Variants[i].SKU = strings.TrimSpace(req.Variants[i].SKU)
		req.Variants[i].Size = strings.TrimSpace(strings.ToUpper(req.Variants[i].Size))
	}
	for i := range req.Images {
		req.Images[i].ImageURL = strings.TrimSpace(req.Images[i].ImageURL)
		req.Images[i].AltText = strings.TrimSpace(req.Images[i].AltText)
	}
}

func validateProductInput(req ProductCreateRequest) error {
	if req.Title == "" || req.TargetAudience == "" {
		return ErrInvalidProductInput
	}
	if req.Status == "" {
		req.Status = "draft"
	}
	if req.TargetAudience != "men" && req.TargetAudience != "women" && req.TargetAudience != "kids" && req.TargetAudience != "unisex" {
		return ErrInvalidProductInput
	}
	if req.Status != "draft" && req.Status != "active" && req.Status != "archived" {
		return ErrInvalidProductInput
	}
	if len(req.Colors) == 0 {
		return ErrInvalidProductInput
	}
	if len(req.Variants) == 0 {
		return ErrInvalidProductInput
	}
	return nil
}
