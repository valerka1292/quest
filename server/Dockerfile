FROM node:20-alpine AS shared-build
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src
RUN cd packages/shared && npm install && npm run build

FROM node:20-alpine AS server-build
WORKDIR /app
COPY tsconfig.base.json ./
COPY server/package.json server/tsconfig.json server/
COPY server/prisma server/prisma
COPY --from=shared-build /app/packages/shared /app/packages/shared
COPY package.json package-lock.json ./
RUN npm ci --workspace=server --workspace=packages/shared && \
    cd server && npx prisma generate
COPY server/src server/src
RUN cd server && npm run build

FROM node:20-alpine AS server
WORKDIR /app
COPY --from=server-build /app/server/dist /app/dist
COPY --from=server-build /app/server/prisma /app/prisma
COPY --from=server-build /app/server/package.json /app/package.json
COPY --from=server-build /app/node_modules /app/node_modules
COPY --from=server-build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=server-build /app/packages /app/packages
EXPOSE 3001
CMD ["node", "dist/app.js"]
