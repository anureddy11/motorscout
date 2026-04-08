FROM node:24-alpine

WORKDIR /app

COPY package.json server.js ./
COPY src ./src
COPY public ./public
COPY data ./data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
