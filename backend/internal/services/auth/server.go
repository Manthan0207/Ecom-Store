package auth

const (
	preAuthCookieName = "ecom_pre_auth"
	authCookieName    = "ecom_auth"
)

type ctxKey string

const userCtxKey = ctxKey("user")
