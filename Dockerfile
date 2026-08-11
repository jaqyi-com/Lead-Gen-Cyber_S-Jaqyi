FROM node:20

WORKDIR /app

# Copy root package.json and install
COPY package*.json ./
RUN npm install

# Copy dashboard package.json and install
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm install

# Copy all source code
WORKDIR /app
COPY . .

# Build the root typescript project
RUN npm run build

# Build the Next.js dashboard
WORKDIR /app/dashboard
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Setup permissions for start script
WORKDIR /app
RUN chmod +x start.sh

# Expose Next.js default port
EXPOSE 3000

# Set environment variable for persistence (Railway will mount a volume here)
ENV DATA_DIR=/data
ENV PIPELINE_ROOT=/app

# Run the unified start script
CMD ["./start.sh"]
