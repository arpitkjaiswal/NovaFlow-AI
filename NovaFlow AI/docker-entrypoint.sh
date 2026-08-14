#!/bin/sh
# Exit immediately if a command exits with a non-zero status
set -e

echo "Waiting for PostgreSQL to be ready and running Prisma schema push..."
until npx prisma db push --accept-data-loss; do
  echo "Database connection failed. Retrying in 3 seconds..."
  sleep 3
done

echo "Database schema sync completed successfully!"

echo "Starting DevFlow AI Production Server..."
exec node server.js
