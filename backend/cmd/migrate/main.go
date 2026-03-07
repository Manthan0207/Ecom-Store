package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"ecom-store/backend/internal/db"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	databaseURL := mustEnv("DATABASE_URL")
	direction := strings.ToLower(getEnv("MIGRATION_DIRECTION", "up"))
	steps := mustPositiveInt(getEnv("MIGRATION_STEPS", "1"))

	ctx := context.Background()
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		//fatalf logs why it failed and then do os.exit(1)
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	switch direction {
	case "up":
		err = db.MigrateUp(ctx, pool, steps)
	case "down":
		err = db.MigrateDown(ctx, pool, steps)
	case "status":
		statuses, statusErr := db.ListMigrationStatus(ctx, pool)
		if statusErr != nil {
			log.Fatal(statusErr)
		}
		state, stateErr := db.GetMigrationState(ctx, pool)
		if stateErr != nil {
			log.Fatal(stateErr)
		}
		fmt.Printf("current_version=%d dirty=%t\n", state.CurrentVersion, state.Dirty)
		for _, s := range statuses {
			state := "pending"
			if s.Applied {
				state = "applied"
			}
			fmt.Printf("%04d %-24s %s\n", s.Version, s.Name, state)
		}
		fmt.Println("migrations complete: direction=status")
		return
	default:
		log.Fatalf("unsupported MIGRATION_DIRECTION=%q (use up/down/status)", direction)
	}

	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("migrations complete: direction=%s steps=%d\n", direction, steps)
}

func getEnv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing env: %s", key)
	}
	return v
}

func mustPositiveInt(v string) int {
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		log.Fatalf("invalid MIGRATION_STEPS=%q, must be positive integer", v)
	}
	return n
}
