package db

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

type migration struct {
	Version  int
	Name     string
	UpFile   string
	DownFile string
}

type MigrationStatus struct {
	Version int
	Name    string
	Applied bool
}

type MigrationState struct {
	CurrentVersion int
	Dirty          bool
}

var migrationPattern = regexp.MustCompile(`^(\d+)_(.+)\.(up|down)\.sql$`)

func MigrateUp(ctx context.Context, pool *pgxpool.Pool, steps int) error {
	if steps <= 0 {
		steps = 1
	}

	if err := ensureMigrationTables(ctx, pool); err != nil {
		return err
	}

	state, err := GetMigrationState(ctx, pool)
	if err != nil {
		return err
	}
	if state.Dirty {
		return errors.New("migration state is dirty; fix the failed migration before running new migrations")
	}

	migrations, err := loadMigrations()
	if err != nil {
		return err
	}

	applied, err := getAppliedVersions(ctx, pool)
	if err != nil {
		return err
	}

	appliedSet := make(map[int]struct{}, len(applied))
	for _, v := range applied {
		appliedSet[v] = struct{}{}
	}

	appliedCount := 0
	for _, m := range migrations {
		if _, exists := appliedSet[m.Version]; exists {
			continue
		}

		if err := setMigrationState(ctx, pool, m.Version, true); err != nil {
			return err
		}

		upSQL, readErr := readMigrationFile(m.UpFile)
		if readErr != nil {
			return readErr
		}

		tx, beginErr := pool.Begin(ctx)
		if beginErr != nil {
			return beginErr
		}

		if _, execErr := tx.Exec(ctx, upSQL); execErr != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("failed applying up migration %d: %w", m.Version, execErr)
		}

		if _, markErr := tx.Exec(ctx, `INSERT INTO schema_migrations(version, name) VALUES($1, $2)`, m.Version, m.Name); markErr != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("failed marking migration %d: %w", m.Version, markErr)
		}

		if commitErr := tx.Commit(ctx); commitErr != nil {
			return commitErr
		}

		if err := setMigrationState(ctx, pool, m.Version, false); err != nil {
			return err
		}

		appliedCount++
		if appliedCount >= steps {
			return nil
		}
	}

	if appliedCount == 0 {
		return errors.New("no pending up migrations")
	}

	return nil
}

func MigrateDown(ctx context.Context, pool *pgxpool.Pool, steps int) error {
	if steps <= 0 {
		steps = 1
	}

	if err := ensureMigrationTables(ctx, pool); err != nil {
		return err
	}

	state, err := GetMigrationState(ctx, pool)
	if err != nil {
		return err
	}
	if state.Dirty {
		return errors.New("migration state is dirty; fix the failed migration before running new migrations")
	}

	migrations, err := loadMigrations()
	if err != nil {
		return err
	}

	byVersion := make(map[int]migration, len(migrations))
	for _, m := range migrations {
		byVersion[m.Version] = m
	}

	applied, err := getAppliedVersions(ctx, pool)
	if err != nil {
		return err
	}

	if len(applied) == 0 {
		return errors.New("no applied migrations to roll back")
	}

	sort.Sort(sort.Reverse(sort.IntSlice(applied)))

	rolledBack := 0
	for idx, version := range applied {
		m, ok := byVersion[version]
		if !ok {
			return fmt.Errorf("missing down migration file for version %d", version)
		}

		if err := setMigrationState(ctx, pool, version, true); err != nil {
			return err
		}

		downSQL, readErr := readMigrationFile(m.DownFile)
		if readErr != nil {
			return readErr
		}

		tx, beginErr := pool.Begin(ctx)
		if beginErr != nil {
			return beginErr
		}

		if _, execErr := tx.Exec(ctx, downSQL); execErr != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("failed applying down migration %d: %w", m.Version, execErr)
		}

		if _, delErr := tx.Exec(ctx, `DELETE FROM schema_migrations WHERE version = $1`, m.Version); delErr != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("failed unmarking migration %d: %w", m.Version, delErr)
		}

		if commitErr := tx.Commit(ctx); commitErr != nil {
			return commitErr
		}

		nextVersion := 0
		if idx+1 < len(applied) {
			nextVersion = applied[idx+1]
		}
		if err := setMigrationState(ctx, pool, nextVersion, false); err != nil {
			return err
		}

		rolledBack++
		if rolledBack >= steps {
			return nil
		}
	}

	return nil
}

func ensureMigrationTables(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
    version BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS schema_migration_state (
    id SMALLINT PRIMARY KEY,
    current_version BIGINT NOT NULL DEFAULT 0,
    dirty BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (id = 1)
)`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
INSERT INTO schema_migration_state(id, current_version, dirty)
VALUES (1, 0, FALSE)
ON CONFLICT (id) DO NOTHING`)
	return err
}

func getAppliedVersions(ctx context.Context, pool *pgxpool.Pool) ([]int, error) {
	rows, err := pool.Query(ctx, `SELECT version FROM schema_migrations ORDER BY version ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	versions := make([]int, 0)
	for rows.Next() {
		var version int
		if scanErr := rows.Scan(&version); scanErr != nil {
			return nil, scanErr
		}
		versions = append(versions, version)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return versions, nil
}

func loadMigrations() ([]migration, error) {
	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return nil, err
	}

	collected := make(map[int]migration)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		matches := migrationPattern.FindStringSubmatch(name)
		if len(matches) != 4 {
			continue
		}

		version, convErr := strconv.Atoi(matches[1])
		if convErr != nil {
			return nil, convErr
		}

		m := collected[version]
		m.Version = version
		m.Name = matches[2]

		filePath := "migrations/" + name
		if matches[3] == "up" {
			m.UpFile = filePath
		} else {
			m.DownFile = filePath
		}

		collected[version] = m
	}

	result := make([]migration, 0, len(collected))
	for _, m := range collected {
		if strings.TrimSpace(m.UpFile) == "" || strings.TrimSpace(m.DownFile) == "" {
			return nil, fmt.Errorf("migration %d must have both up and down files", m.Version)
		}
		result = append(result, m)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Version < result[j].Version
	})

	return result, nil
}

func readMigrationFile(path string) (string, error) {
	content, err := migrationsFS.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func ListMigrationStatus(ctx context.Context, pool *pgxpool.Pool) ([]MigrationStatus, error) {
	if err := ensureMigrationTables(ctx, pool); err != nil {
		return nil, err
	}

	migrations, err := loadMigrations()
	if err != nil {
		return nil, err
	}

	applied, err := getAppliedVersions(ctx, pool)
	if err != nil {
		return nil, err
	}

	appliedSet := make(map[int]struct{}, len(applied))
	for _, v := range applied {
		appliedSet[v] = struct{}{}
	}

	statuses := make([]MigrationStatus, 0, len(migrations))
	for _, m := range migrations {
		_, ok := appliedSet[m.Version]
		statuses = append(statuses, MigrationStatus{
			Version: m.Version,
			Name:    m.Name,
			Applied: ok,
		})
	}

	return statuses, nil
}

func GetMigrationState(ctx context.Context, pool *pgxpool.Pool) (MigrationState, error) {
	if err := ensureMigrationTables(ctx, pool); err != nil {
		return MigrationState{}, err
	}

	var state MigrationState
	err := pool.QueryRow(ctx, `
SELECT current_version, dirty
FROM schema_migration_state
WHERE id = 1`).Scan(&state.CurrentVersion, &state.Dirty)
	if err != nil {
		return MigrationState{}, err
	}

	return state, nil
}

func setMigrationState(ctx context.Context, pool *pgxpool.Pool, version int, dirty bool) error {
	_, err := pool.Exec(ctx, `
UPDATE schema_migration_state
SET current_version = $1,
    dirty = $2,
    updated_at = NOW()
WHERE id = 1`, version, dirty)
	return err
}
