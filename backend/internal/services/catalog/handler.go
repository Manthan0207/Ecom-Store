package catalog

import (
	"errors"
	"net/http"

	"ecom-store/backend/internal/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) handleListProducts(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListActiveProducts(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to list products")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) handleGetProduct(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "id")
	if productID == "" {
		httpx.Error(w, http.StatusBadRequest, "missing product id")
		return
	}

	product, err := h.service.GetActiveProductByID(r.Context(), productID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.Error(w, http.StatusNotFound, "product not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "failed to load product")
		return
	}

	httpx.JSON(w, http.StatusOK, product)
}
