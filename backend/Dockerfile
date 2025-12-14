FROM rust:1.88-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy source
COPY Cargo.toml Cargo.lock* ./
COPY src ./src

# Build release
RUN cargo build --release

# Run
CMD ["./target/release/backend"]
