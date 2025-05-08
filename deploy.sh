#!/bin/bash

# Build the Next.js application
echo "Building Next.js application..."
pnpm build

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Start or restart the application with PM2
echo "Starting application with PM2..."
pm2 delete shzerp || true
pm2 start npm --name "shzerp" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Request SSL certificate if not already obtained
if [ ! -d "/etc/letsencrypt/live/shunhuizhiye.id" ]; then
    echo "Requesting SSL certificate..."
    certbot certonly --nginx \
        --email admin@shunhuizhiye.id \
        --agree-tos --no-eff-email \
        -d shunhuizhiye.id
fi

# Restart Nginx to apply changes
echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "Deployment completed! Your application should now be available at https://shunhuizhiye.id" 