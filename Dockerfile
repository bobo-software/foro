# syntax=docker/dockerfile:1.7
# Build Stage (Vite/rolldown require Node 20.19+ or 22.12+)
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Infisical CLI is only used when Infisical build args/secrets are provided.
RUN npm install -g @infisical/cli

COPY . .

# Coolify / CI inject Vite public env as Docker build-args.
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_SITE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_SITE_URL=$VITE_SITE_URL

# Optional Infisical (local/prod secret injection).
# Coolify can skip these and pass VITE_* only.
ARG INFISICAL_ENV
ARG INFISICAL_DOMAIN
ARG INFISICAL_TOKEN

# Build with Infisical when fully configured; otherwise use VITE_* build-args.
# Supports:
# 1) BuildKit secret: --secret id=infisical_token
# 2) Build arg: --build-arg INFISICAL_TOKEN=...
# 3) No Infisical: npm run build with ARG/ENV VITE_* (Coolify)
RUN --mount=type=secret,id=infisical_token,required=false \
    TOKEN="$INFISICAL_TOKEN" && \
    if [ -f /run/secrets/infisical_token ]; then TOKEN="$(cat /run/secrets/infisical_token)"; fi && \
    if [ -n "$INFISICAL_DOMAIN" ] && [ -n "$INFISICAL_ENV" ] && [ -n "$TOKEN" ]; then \
      infisical run --token="$TOKEN" --domain="$INFISICAL_DOMAIN" --env="$INFISICAL_ENV" -- npm run build; \
    else \
      echo "Infisical not fully configured; building with VITE_* build args."; \
      npm run build; \
    fi

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
