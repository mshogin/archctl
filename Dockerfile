# archctl - Docker Image
# Lightweight Node.js image for validating DocHub architecture manifests

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS base

# Install git (needed for git submodule)
RUN apk add --no-cache git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .gitmodules ./

# Initialize git repo for submodules
RUN git init && \
    git config --global --add safe.directory /app

# Copy source code
COPY src ./src

# Install dependencies (production only)
RUN npm ci --production --ignore-scripts

# Clone DocHub as git submodule or use existing
# Note: In production, you may want to use a specific version/tag
RUN if [ ! -d "dochub" ]; then \
        git submodule add https://github.com/DocHubTeam/DocHub.git dochub || \
        git submodule update --init --recursive; \
    fi

# Make CLI executable
RUN chmod +x src/cli.mjs

# Create workspace mount point
WORKDIR /workspace

# Set entrypoint to validator CLI
ENTRYPOINT ["node", "/app/src/cli.mjs"]

# Default arguments (can be overridden)
CMD ["--workspace", "/workspace"]

# Metadata
LABEL maintainer="archctl"
LABEL description="CLI tool for validating DocHub architecture manifests"
LABEL version="1.0.0"
