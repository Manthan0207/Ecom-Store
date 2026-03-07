package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	upstash "github.com/chronark/upstash-go"

	"ecom-store/backend/internal/config"
	"ecom-store/backend/internal/db"
	"ecom-store/backend/internal/router"
)

func main() {
	cfg := config.Load()

	// the background context is like root context
	//properties of background context
	//No cancellation
	//No timeout or deadline
	//No stored values
	//Never gets cancelled
	//Used as the starting/root context
	ctx := context.Background()

	//its gonna create a pool of connections to the database
	//and the pool size will be 4 * no of cpu cores
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	defer pool.Close()

	//creating the redis instance
	redisClient, err := upstash.New(upstash.Options{
		Url:   cfg.UpstashURL,
		Token: cfg.UpstashToken,
	})
	if err != nil {
		log.Fatalf("upstash connection failed: %v", err)
	}

	r := router.New(router.Dependencies{
		Config: cfg,
		DB:     pool,
		Redis:  &redisClient,
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("api listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
