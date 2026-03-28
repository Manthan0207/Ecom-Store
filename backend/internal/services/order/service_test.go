package order

import (
	"context"
	"errors"
	"testing"

	"ecom-store/backend/internal/services/auth"
)

type mockRepo struct {
	createOrderFn         func(ctx context.Context, userID, idempotencyKey string, req CreateOrderRequest) (Order, bool, error)
	listOrdersByUserFn    func(ctx context.Context, userID string) ([]Order, error)
	listOrdersFn          func(ctx context.Context) ([]Order, error)
	getOrderByIDFn        func(ctx context.Context, orderID string) (Order, error)
	updateOrderStatusFn   func(ctx context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error
	updatePaymentStatusFn func(ctx context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error
	isSellerAdminFn       func(ctx context.Context, userID string) (bool, error)
}

func (m *mockRepo) IsSellerAdmin(ctx context.Context, userID string) (bool, error) {
	if m.isSellerAdminFn != nil {
		return m.isSellerAdminFn(ctx, userID)
	}
	return false, nil
}

func (m *mockRepo) CreateOrder(ctx context.Context, userID, idempotencyKey string, req CreateOrderRequest) (Order, bool, error) {
	if m.createOrderFn != nil {
		return m.createOrderFn(ctx, userID, idempotencyKey, req)
	}
	return Order{}, false, nil
}

func (m *mockRepo) ListOrdersByUser(ctx context.Context, userID string) ([]Order, error) {
	if m.listOrdersByUserFn != nil {
		return m.listOrdersByUserFn(ctx, userID)
	}
	return nil, nil
}

func (m *mockRepo) ListOrders(ctx context.Context) ([]Order, error) {
	if m.listOrdersFn != nil {
		return m.listOrdersFn(ctx)
	}
	return nil, nil
}

func (m *mockRepo) GetOrderByID(ctx context.Context, orderID string) (Order, error) {
	if m.getOrderByIDFn != nil {
		return m.getOrderByIDFn(ctx, orderID)
	}
	return Order{}, nil
}

func (m *mockRepo) UpdateOrderStatus(ctx context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error {
	if m.updateOrderStatusFn != nil {
		return m.updateOrderStatusFn(ctx, orderID, fromStatus, toStatus, actorUserID, actorType, note)
	}
	return nil
}

func (m *mockRepo) UpdatePaymentStatus(ctx context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error {
	if m.updatePaymentStatusFn != nil {
		return m.updatePaymentStatusFn(ctx, orderID, fromStatus, toStatus, actorUserID, actorType, note)
	}
	return nil
}

func validCreateReq() CreateOrderRequest {
	return CreateOrderRequest{
		Items: []CreateOrderItemInput{{VariantID: "var-1", Quantity: 1}},
		ShippingAddress: Address{
			FullName:    "Rahul Sharma",
			Phone:       "+919999999999",
			Line1:       "Street 1",
			City:        "Pune",
			State:       "MH",
			PostalCode:  "411001",
			CountryCode: "IN",
		},
		PaymentMethod: "cod",
	}
}

func TestCreateOrder_ValidInputCallsRepo(t *testing.T) {
	req := validCreateReq()
	req.PaymentMethod = ""
	req.Notes = "  leave at gate  "
	req.Items[0].VariantID = "  var-1  "
	req.ShippingAddress.CountryCode = "in"

	var gotUserID, gotIdempotency string
	var gotReq CreateOrderRequest
	repo := &mockRepo{
		createOrderFn: func(_ context.Context, userID, idempotencyKey string, in CreateOrderRequest) (Order, bool, error) {
			gotUserID = userID
			gotIdempotency = idempotencyKey
			gotReq = in
			return Order{ID: "ord-1"}, true, nil
		},
	}
	svc := NewService(repo)

	order, created, err := svc.CreateOrder(context.Background(), auth.User{ID: "user-1"}, "  idem-1  ", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !created || order.ID != "ord-1" {
		t.Fatalf("unexpected create result: created=%v order=%+v", created, order)
	}
	if gotUserID != "user-1" {
		t.Fatalf("expected user-1, got %s", gotUserID)
	}
	if gotIdempotency != "idem-1" {
		t.Fatalf("expected trimmed idempotency key, got %q", gotIdempotency)
	}
	if gotReq.PaymentMethod != "cod" {
		t.Fatalf("expected default cod, got %q", gotReq.PaymentMethod)
	}
	if gotReq.Notes != "leave at gate" {
		t.Fatalf("expected trimmed notes, got %q", gotReq.Notes)
	}
	if gotReq.Items[0].VariantID != "var-1" {
		t.Fatalf("expected trimmed variant id, got %q", gotReq.Items[0].VariantID)
	}
	if gotReq.ShippingAddress.CountryCode != "IN" {
		t.Fatalf("expected uppercase country code, got %q", gotReq.ShippingAddress.CountryCode)
	}
}

func TestCreateOrder_InvalidIdempotency(t *testing.T) {
	svc := NewService(&mockRepo{})
	req := validCreateReq()

	_, _, err := svc.CreateOrder(context.Background(), auth.User{ID: "user-1"}, "   ", req)
	if !errors.Is(err, ErrInvalidIdempotencyKey) {
		t.Fatalf("expected ErrInvalidIdempotencyKey, got %v", err)
	}
}

func TestCreateOrder_InvalidPayload(t *testing.T) {
	svc := NewService(&mockRepo{})
	req := validCreateReq()
	req.Items = append(req.Items, CreateOrderItemInput{VariantID: "var-1", Quantity: 2})

	_, _, err := svc.CreateOrder(context.Background(), auth.User{ID: "user-1"}, "idem-1", req)
	if !errors.Is(err, ErrInvalidOrderInput) {
		t.Fatalf("expected ErrInvalidOrderInput, got %v", err)
	}
}

func TestGetMyOrderByID_ForbiddenForAnotherUser(t *testing.T) {
	repo := &mockRepo{
		getOrderByIDFn: func(_ context.Context, _ string) (Order, error) {
			return Order{ID: "ord-1", UserID: "user-2"}, nil
		},
	}
	svc := NewService(repo)

	_, err := svc.GetMyOrderByID(context.Background(), auth.User{ID: "user-1"}, "ord-1")
	if !errors.Is(err, ErrForbiddenOrder) {
		t.Fatalf("expected ErrForbiddenOrder, got %v", err)
	}
}

func TestCancelMyOrder_AllowsPendingAndCallsRepo(t *testing.T) {
	called := false
	repo := &mockRepo{
		getOrderByIDFn: func(_ context.Context, orderID string) (Order, error) {
			return Order{ID: orderID, UserID: "user-1", Status: "pending"}, nil
		},
		updateOrderStatusFn: func(_ context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error {
			called = true
			if orderID != "ord-1" || fromStatus != "pending" || toStatus != "cancelled" {
				t.Fatalf("unexpected status args: %s %s %s", orderID, fromStatus, toStatus)
			}
			if actorUserID != "user-1" || actorType != "buyer" {
				t.Fatalf("unexpected actor: %s %s", actorUserID, actorType)
			}
			if note != "changed mind" {
				t.Fatalf("expected trimmed note, got %q", note)
			}
			return nil
		},
	}
	svc := NewService(repo)

	err := svc.CancelMyOrder(context.Background(), auth.User{ID: "user-1"}, "ord-1", "  changed mind  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Fatalf("expected UpdateOrderStatus to be called")
	}
}

func TestCancelMyOrder_DisallowedState(t *testing.T) {
	repo := &mockRepo{
		getOrderByIDFn: func(_ context.Context, _ string) (Order, error) {
			return Order{ID: "ord-1", UserID: "user-1", Status: "shipped"}, nil
		},
	}
	svc := NewService(repo)

	err := svc.CancelMyOrder(context.Background(), auth.User{ID: "user-1"}, "ord-1", "")
	if !errors.Is(err, ErrCannotCancelOrder) {
		t.Fatalf("expected ErrCannotCancelOrder, got %v", err)
	}
}

func TestUpdateOrderStatusBySeller_TransitionRules(t *testing.T) {
	repo := &mockRepo{
		getOrderByIDFn: func(_ context.Context, _ string) (Order, error) {
			return Order{ID: "ord-1", Status: "pending"}, nil
		},
		updateOrderStatusFn: func(_ context.Context, orderID, fromStatus, toStatus, actorUserID, actorType, note string) error {
			if toStatus != "confirmed" {
				t.Fatalf("expected normalized status confirmed, got %q", toStatus)
			}
			if actorType != "seller" || actorUserID != "seller-1" {
				t.Fatalf("unexpected actor %s %s", actorUserID, actorType)
			}
			if note != "checked" {
				t.Fatalf("expected trimmed note, got %q", note)
			}
			return nil
		},
	}
	svc := NewService(repo)

	err := svc.UpdateOrderStatusBySeller(context.Background(), "seller-1", "ord-1", "  CONFIRMED  ", "  checked  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	err = svc.UpdateOrderStatusBySeller(context.Background(), "seller-1", "ord-1", "delivered", "")
	if !errors.Is(err, ErrInvalidOrderTransition) {
		t.Fatalf("expected ErrInvalidOrderTransition, got %v", err)
	}
}

func TestUpdatePaymentStatusBySeller_TransitionRules(t *testing.T) {
	repo := &mockRepo{
		getOrderByIDFn: func(_ context.Context, _ string) (Order, error) {
			return Order{ID: "ord-1", PaymentStatus: "pending"}, nil
		},
		updatePaymentStatusFn: func(_ context.Context, _, _, toStatus, _, _, _ string) error {
			if toStatus != "paid" {
				t.Fatalf("expected normalized status paid, got %q", toStatus)
			}
			return nil
		},
	}
	svc := NewService(repo)

	err := svc.UpdatePaymentStatusBySeller(context.Background(), "seller-1", "ord-1", "  PAID  ", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	err = svc.UpdatePaymentStatusBySeller(context.Background(), "seller-1", "ord-1", "refunded", "")
	if !errors.Is(err, ErrInvalidPaymentTransition) {
		t.Fatalf("expected ErrInvalidPaymentTransition, got %v", err)
	}
}
