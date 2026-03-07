package middleware

import (
	"context"
	"net/http"
)

// CookieAuth validates an auth cookie, attaches principal to context, then executes the next handler.
func CookieAuth[T any](
	cookieName string,
	authenticate func(context.Context, string) (T, error),
	attachPrincipal func(context.Context, T) context.Context,
	onAuthError func(http.ResponseWriter, error),
) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(cookieName)
			if err != nil {
				onAuthError(w, err)
				return
			}

			principal, err := authenticate(r.Context(), cookie.Value)
			if err != nil {
				onAuthError(w, err)
				return
			}

			ctx := attachPrincipal(r.Context(), principal)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
