package order

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"ecom-store/backend/internal/middleware"
	"ecom-store/backend/internal/services/auth"
)

type RouteDeps struct {
	AuthService *auth.Service
	DB          Repository
}

func RegisterRoutes(api chi.Router, deps RouteDeps) {
	svc := NewService(deps.DB)
	handler := NewHandler(svc)

	authMW := middleware.CookieAuth[auth.User](
		"ecom_auth",
		deps.AuthService.Authenticate,
		withOrderUser,
		handleAuthError,
	)

	sellerAdminMW := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := orderUserFromContext(r.Context())
			if !ok {
				httpError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			if err := svc.EnsureSellerAdmin(r.Context(), u.ID); err != nil {
				if errors.Is(err, ErrForbiddenSeller) {
					httpError(w, http.StatusForbidden, "seller admin access required")
					return
				}
				httpError(w, http.StatusInternalServerError, "failed to authorize seller")
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	api.With(authMW).Post("/orders", handler.handleCreateOrder)
	api.With(authMW).Get("/orders", handler.handleListMyOrders)
	api.With(authMW).Get("/orders/{id}", handler.handleGetMyOrder)
	api.With(authMW).Post("/orders/{id}/cancel", handler.handleCancelMyOrder)

	api.Route("/seller", func(sellerRouter chi.Router) {
		sellerRouter.Use(authMW)
		sellerRouter.Use(sellerAdminMW)
		sellerRouter.Get("/orders", handler.handleSellerListOrders)
		sellerRouter.Get("/orders/{id}", handler.handleSellerGetOrder)
		sellerRouter.Patch("/orders/{id}/status", handler.handleSellerUpdateOrderStatus)
		sellerRouter.Patch("/orders/{id}/payment-status", handler.handleSellerUpdatePaymentStatus)
	})
}

func handleAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, auth.ErrInvalidAuthToken):
		httpError(w, http.StatusUnauthorized, "invalid auth token")
	case errors.Is(err, auth.ErrSessionInvalid):
		httpError(w, http.StatusUnauthorized, "invalid or expired session")
	case errors.Is(err, auth.ErrUserNotFound):
		httpError(w, http.StatusUnauthorized, "user not found")
	default:
		if strings.Contains(strings.ToLower(err.Error()), "cookie") {
			httpError(w, http.StatusUnauthorized, "missing auth token")
			return
		}
		httpError(w, http.StatusInternalServerError, "failed to validate auth")
	}
}
