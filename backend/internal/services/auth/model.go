package auth

import "github.com/golang-jwt/jwt/v5"

type User struct {
	ID           string
	Name         string
	Email        string
	PasswordHash string
}

type SignupReq struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Verify2FAReq struct {
	Code string `json:"code"`
}

type AuthClaims struct {
	jwt.RegisteredClaims
}
