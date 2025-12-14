FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build args for env vars needed at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Build
RUN pnpm build

# Run
CMD ["pnpm", "start"]
