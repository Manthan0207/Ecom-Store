package order

import (
	"encoding/json"
	"errors"
	"net/http"

	"ecom-store/backend/internal/httpx"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) handleCreateOrder(w http.ResponseWriter, r *http.Request) {
	buyer, ok := orderUserFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")

	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	order, created, err := h.service.CreateOrder(r.Context(), buyer, idempotencyKey, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidIdempotencyKey):
			httpError(w, http.StatusBadRequest, "Idempotency-Key header is required")
		case errors.Is(err, ErrInvalidOrderInput):
			httpError(w, http.StatusBadRequest, "invalid order payload")
		case errors.Is(err, ErrVariantNotFound):
			httpError(w, http.StatusBadRequest, "one or more variants not found")
		case errors.Is(err, ErrVariantInactive):
			httpError(w, http.StatusBadRequest, "one or more variants are inactive")
		case errors.Is(err, ErrInsufficientStock):
			httpError(w, http.StatusConflict, "insufficient stock")
		default:
			httpError(w, http.StatusInternalServerError, "failed to create order")
		}
		return
	}

	status := http.StatusCreated
	message := "order created"
	if !created {
		status = http.StatusOK
		message = "idempotent replay returned existing order"
	}

	httpx.JSON(w, status, map[string]any{
		"message": message,
		"order":   order,
	})
}

func (h *Handler) handleListMyOrders(w http.ResponseWriter, r *http.Request) {
	buyer, ok := orderUserFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	orders, err := h.service.ListMyOrders(r.Context(), buyer)
	if err != nil {
		httpError(w, http.StatusInternalServerError, "failed to list orders")
		return
	}

	httpx.JSON(w, http.StatusOK, ListOrdersResponse{Items: orders})
}

func (h *Handler) handleGetMyOrder(w http.ResponseWriter, r *http.Request) {
	buyer, ok := orderUserFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	orderID := chi.URLParam(r, "id")
	order, err := h.service.GetMyOrderByID(r.Context(), buyer, orderID)
	if err != nil {
		switch {
		case errors.Is(err, ErrOrderNotFound):
			httpError(w, http.StatusNotFound, "order not found")
		case errors.Is(err, ErrForbiddenOrder):
			httpError(w, http.StatusForbidden, "forbidden")
		default:
			httpError(w, http.StatusInternalServerError, "failed to get order")
		}
		return
	}

	httpx.JSON(w, http.StatusOK, order)
}

func (h *Handler) handleCancelMyOrder(w http.ResponseWriter, r *http.Request) {
	buyer, ok := orderUserFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	orderID := chi.URLParam(r, "id")
	var payload struct {
		Note string `json:"note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&payload)

	err := h.service.CancelMyOrder(r.Context(), buyer, orderID, payload.Note)
	if err != nil {
		switch {
		case errors.Is(err, ErrOrderNotFound):
			httpError(w, http.StatusNotFound, "order not found")
		case errors.Is(err, ErrForbiddenOrder):
			httpError(w, http.StatusForbidden, "forbidden")
		case errors.Is(err, ErrCannotCancelOrder):
			httpError(w, http.StatusConflict, "order cannot be cancelled at this stage")
		default:
			httpError(w, http.StatusInternalServerError, "failed to cancel order")
		}
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "order cancelled"})
}

func (h *Handler) handleSellerListOrders(w http.ResponseWriter, r *http.Request) {
	orders, err := h.service.ListOrdersForSeller(r.Context())
	if err != nil {
		httpError(w, http.StatusInternalServerError, "failed to list orders")
		return
	}
	httpx.JSON(w, http.StatusOK, ListOrdersResponse{Items: orders})
}

func (h *Handler) handleSellerGetOrder(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	order, err := h.service.GetOrderForSeller(r.Context(), orderID)
	if err != nil {
		if errors.Is(err, ErrOrderNotFound) {
			httpError(w, http.StatusNotFound, "order not found")
			return
		}
		httpError(w, http.StatusInternalServerError, "failed to get order")
		return
	}
	httpx.JSON(w, http.StatusOK, order)
}

func (h *Handler) handleSellerUpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	u, ok := orderUserFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	orderID := chi.URLParam(r, "id")
	var req UpdateOrderStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	err := h.service.UpdateOrderStatusBySeller(r.Context(), u.ID, orderID, req.Status, req.Note)
	if err != nil {
		switch {
		case errors.Is(err, ErrOrderNotFound):
			httpError(w, http.StatusNotFound, "order not found")
		case errors.Is(err, ErrInvalidOrderTransition):
			httpError(w, http.StatusBadRequest, "invalid order status transition")
		default:
			httpError(w, http.StatusInternalServerError, "failed to update order status")
		}
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "order status updated"})
}

func (h *Handler) handleSellerUpdatePaymentStatus(w http.ResponseWriter, r *http.Request) {
	u, ok := orderUserFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	orderID := chi.URLParam(r, "id")
	var req UpdatePaymentStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	err := h.service.UpdatePaymentStatusBySeller(r.Context(), u.ID, orderID, req.PaymentStatus, req.Note)
	if err != nil {
		switch {
		case errors.Is(err, ErrOrderNotFound):
			httpError(w, http.StatusNotFound, "order not found")
		case errors.Is(err, ErrInvalidPaymentTransition):
			httpError(w, http.StatusBadRequest, "invalid payment status transition")
		default:
			httpError(w, http.StatusInternalServerError, "failed to update payment status")
		}
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "payment status updated"})
}

func httpError(w http.ResponseWriter, status int, message string) {
	httpx.Error(w, status, message)
}
