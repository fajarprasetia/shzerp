#!/bin/bash

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Installing..."
    npm install -g pnpm
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Create .env.local from example
if [ ! -f .env.local ]; then
    echo "Creating .env.local from example..."
    cp .env.example .env.local
fi

# Generate NEXTAUTH_SECRET if not set
if ! grep -q "NEXTAUTH_SECRET" .env.local; then
    echo "Generating NEXTAUTH_SECRET..."
    echo "NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env.local
fi

# Run database migrations
echo "Running database migrations..."
pnpm prisma migrate dev

# Seed the database
echo "Seeding the database..."
pnpm prisma db seed

echo "Setup completed! You can now run 'pnpm dev' to start the development server."
