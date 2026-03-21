package catalog

import "github.com/go-chi/chi/v5"

type RouteDeps struct {
	DB *PostgresRepository
}

func RegisterRoutes(api chi.Router, deps RouteDeps) {
	service := NewService(deps.DB)
	handler := NewHandler(service)

	api.Get("/products", handler.handleListProducts)
	api.Get("/products/{id}", handler.handleGetProduct)
}
