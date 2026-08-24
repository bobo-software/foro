# syntax=docker/dockerfile:1.7
# Build Stage (Vite/rolldown require Node 20.19+ or 22.12+)
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json separately to leverage caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Infisical CLI.
RUN npm install -g @infisical/cli

# Copy the rest of the source code
COPY . .

# Infisical config.
ARG INFISICAL_ENV
ARG INFISICAL_DOMAIN
ARG INFISICAL_TOKEN

# Build app with Infisical-injected secrets.
# Supports either:
# 1) BuildKit secret mount: --secret id=infisical_token
# 2) Build arg fallback: --build-arg INFISICAL_TOKEN=...
RUN --mount=type=secret,id=infisical_token,required=false \
    TOKEN="$INFISICAL_TOKEN" && \
    if [ -f /run/secrets/infisical_token ]; then TOKEN="$(cat /run/secrets/infisical_token)"; fi && \
    if [ -z "$INFISICAL_DOMAIN" ]; then echo "Missing INFISICAL_DOMAIN build arg."; exit 1; fi && \
    if [ -z "$INFISICAL_ENV" ]; then echo "Missing INFISICAL_ENV build arg."; exit 1; fi && \
    if [ -z "$TOKEN" ]; then echo "Missing Infisical token. Provide BuildKit secret 'infisical_token' or build arg INFISICAL_TOKEN."; exit 1; fi && \
    infisical run --token="$TOKEN" --domain="$INFISICAL_DOMAIN" --env="$INFISICAL_ENV" -- npm run build

# Production Stage
FROM nginx:alpine

# Copy the built files from the build stage (dist directory)
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose nginx HTTP port
EXPOSE 80

# Run the application with nginx
CMD ["nginx", "-g", "daemon off;"]
