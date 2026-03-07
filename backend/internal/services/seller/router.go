package seller

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
		withSellerUser,
		handleAuthError,
	)

	sellerAdminMW := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := sellerUserFromContext(r.Context())
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

	sellerRouter := chi.NewRouter()
	sellerRouter.Use(authMW)
	sellerRouter.Use(sellerAdminMW)
	sellerRouter.Get("/colors", handler.handleListColors)
	sellerRouter.Post("/products", handler.handleCreateProduct)
	sellerRouter.Get("/products", handler.handleListProducts)
	sellerRouter.Get("/products/{id}", handler.handleGetProductByID)
	sellerRouter.Put("/products/{id}", handler.handleUpdateProduct)
	sellerRouter.Delete("/products/{id}", handler.handleDeleteProduct)

	api.Mount("/seller", sellerRouter)
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
