package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	CreateUser(ctx context.Context, name, email, passwordHash string) error
	GetUserByEmail(ctx context.Context, email string) (User, error)
	GetUserByID(ctx context.Context, userID string) (User, error)
	IsSellerAdmin(ctx context.Context, userID string) (bool, error)
	DeletePendingOTPs(ctx context.Context, userID string) error
	InsertLoginOTP(ctx context.Context, userID, otpHash string, expiresAt time.Time) error
	GetActiveLoginOTP(ctx context.Context, userID string) (string, string, error)
	MarkOTPUsed(ctx context.Context, otpID string) error
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) CreateUser(ctx context.Context, name, email, passwordHash string) error {
	_, err := r.db.Exec(ctx, `
        INSERT INTO users(name, email, password_hash)
        VALUES($1, $2, $3)
    `, name, email, passwordHash)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrEmailAlreadyRegistered
		}
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return ErrEmailAlreadyRegistered
		}
	}
	return err
}

func (r *PostgresRepository) GetUserByEmail(ctx context.Context, email string) (User, error) {
	var u User
	err := r.db.QueryRow(ctx, `
        SELECT id::text, name, email, password_hash
        FROM users
        WHERE email = $1
    `, email).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	return u, err
}

func (r *PostgresRepository) GetUserByID(ctx context.Context, userID string) (User, error) {
	var u User
	err := r.db.QueryRow(ctx, `
        SELECT id::text, name, email, password_hash
        FROM users
        WHERE id = $1
    `, userID).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	return u, err
}

func (r *PostgresRepository) IsSellerAdmin(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM seller_admins WHERE user_id = $1::uuid
        )
    `, userID).Scan(&exists)
	return exists, err
}

func (r *PostgresRepository) DeletePendingOTPs(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `
        DELETE FROM login_otps
        WHERE user_id = $1::uuid
            AND used_at IS NULL
    `, userID)
	return err
}

func (r *PostgresRepository) InsertLoginOTP(ctx context.Context, userID, otpHash string, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx, `
        INSERT INTO login_otps(user_id, otp_hash, expires_at)
        VALUES($1::uuid, $2, $3)
    `, userID, otpHash, expiresAt)
	return err
}

func (r *PostgresRepository) GetActiveLoginOTP(ctx context.Context, userID string) (string, string, error) {
	var otpID string
	var otpHash string
	err := r.db.QueryRow(ctx, `
        SELECT id::text, otp_hash
        FROM login_otps
        WHERE user_id = $1::uuid
            AND used_at IS NULL
            AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    `, userID).Scan(&otpID, &otpHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", ErrOTPMissingOrExpired
	}
	return otpID, otpHash, err
}

func (r *PostgresRepository) MarkOTPUsed(ctx context.Context, otpID string) error {
	_, err := r.db.Exec(ctx, `
        UPDATE login_otps
        SET used_at = NOW()
        WHERE id = $1::uuid
    `, otpID)
	return err
}
