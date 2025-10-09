# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config files
COPY . .

# Compile contracts and copy ABIs
RUN npm run compile && npm run copy-paymaster

# Build TypeScript (if needed for production)
# Note: Using tsx in production, so build step is optional

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/contracts/abi ./contracts/abi
COPY --from=builder /app/artifacts ./artifacts

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Expose the application port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Run the application
CMD ["npm", "start"]
