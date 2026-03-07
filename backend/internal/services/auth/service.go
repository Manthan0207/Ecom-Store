package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"net/smtp"
	"strings"
	"time"

	upstash "github.com/chronark/upstash-go"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"ecom-store/backend/internal/config"
)

var (
	ErrEmailAlreadyRegistered = errors.New("email already registered")
	ErrInvalidCredentials     = errors.New("invalid credentials")
	ErrInvalidPreAuthSession  = errors.New("invalid pre-auth session")
	ErrOTPMissingOrExpired    = errors.New("otp missing or expired")
	ErrInvalidOTPCode         = errors.New("invalid otp code")
	ErrInvalidAuthToken       = errors.New("invalid auth token")
	ErrSessionInvalid         = errors.New("invalid or expired session")
	ErrUserNotFound           = errors.New("user not found")
)

const (
	redisKeyPrefix = "auth:v1"
	sessionTTL     = 7 * 24 * time.Hour
	roleCacheTTL   = 5 * time.Minute
)

type Service struct {
	cfg   config.Config
	repo  Repository
	redis *upstash.Upstash
}

type LoginResult struct {
	PreAuthToken string
}

type Verify2FAResult struct {
	AuthToken string
}

func NewService(cfg config.Config, repo Repository, redis *upstash.Upstash) *Service {
	return &Service{cfg: cfg, repo: repo, redis: redis}
}

func (s *Service) Signup(ctx context.Context, req SignupReq) error {
	name := strings.TrimSpace(req.Name)
	email := strings.TrimSpace(strings.ToLower(req.Email))

	if name == "" || email == "" || len(req.Password) < 8 {
		return errors.New("invalid signup input")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.repo.CreateUser(ctx, name, email, string(hash))
}

func (s *Service) Login(ctx context.Context, req LoginReq) (LoginResult, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))

	u, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return LoginResult{}, ErrInvalidCredentials
		}
		return LoginResult{}, err
	}

	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)) != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	otpCode, err := generateOTP()
	if err != nil {
		return LoginResult{}, err
	}

	otpHash, err := bcrypt.GenerateFromPassword([]byte(otpCode), bcrypt.DefaultCost)
	if err != nil {
		return LoginResult{}, err
	}

	if err := s.repo.DeletePendingOTPs(ctx, u.ID); err != nil {
		return LoginResult{}, err
	}
	if err := s.repo.InsertLoginOTP(ctx, u.ID, string(otpHash), time.Now().Add(10*time.Minute)); err != nil {
		return LoginResult{}, err
	}

	if err := s.sendOTPEmail(u.Email, u.Name, otpCode); err != nil {
		return LoginResult{}, err
	}

	preAuthToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": u.ID,
		"exp": time.Now().Add(10 * time.Minute).Unix(),
	})

	signedPreAuth, err := preAuthToken.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return LoginResult{}, err
	}

	return LoginResult{PreAuthToken: signedPreAuth}, nil
}

func (s *Service) Verify2FA(ctx context.Context, preAuthToken, code string) (Verify2FAResult, error) {
	userID, err := s.parsePreAuthSubject(preAuthToken)
	if err != nil {
		return Verify2FAResult{}, ErrInvalidPreAuthSession
	}

	otpID, otpHash, err := s.repo.GetActiveLoginOTP(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrOTPMissingOrExpired) {
			return Verify2FAResult{}, ErrOTPMissingOrExpired
		}
		return Verify2FAResult{}, err
	}

	if bcrypt.CompareHashAndPassword([]byte(otpHash), []byte(code)) != nil {
		return Verify2FAResult{}, ErrInvalidOTPCode
	}

	if err := s.repo.MarkOTPUsed(ctx, otpID); err != nil {
		return Verify2FAResult{}, err
	}

	jti := uuid.NewString()
	expiry := time.Now().Add(sessionTTL)

	authToken := jwt.NewWithClaims(jwt.SigningMethodHS256, AuthClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(expiry),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        jti,
		},
	})

	signedAuth, err := authToken.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return Verify2FAResult{}, err
	}

	if err := s.redis.SetEX(sessionKey(jti), int(sessionTTL.Seconds()), userID); err != nil {
		return Verify2FAResult{}, err
	}

	return Verify2FAResult{AuthToken: signedAuth}, nil
}

func (s *Service) Authenticate(ctx context.Context, rawToken string) (User, error) {
	claims, err := s.parseAuthClaims(rawToken)
	if err != nil || claims.Subject == "" || claims.ID == "" {
		return User{}, ErrInvalidAuthToken
	}

	redisUserID, err := s.redis.Get(sessionKey(claims.ID))
	if err != nil {
		return User{}, err
	}
	if redisUserID == "" || redisUserID != claims.Subject {
		return User{}, ErrSessionInvalid
	}

	u, err := s.repo.GetUserByID(ctx, claims.Subject)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return User{}, ErrUserNotFound
		}
		return User{}, err
	}

	return u, nil
}

func (s *Service) Logout(rawToken string) error {
	claims, err := s.parseAuthClaims(rawToken)
	if err != nil || claims.ID == "" {
		return ErrInvalidAuthToken
	}

	// Upstash-go client does not expose DEL, so expire immediately.
	return s.redis.SetEX(sessionKey(claims.ID), 1, "revoked")
}

func (s *Service) GetUserRole(ctx context.Context, userID string) (string, error) {
	cachedRole, err := s.redis.Get(roleKey(userID))
	if err == nil && (cachedRole == "seller" || cachedRole == "user") {
		return cachedRole, nil
	}

	isSeller, err := s.repo.IsSellerAdmin(ctx, userID)
	if err != nil {
		return "", err
	}
	if isSeller {
		_ = s.redis.SetEX(roleKey(userID), int(roleCacheTTL.Seconds()), "seller")
		return "seller", nil
	}
	_ = s.redis.SetEX(roleKey(userID), int(roleCacheTTL.Seconds()), "user")
	return "user", nil
}

func generateOTP() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func (s *Service) sendOTPEmail(toEmail, toName, otpCode string) error {
	subject := fmt.Sprintf("%s is your STORE OS verification code", otpCode)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { margin-bottom: 40px; text-align: left; }
        .logo { font-size: 20px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase; color: #000000; text-decoration: none; }
        .content { background: #f9f9fb; border-radius: 24px; padding: 40px; border: 1px solid #eeeeee; }
        .title { font-size: 24px; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.02em; }
        .text { color: #666666; font-size: 16px; margin-bottom: 32px; }
        .otp-container { background: #ffffff; border-radius: 16px; padding: 24px; text-align: center; border: 1px solid #e5e5e7; margin-bottom: 32px; }
        .otp-code { font-size: 40px; font-weight: 800; letter-spacing: 0.4em; color: #000000; margin: 0; font-family: 'Courier New', Courier, monospace; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999999; text-transform: uppercase; letter-spacing: 0.1em; }
        .expiry { color: #f43f5e; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="#" class="logo">STORE OS</a>
        </div>
        <div class="content">
            <h1 class="title">Verification Code</h1>
            <p class="text">Hi %s, use the following code to complete your secure login sequence. For your protection, this code will expire in <span class="expiry">10 minutes</span>.</p>
            <div class="otp-container">
                <p class="otp-code">%s</p>
            </div>
            <p class="text" style="margin-bottom: 0; font-size: 14px;">If you didn't request this, you can safely ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
            &copy; 2026 Ecom Store - Secure Commerce Identity Layer
        </div>
    </div>
</body>
</html>
`, toName, otpCode)

	message := strings.Join([]string{
		fmt.Sprintf("From: %s", s.cfg.SMTPFrom),
		fmt.Sprintf("To: %s", toEmail),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=\"UTF-8\"",
		"",
		htmlBody,
	}, "\r\n")

	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	auth := smtp.PlainAuth("", s.cfg.SMTPUsername, s.cfg.SMTPPassword, s.cfg.SMTPHost)

	return smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{toEmail}, []byte(message))
}

func (s *Service) parsePreAuthSubject(rawToken string) (string, error) {
	token, err := jwt.Parse(rawToken, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return "", ErrInvalidPreAuthSession
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", ErrInvalidPreAuthSession
	}

	userIDStr, ok := claims["sub"].(string)
	if !ok || userIDStr == "" {
		return "", ErrInvalidPreAuthSession
	}

	return userIDStr, nil
}

func (s *Service) parseAuthClaims(rawToken string) (*AuthClaims, error) {
	claims := &AuthClaims{}
	token, err := jwt.ParseWithClaims(rawToken, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidAuthToken
	}
	return claims, nil
}

func sessionKey(jti string) string {
	return redisKeyPrefix + ":session:" + jti
}

func roleKey(userID string) string {
	return redisKeyPrefix + ":role:" + userID
}
