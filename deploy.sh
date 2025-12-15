#!/bin/bash

# Wojak Ink Deployment Script
# This script builds the production dist, stops containers, rebuilds, and starts them

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_info "Please copy .env.example to .env and configure it:"
    echo "  cp .env.example .env"
    echo "  # Then edit .env and add your CLOUDFLARE_TUNNEL_TOKEN"
    exit 1
fi

# Check if CLOUDFLARE_TUNNEL_TOKEN is set in .env
if ! grep -q "CLOUDFLARE_TUNNEL_TOKEN=" .env || grep -q "CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here" .env; then
    print_warn "CLOUDFLARE_TUNNEL_TOKEN not configured in .env"
    print_info "Please edit .env and set your CLOUDFLARE_TUNNEL_TOKEN"
    exit 1
fi

print_info "Starting deployment process..."

# Step 1: Build production dist
print_info "Step 1/4: Building production dist folder..."
if npm run build; then
    print_info "✓ Build completed successfully"
else
    print_error "Build failed!"
    exit 1
fi

# Step 2: Stop existing containers
print_info "Step 2/4: Stopping existing containers..."
if docker-compose down; then
    print_info "✓ Containers stopped"
else
    print_warn "No existing containers to stop (this is okay)"
fi

# Step 3: Rebuild containers
print_info "Step 3/4: Rebuilding Docker containers..."
if docker-compose build --no-cache; then
    print_info "✓ Containers rebuilt successfully"
else
    print_error "Container rebuild failed!"
    exit 1
fi

# Step 4: Start containers
print_info "Step 4/4: Starting containers..."
if docker-compose up -d; then
    print_info "✓ Containers started successfully"
else
    print_error "Failed to start containers!"
    exit 1
fi

# Show container status
print_info "Container status:"
docker-compose ps

# Show recent logs
print_info "Recent logs (last 20 lines):"
docker-compose logs --tail=20

print_info ""
print_info "Deployment complete! 🎉"
print_info ""
print_info "Your app should be available at:"
print_info "  - Local: http://localhost:3000"
print_info ""
print_info "Useful commands:"
print_info "  docker-compose logs -f          # Follow logs"
print_info "  docker-compose ps               # Check status"
print_info "  docker-compose down             # Stop containers"
print_info "  docker-compose restart          # Restart containers"

