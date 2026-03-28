package router

import (
	"net/http"

	upstash "github.com/chronark/upstash-go"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"ecom-store/backend/internal/config"
	"ecom-store/backend/internal/httpx"
	"ecom-store/backend/internal/services/auth"
	"ecom-store/backend/internal/services/catalog"
	"ecom-store/backend/internal/services/seller"
)

type Dependencies struct {
	Config config.Config
	DB     *pgxpool.Pool
	Redis  *upstash.Upstash
}

func New(deps Dependencies) http.Handler {
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{deps.Config.FrontendOrigin},                                // Only allow requests from the frontend origin (no "*" because credentials are enabled)
		AllowedMethods: []string{"GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"},        // // HTTP methods the frontend is allowed to use
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"}, // Headers the client can send with requests
		ExposedHeaders: []string{"Link"},                                                    // Headers that the browser is allowed to read from the response

		// Allows the browser to send credentials (cookies, Authorization headers, etc.)
		// Required when using cookie-based authentication across different origins
		AllowCredentials: true,

		// Tells the browser to cache the CORS preflight (OPTIONS) response for 300 seconds (5 minutes)
		// This reduces the number of preflight requests and improves performance
		MaxAge: 300,
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	authRepo := auth.NewRepository(deps.DB)
	authService := auth.NewService(deps.Config, authRepo, deps.Redis)
	sellerRepo := seller.NewRepository(deps.DB)
	catalogRepo := catalog.NewRepository(deps.DB)

	r.Route("/api", func(api chi.Router) {
		auth.RegisterRoutes(api, auth.RouteDeps{
			Config:  deps.Config,
			Service: authService,
		})
		catalog.RegisterRoutes(api, catalog.RouteDeps{
			DB: catalogRepo,
		})
		seller.RegisterRoutes(api, seller.RouteDeps{
			AuthService: authService,
			DB:          sellerRepo,
		})
	})

	return r
}
