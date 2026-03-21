package catalog

import "context"

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListActiveProducts(ctx context.Context) ([]ListItem, error) {
	return s.repo.ListActiveProducts(ctx)
}

func (s *Service) GetActiveProductByID(ctx context.Context, productID string) (ProductDetail, error) {
	return s.repo.GetActiveProductByID(ctx, productID)
}
