#!/bin/bash

# Exit on error
set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "PostgreSQL is unavailable - sleeping 2s"
  sleep 2
done

echo "PostgreSQL is up - executing migrations"
PGPASSWORD=shzdb2025 npx prisma migrate deploy

echo "Seeding the database..."
PGPASSWORD=shzdb2025 npx prisma db seed

echo "Database initialization complete!" 