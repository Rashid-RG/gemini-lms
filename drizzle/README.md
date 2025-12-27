# Database Migrations Guide

This project uses **Drizzle ORM** for database schema management with PostgreSQL (Neon).

## Setup

Migrations are stored in `./drizzle/migrations` directory.

## Commands

### Generate a new migration
When you make changes to `configs/schema.js`, generate a migration:

```bash
npx drizzle-kit generate
```

This creates a new migration file in `drizzle/migrations/`.

### Apply migrations to database
Push schema changes to the database:

```bash
npx drizzle-kit push
```

### View current database state
Open Drizzle Studio to view and edit data:

```bash
npx drizzle-kit studio
```

### Check migration status
See differences between schema and database:

```bash
npx drizzle-kit check
```

## Migration Workflow

1. **Modify Schema**: Update `configs/schema.js`
2. **Generate Migration**: Run `npx drizzle-kit generate`
3. **Review Migration**: Check the generated SQL in `drizzle/migrations/`
4. **Test Locally**: Apply to development database
5. **Apply to Production**: Run migration on production database

## Best Practices

- Always generate migrations before pushing to production
- Review generated SQL for correctness
- Backup database before running migrations
- Keep migrations small and focused
- Use descriptive names for custom migrations

## Environment Variables

Set your database URL in `.env.local`:

```
NEXT_PUBLIC_DB_CONNECTION_STRING=postgresql://user:pass@host/db?sslmode=require
```

## Rollback Strategy

Drizzle doesn't have built-in rollback. For rollbacks:

1. Create a new migration that reverses the changes
2. Or restore from database backup

## Schema Version Tracking

The `_drizzle_migrations` table in the database tracks applied migrations.
