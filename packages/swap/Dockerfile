FROM node:18.16.0-bullseye-slim as builder

# create root application folder
WORKDIR /app

COPY . .

ARG package_mirror_url
ARG package_mirror_url_auth

RUN npm install -g pnpm@8

RUN pnpm set registry=$package_mirror_url
RUN pnpm set _auth=$package_mirror_url_auth

RUN pnpm install --frozen-lockfile

ARG node_env
ENV NODE_ENV=$node_env

RUN pnpm --filter swap build

FROM node:18.16.0-bullseye-slim

WORKDIR /app

ARG package_mirror_url
ARG package_mirror_url_auth

RUN npm install pm2 -g
RUN npm install -g pnpm@8

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/packages/swap /app/packages/swap

WORKDIR /app/packages/swap

CMD ["pm2-runtime", "./dist/swap/src/index.js", "--enable-source-maps"]
