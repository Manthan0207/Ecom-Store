package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	FrontendOrigin string
	JWTSecret      string
	CookieSecure   bool
	CookieDomain   string
	SMTPHost       string
	SMTPPort       string
	SMTPUsername   string
	SMTPPassword   string
	SMTPFrom       string
	UpstashURL     string
	UpstashToken   string
}

func Load() Config {
	_ = godotenv.Load()

	secure, err := strconv.ParseBool(getEnv("COOKIE_SECURE", "false"))
	if err != nil {
		log.Fatal("invalid COOKIE_SECURE, use true/false")
	}

	cfg := Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    mustEnv("DATABASE_URL"),
		FrontendOrigin: getEnv("FRONTEND_ORIGIN", "http://localhost:3000"),
		JWTSecret:      mustEnv("JWT_SECRET"),
		CookieSecure:   secure,
		CookieDomain:   os.Getenv("COOKIE_DOMAIN"),
		SMTPHost:       mustEnv("SMTP_HOST"),
		SMTPPort:       mustEnv("SMTP_PORT"),
		SMTPUsername:   mustEnv("SMTP_USERNAME"),
		SMTPPassword:   mustEnv("SMTP_PASSWORD"),
		SMTPFrom:       mustEnv("SMTP_FROM"),
		UpstashURL:     mustEnv("UPSTASH_REDIS_REST_URL"),
		UpstashToken:   mustEnv("UPSTASH_REDIS_REST_TOKEN"),
	}

	return cfg
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
		log.Fatalf("missing required env: %s", key)
	}
	return v
}
