package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"ecom-store/backend/internal/config"
	"ecom-store/backend/internal/db"
	"ecom-store/backend/internal/httpx"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const (
	preAuthCookieName = "ecom_pre_auth"
	sessionCookieName = "ecom_session"
)

type server struct {
	cfg config.Config
	db  *pgxpool.Pool
}

type user struct {
	ID           uuid.UUID
	Name         string
	Email        string
	PasswordHash string
}

type signupReq struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type verify2FAReq struct {
	Code string `json:"code"`
}

type ctxKey string

const userCtxKey = ctxKey("user")

func main() {
	cfg := config.Load()
	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	srv := &server{cfg: cfg, db: pool}

	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendOrigin},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api", func(api chi.Router) {
		api.Route("/auth", func(auth chi.Router) {
			auth.Post("/signup", srv.handleSignup)
			auth.Post("/login", srv.handleLogin)
			auth.Post("/verify-2fa", srv.handleVerify2FA)
			auth.Post("/logout", srv.authMiddleware(srv.handleLogout))
		})

		api.Get("/me", srv.authMiddleware(srv.handleMe))
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("api listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}

func (s *server) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req signupReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)

	if req.Name == "" || req.Email == "" || len(req.Password) < 8 {
		httpx.Error(w, http.StatusBadRequest, "name, email, and password (min 8 chars) are required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	_, err = s.db.Exec(r.Context(), `
        INSERT INTO users(name, email, password_hash, totp_secret)
        VALUES($1, $2, $3, $4)
    `, req.Name, req.Email, string(hash), "")
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			httpx.Error(w, http.StatusConflict, "email already registered")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]string{
		"message": "signup successful; login to receive OTP by email",
	})
}

func (s *server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var u user
	err := s.db.QueryRow(r.Context(), `
        SELECT id, name, email, password_hash
        FROM users
        WHERE email = $1
    `, req.Email).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.Error(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "failed to query user")
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)) != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	otpCode, err := generateOTP()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to generate OTP")
		return
	}

	otpHash, err := bcrypt.GenerateFromPassword([]byte(otpCode), bcrypt.DefaultCost)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to secure OTP")
		return
	}

	otpExpiry := time.Now().Add(10 * time.Minute)
	_, err = s.db.Exec(r.Context(), `
        DELETE FROM login_otps
        WHERE user_id = $1
            AND used_at IS NULL
    `, u.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to prepare OTP")
		return
	}

	_, err = s.db.Exec(r.Context(), `
        INSERT INTO login_otps(user_id, otp_hash, expires_at)
        VALUES($1, $2, $3)
    `, u.ID, string(otpHash), otpExpiry)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to store OTP")
		return
	}

	if err := s.sendOTPEmail(u.Email, u.Name, otpCode); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to send OTP email")
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": u.ID.String(),
		"exp": time.Now().Add(10 * time.Minute).Unix(),
	})

	signed, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to start 2FA flow")
		return
	}

	s.setCookie(w, preAuthCookieName, signed, int((10 * time.Minute).Seconds()))

	httpx.JSON(w, http.StatusOK, map[string]any{
		"message":      "password verified; OTP sent to your email",
		"requires_2fa": true,
	})
}

func (s *server) handleVerify2FA(w http.ResponseWriter, r *http.Request) {
	var req verify2FAReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	req.Code = strings.TrimSpace(req.Code)
	if req.Code == "" {
		httpx.Error(w, http.StatusBadRequest, "2FA code is required")
		return
	}
	if len(req.Code) != 6 {
		httpx.Error(w, http.StatusBadRequest, "OTP code must be 6 digits")
		return
	}

	preAuthCookie, err := r.Cookie(preAuthCookieName)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "missing pre-auth session")
		return
	}

	token, err := jwt.Parse(preAuthCookie.Value, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		httpx.Error(w, http.StatusUnauthorized, "invalid pre-auth session")
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid pre-auth claims")
		return
	}

	userIDStr, ok := claims["sub"].(string)
	if !ok || userIDStr == "" {
		httpx.Error(w, http.StatusUnauthorized, "invalid pre-auth subject")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid user id")
		return
	}

	var otpID uuid.UUID
	var otpHash string
	err = s.db.QueryRow(r.Context(), `
        SELECT id, otp_hash
        FROM login_otps
        WHERE user_id = $1
            AND used_at IS NULL
            AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    `, userID).Scan(&otpID, &otpHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.Error(w, http.StatusUnauthorized, "OTP missing or expired, login again")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "failed to verify OTP")
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(otpHash), []byte(req.Code)) != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid OTP code")
		return
	}

	_, err = s.db.Exec(r.Context(), `
        UPDATE login_otps
        SET used_at = NOW()
        WHERE id = $1
    `, otpID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to finalize OTP verification")
		return
	}

	sessionID := uuid.New()
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	_, err = s.db.Exec(r.Context(), `
        INSERT INTO sessions(id, user_id, expires_at)
        VALUES($1, $2, $3)
    `, sessionID, userID, expiresAt)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	s.clearCookie(w, preAuthCookieName)
	s.setCookie(w, sessionCookieName, sessionID.String(), int((7 * 24 * time.Hour).Seconds()))

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "2FA verified, login successful"})
}

func (s *server) handleLogout(w http.ResponseWriter, r *http.Request) {
	sessionCookie, err := r.Cookie(sessionCookieName)
	if err == nil {
		sessionID, parseErr := uuid.Parse(sessionCookie.Value)
		if parseErr == nil {
			_, _ = s.db.Exec(r.Context(), `
                UPDATE sessions
                SET revoked_at = NOW()
                WHERE id = $1
            `, sessionID)
		}
	}

	s.clearCookie(w, sessionCookieName)
	httpx.JSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (s *server) handleMe(w http.ResponseWriter, r *http.Request) {
	u, ok := r.Context().Value(userCtxKey).(user)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"id":    u.ID.String(),
		"name":  u.Name,
		"email": u.Email,
	})
}

func (s *server) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionCookie, err := r.Cookie(sessionCookieName)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "missing session")
			return
		}

		sessionID, err := uuid.Parse(sessionCookie.Value)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "invalid session token")
			return
		}

		var u user
		err = s.db.QueryRow(r.Context(), `
            SELECT u.id, u.name, u.email, u.password_hash
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = $1
                AND s.revoked_at IS NULL
                AND s.expires_at > NOW()
        `, sessionID).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "invalid or expired session")
			return
		}

		ctx := context.WithValue(r.Context(), userCtxKey, u)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func generateOTP() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%06d", n.Int64()), nil
}

func (s *server) sendOTPEmail(toEmail, toName, otpCode string) error {
	subject := "Your Ecom Store login OTP"
	body := fmt.Sprintf(
		"Hi %s,\r\n\r\nYour login OTP is: %s\r\nThis code expires in 10 minutes.\r\n\r\nIf this was not you, please reset your password.\r\n",
		toName,
		otpCode,
	)

	message := strings.Join([]string{
		fmt.Sprintf("From: %s", s.cfg.SMTPFrom),
		fmt.Sprintf("To: %s", toEmail),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=\"UTF-8\"",
		"",
		body,
	}, "\r\n")

	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	auth := smtp.PlainAuth("", s.cfg.SMTPUsername, s.cfg.SMTPPassword, s.cfg.SMTPHost)

	return smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{toEmail}, []byte(message))
}

func (s *server) setCookie(w http.ResponseWriter, name, value string, maxAge int) {
	c := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAge,
	}
	if s.cfg.CookieDomain != "" {
		c.Domain = s.cfg.CookieDomain
	}
	http.SetCookie(w, c)
}

func (s *server) clearCookie(w http.ResponseWriter, name string) {
	c := &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	}
	if s.cfg.CookieDomain != "" {
		c.Domain = s.cfg.CookieDomain
	}
	http.SetCookie(w, c)
}
