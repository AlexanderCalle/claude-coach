# Runnify Assistant - hosted plan server
#
# Builds the CLI (dist/) and the inlined plan-viewer template (templates/),
# then runs the plan server (src/server/plan-server.ts -> dist/server/plan-server.js)
# as a long-running process. Meant for Dokploy (or any Docker-based host):
# point it at this repo, set PLAN_TOKEN, mount a volume at /app/data.

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

# Only what the server needs - skip the skill .zip packaging steps (they
# need `zip`, which isn't in this image, and aren't used at runtime).
RUN npm run build:ts && npm run build:viewer

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/templates ./templates

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "dist/server/plan-server.js"]
