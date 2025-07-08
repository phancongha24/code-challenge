FROM node:18-alpine

WORKDIR /app

COPY package*.json ./


RUN npm install


COPY . .


RUN npm run build


RUN npm prune --omit=dev


RUN addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001 \
  && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
