#!/bin/bash

# Exit on error
set -e

echo "Starting SHZ ERP Docker initialization..."

# Build and start the containers
echo "Building and starting Docker containers..."
docker-compose up -d --build

# Wait for the database to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy

# Seed the database
echo "Seeding the database..."
docker-compose exec -T app npx prisma db seed

echo "Initialization complete! The application is now running at http://localhost:3000"
echo "pgAdmin is available at http://localhost:5050 (login with admin@example.com / admin)" 