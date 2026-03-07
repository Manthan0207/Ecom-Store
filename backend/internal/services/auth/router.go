package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"ecom-store/backend/internal/config"
	"ecom-store/backend/internal/middleware"
)

type RouteDeps struct {
	Config  config.Config
	Service *Service
}

func RegisterRoutes(api chi.Router, deps RouteDeps) {
	svc := deps.Service
	handler := NewHandler(deps.Config, svc)

	authMW := middleware.CookieAuth[User](
		authCookieName,
		svc.Authenticate,
		withUser,
		handler.handleAuthError,
	)

	authRouter := chi.NewRouter()
	authRouter.Post("/signup", handler.handleSignup)
	authRouter.Post("/login", handler.handleLogin)
	authRouter.Post("/verify-2fa", handler.handleVerify2FA)
	authRouter.With(authMW).Post("/logout", handler.handleLogout)
	authRouter.With(authMW).Get("/role", handler.handleRole)

	api.Mount("/auth", authRouter)
	api.With(authMW).Get("/me", handler.handleMe)
}

func (h *Handler) handleAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidAuthToken):
		httpError(w, http.StatusUnauthorized, "invalid auth token")
	case errors.Is(err, ErrSessionInvalid):
		httpError(w, http.StatusUnauthorized, "invalid or expired session")
	case errors.Is(err, ErrUserNotFound):
		httpError(w, http.StatusUnauthorized, "user not found")
	default:
		if strings.Contains(strings.ToLower(err.Error()), "cookie") {
			httpError(w, http.StatusUnauthorized, "missing auth token")
			return
		}
		httpError(w, http.StatusInternalServerError, "failed to validate session state")
	}
}
