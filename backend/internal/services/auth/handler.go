package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"ecom-store/backend/internal/config"
	"ecom-store/backend/internal/httpx"
)

type Handler struct {
	cfg     config.Config
	service *Service
}

func NewHandler(cfg config.Config, service *Service) *Handler {
	return &Handler{cfg: cfg, service: service}
}

func (h *Handler) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req SignupReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if err := h.service.Signup(r.Context(), req); err != nil {
		switch {
		case errors.Is(err, ErrEmailAlreadyRegistered):
			httpError(w, http.StatusConflict, "email already registered")
		case strings.Contains(strings.ToLower(err.Error()), "invalid signup input"):
			httpError(w, http.StatusBadRequest, "name, email, and password (min 8 chars) are required")
		default:
			httpError(w, http.StatusInternalServerError, "failed to create user")
		}
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]string{
		"message": "signup successful; login to receive OTP by email",
	})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	result, err := h.service.Login(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidCredentials):
			httpError(w, http.StatusUnauthorized, "invalid credentials")
		default:
			httpError(w, http.StatusInternalServerError, "login failed")
		}
		return
	}

	h.setCookie(w, preAuthCookieName, result.PreAuthToken, int((10 * time.Minute).Seconds()))

	httpx.JSON(w, http.StatusOK, map[string]any{
		"message":      "password verified; OTP sent to your email",
		"requires_2fa": true,
	})
}

func (h *Handler) handleVerify2FA(w http.ResponseWriter, r *http.Request) {
	var req Verify2FAReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	req.Code = strings.TrimSpace(req.Code)
	if req.Code == "" {
		httpError(w, http.StatusBadRequest, "2FA code is required")
		return
	}
	if len(req.Code) != 6 {
		httpError(w, http.StatusBadRequest, "OTP code must be 6 digits")
		return
	}

	preAuthCookie, err := r.Cookie(preAuthCookieName)
	if err != nil {
		httpError(w, http.StatusUnauthorized, "missing pre-auth session")
		return
	}

	result, err := h.service.Verify2FA(r.Context(), preAuthCookie.Value, req.Code)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidPreAuthSession):
			httpError(w, http.StatusUnauthorized, "invalid pre-auth session")
		case errors.Is(err, ErrOTPMissingOrExpired):
			httpError(w, http.StatusUnauthorized, "OTP missing or expired, login again")
		case errors.Is(err, ErrInvalidOTPCode):
			httpError(w, http.StatusUnauthorized, "invalid OTP code")
		default:
			httpError(w, http.StatusInternalServerError, "2FA verification failed")
		}
		return
	}

	h.clearCookie(w, preAuthCookieName)
	h.setCookie(w, authCookieName, result.AuthToken, int((7 * 24 * time.Hour).Seconds()))

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "2FA verified, login successful"})
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	authCookie, err := r.Cookie(authCookieName)
	if err == nil {
		_ = h.service.Logout(authCookie.Value)
	}

	h.clearCookie(w, authCookieName)
	httpx.JSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	u, ok := userFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"id":    u.ID,
		"name":  u.Name,
		"email": u.Email,
	})
}

func (h *Handler) handleRole(w http.ResponseWriter, r *http.Request) {
	u, ok := userFromContext(r.Context())
	if !ok {
		httpError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	role, err := h.service.GetUserRole(r.Context(), u.ID)
	if err != nil {
		httpError(w, http.StatusInternalServerError, "failed to resolve role")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"user_id": u.ID,
		"role":    role,
	})
}

func (h *Handler) setCookie(w http.ResponseWriter, name, value string, maxAge int) {
	c := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAge,
	}
	if h.cfg.CookieDomain != "" {
		c.Domain = h.cfg.CookieDomain
	}
	http.SetCookie(w, c)
}

func (h *Handler) clearCookie(w http.ResponseWriter, name string) {
	c := &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	}
	if h.cfg.CookieDomain != "" {
		c.Domain = h.cfg.CookieDomain
	}
	http.SetCookie(w, c)
}

func httpError(w http.ResponseWriter, status int, message string) {
	httpx.Error(w, status, message)
}
