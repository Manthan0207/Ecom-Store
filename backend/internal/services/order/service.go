package order

import (
	"context"
	"errors"
	"strings"

	"ecom-store/backend/internal/services/auth"
)

var (
	ErrInvalidOrderInput        = errors.New("invalid order input")
	ErrInvalidIdempotencyKey    = errors.New("invalid idempotency key")
	ErrVariantNotFound          = errors.New("variant not found")
	ErrVariantInactive          = errors.New("variant inactive")
	ErrInsufficientStock        = errors.New("insufficient stock")
	ErrOrderNotFound            = errors.New("order not found")
	ErrForbiddenOrder           = errors.New("forbidden order")
	ErrForbiddenSeller          = errors.New("seller admin access required")
	ErrInvalidOrderTransition   = errors.New("invalid order status transition")
	ErrInvalidPaymentTransition = errors.New("invalid payment status transition")
	ErrCannotCancelOrder        = errors.New("order cannot be cancelled")
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateOrder(ctx context.Context, buyer auth.User, idempotencyKey string, req CreateOrderRequest) (Order, bool, error) {
	normalizeCreateOrderInput(&req)
	if err := validateCreateOrderInput(req); err != nil {
		return Order{}, false, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" || len(idempotencyKey) > 120 {
		return Order{}, false, ErrInvalidIdempotencyKey
	}

	order, created, err := s.repo.CreateOrder(ctx, buyer.ID, idempotencyKey, req)
	if err != nil {
		return Order{}, false, err
	}
	return order, created, nil
}

func (s *Service) ListMyOrders(ctx context.Context, buyer auth.User) ([]Order, error) {
	return s.repo.ListOrdersByUser(ctx, buyer.ID)
}

func (s *Service) GetMyOrderByID(ctx context.Context, buyer auth.User, orderID string) (Order, error) {
	orderID = strings.TrimSpace(orderID)
	if orderID == "" {
		return Order{}, ErrOrderNotFound
	}
	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		return Order{}, err
	}
	if order.UserID != buyer.ID {
		return Order{}, ErrForbiddenOrder
	}
	return order, nil
}

func (s *Service) CancelMyOrder(ctx context.Context, buyer auth.User, orderID, note string) error {
	orderID = strings.TrimSpace(orderID)
	note = strings.TrimSpace(note)
	order, err := s.GetMyOrderByID(ctx, buyer, orderID)
	if err != nil {
		return err
	}
	if order.Status != "pending" && order.Status != "confirmed" {
		return ErrCannotCancelOrder
	}
	return s.repo.UpdateOrderStatus(ctx, orderID, order.Status, "cancelled", buyer.ID, "buyer", note)
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

func (s *Service) ListOrdersForSeller(ctx context.Context) ([]Order, error) {
	return s.repo.ListOrders(ctx)
}

func (s *Service) GetOrderForSeller(ctx context.Context, orderID string) (Order, error) {
	orderID = strings.TrimSpace(orderID)
	if orderID == "" {
		return Order{}, ErrOrderNotFound
	}
	return s.repo.GetOrderByID(ctx, orderID)
}

func (s *Service) UpdateOrderStatusBySeller(ctx context.Context, sellerUserID, orderID, nextStatus, note string) error {
	order, err := s.GetOrderForSeller(ctx, orderID)
	if err != nil {
		return err
	}
	nextStatus = strings.TrimSpace(strings.ToLower(nextStatus))
	note = strings.TrimSpace(note)
	if !canTransitionOrderStatus(order.Status, nextStatus) {
		return ErrInvalidOrderTransition
	}
	return s.repo.UpdateOrderStatus(ctx, order.ID, order.Status, nextStatus, sellerUserID, "seller", note)
}

func (s *Service) UpdatePaymentStatusBySeller(ctx context.Context, sellerUserID, orderID, nextStatus, note string) error {
	order, err := s.GetOrderForSeller(ctx, orderID)
	if err != nil {
		return err
	}
	nextStatus = strings.TrimSpace(strings.ToLower(nextStatus))
	note = strings.TrimSpace(note)
	if !canTransitionPaymentStatus(order.PaymentStatus, nextStatus) {
		return ErrInvalidPaymentTransition
	}
	return s.repo.UpdatePaymentStatus(ctx, order.ID, order.PaymentStatus, nextStatus, sellerUserID, "seller", note)
}

func normalizeCreateOrderInput(req *CreateOrderRequest) {
	req.PaymentMethod = strings.TrimSpace(strings.ToLower(req.PaymentMethod))
	if req.PaymentMethod == "" {
		req.PaymentMethod = "cod"
	}
	req.Notes = strings.TrimSpace(req.Notes)

	req.ShippingAddress.FullName = strings.TrimSpace(req.ShippingAddress.FullName)
	req.ShippingAddress.Phone = strings.TrimSpace(req.ShippingAddress.Phone)
	req.ShippingAddress.Line1 = strings.TrimSpace(req.ShippingAddress.Line1)
	req.ShippingAddress.Line2 = strings.TrimSpace(req.ShippingAddress.Line2)
	req.ShippingAddress.City = strings.TrimSpace(req.ShippingAddress.City)
	req.ShippingAddress.State = strings.TrimSpace(req.ShippingAddress.State)
	req.ShippingAddress.PostalCode = strings.TrimSpace(req.ShippingAddress.PostalCode)
	req.ShippingAddress.CountryCode = strings.TrimSpace(strings.ToUpper(req.ShippingAddress.CountryCode))

	if req.BillingAddress != nil {
		req.BillingAddress.FullName = strings.TrimSpace(req.BillingAddress.FullName)
		req.BillingAddress.Phone = strings.TrimSpace(req.BillingAddress.Phone)
		req.BillingAddress.Line1 = strings.TrimSpace(req.BillingAddress.Line1)
		req.BillingAddress.Line2 = strings.TrimSpace(req.BillingAddress.Line2)
		req.BillingAddress.City = strings.TrimSpace(req.BillingAddress.City)
		req.BillingAddress.State = strings.TrimSpace(req.BillingAddress.State)
		req.BillingAddress.PostalCode = strings.TrimSpace(req.BillingAddress.PostalCode)
		req.BillingAddress.CountryCode = strings.TrimSpace(strings.ToUpper(req.BillingAddress.CountryCode))
	}

	for i := range req.Items {
		req.Items[i].VariantID = strings.TrimSpace(req.Items[i].VariantID)
	}
}

func validateCreateOrderInput(req CreateOrderRequest) error {
	if len(req.Items) == 0 {
		return ErrInvalidOrderInput
	}
	if req.ShippingAddress.FullName == "" || req.ShippingAddress.Phone == "" || req.ShippingAddress.Line1 == "" || req.ShippingAddress.City == "" || req.ShippingAddress.State == "" || req.ShippingAddress.PostalCode == "" || req.ShippingAddress.CountryCode == "" {
		return ErrInvalidOrderInput
	}

	if req.PaymentMethod != "cod" && req.PaymentMethod != "card" && req.PaymentMethod != "upi" {
		return ErrInvalidOrderInput
	}

	seen := make(map[string]struct{}, len(req.Items))
	for _, item := range req.Items {
		if item.VariantID == "" || item.Quantity <= 0 || item.Quantity > 100 {
			return ErrInvalidOrderInput
		}
		if _, exists := seen[item.VariantID]; exists {
			return ErrInvalidOrderInput
		}
		seen[item.VariantID] = struct{}{}
	}
	return nil
}

func canTransitionOrderStatus(from, to string) bool {
	allowed := map[string]map[string]bool{
		"pending":   {"confirmed": true, "cancelled": true},
		"confirmed": {"packed": true, "cancelled": true},
		"packed":    {"shipped": true},
		"shipped":   {"delivered": true},
		"delivered": {},
		"cancelled": {},
	}
	next, ok := allowed[from]
	if !ok {
		return false
	}
	return next[to]
}

func canTransitionPaymentStatus(from, to string) bool {
	allowed := map[string]map[string]bool{
		"pending":  {"paid": true, "failed": true},
		"paid":     {"refunded": true},
		"failed":   {"pending": true},
		"refunded": {},
	}
	next, ok := allowed[from]
	if !ok {
		return false
	}
	return next[to]
}
