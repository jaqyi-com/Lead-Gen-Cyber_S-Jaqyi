#!/bin/sh

echo "Starting JAQYI Lead Pipeline & Dashboard..."

# One-time cleanup for the corrupted WAL database to prevent SQLite segfaults
if [ ! -f /data/db_reset_done_v2.flag ]; then
  echo "Performing one-time database reset to clear WAL corruption..."
  rm -f /data/leads.db*
  touch /data/db_reset_done_v2.flag
fi

# 1. Start the pipeline scheduler in the background
cd /app
npm run schedule &

# 2. Start the Next.js dashboard
cd /app/dashboard
npm run start
