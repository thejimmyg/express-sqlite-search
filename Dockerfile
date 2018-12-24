FROM node:alpine as base

FROM base as builder
RUN mkdir /app
WORKDIR /app
COPY package.json /app
COPY package-lock.json /app
RUN npm install --only=prod

FROM base

COPY --from=builder /app /app
COPY bin/ /app/bin/
COPY lib/ /app/lib/
COPY migrations/ /app/migrations/
COPY views/ /app/views/
# You can mount your real `/app/root` volume when running docker
RUN mkdir -p /app/root/
WORKDIR /app
EXPOSE 80
ENV NODE_PATH=/app/node_modules
ENV NODE_ENV=production
ENV ROOT_DIR=/app/root
ENV PATH="${PATH}:/app/node_modules/.bin"
CMD ["node", "bin/server.js"]
