FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src ./src
RUN mkdir -p logs && chown -R appuser:appgroup /app
USER appuser
CMD ["node", "src/index.js"]
