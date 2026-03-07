package seller

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

func (h *Handler) handleCreateProduct(w http.ResponseWriter, r *http.Request) {
	sellerUser, ok := sellerUserFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req ProductCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	productID, err := h.service.CreateProduct(r.Context(), sellerUser, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidProductInput):
			httpError(w, http.StatusBadRequest, "invalid product data")
		default:
			httpError(w, http.StatusInternalServerError, "failed to create product")
		}
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]string{"id": productID, "message": "product created"})
}

func (h *Handler) handleListProducts(w http.ResponseWriter, r *http.Request) {
	products, err := h.service.ListProducts(r.Context())
	if err != nil {
		httpError(w, http.StatusInternalServerError, "failed to list products")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": products})
}

func (h *Handler) handleGetProductByID(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "id")
	if productID == "" {
		httpError(w, http.StatusBadRequest, "missing product id")
		return
	}

	product, err := h.service.GetProductByID(r.Context(), productID)
	if err != nil {
		httpError(w, http.StatusNotFound, "product not found")
		return
	}
	httpx.JSON(w, http.StatusOK, product)
}

func (h *Handler) handleUpdateProduct(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "id")
	if productID == "" {
		httpError(w, http.StatusBadRequest, "missing product id")
		return
	}

	var req ProductUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if err := h.service.UpdateProduct(r.Context(), productID, req); err != nil {
		switch {
		case errors.Is(err, ErrInvalidProductInput):
			httpError(w, http.StatusBadRequest, "invalid product data")
		default:
			httpError(w, http.StatusInternalServerError, "failed to update product")
		}
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "product updated"})
}

func (h *Handler) handleDeleteProduct(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "id")
	if productID == "" {
		httpError(w, http.StatusBadRequest, "missing product id")
		return
	}

	if err := h.service.DeleteProduct(r.Context(), productID); err != nil {
		httpError(w, http.StatusInternalServerError, "failed to delete product")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "product deleted"})
}

func (h *Handler) handleListColors(w http.ResponseWriter, r *http.Request) {
	colors, err := h.service.ListColors(r.Context())
	if err != nil {
		httpError(w, http.StatusInternalServerError, "failed to list colors")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": colors})
}

func httpError(w http.ResponseWriter, status int, message string) {
	httpx.Error(w, status, message)
}
