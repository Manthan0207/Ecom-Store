package auth

import "context"

func withUser(ctx context.Context, u User) context.Context {
	return context.WithValue(ctx, userCtxKey, u)
}

func userFromContext(ctx context.Context) (User, bool) {
	u, ok := ctx.Value(userCtxKey).(User)
	return u, ok
}
