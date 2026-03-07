package seller

import (
	"context"

	"ecom-store/backend/internal/services/auth"
)

type ctxKey string

const sellerUserCtxKey = ctxKey("seller-user")

func withSellerUser(ctx context.Context, u auth.User) context.Context {
	return context.WithValue(ctx, sellerUserCtxKey, u)
}

func sellerUserFromContext(ctx context.Context) (auth.User, bool) {
	u, ok := ctx.Value(sellerUserCtxKey).(auth.User)
	return u, ok
}
