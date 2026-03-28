package order

import (
	"context"

	"ecom-store/backend/internal/services/auth"
)

type ctxKey string

const orderUserCtxKey = ctxKey("order-user")

func withOrderUser(ctx context.Context, u auth.User) context.Context {
	return context.WithValue(ctx, orderUserCtxKey, u)
}

func orderUserFromContext(ctx context.Context) (auth.User, bool) {
	u, ok := ctx.Value(orderUserCtxKey).(auth.User)
	return u, ok
}
