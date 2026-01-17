FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod

COPY . .

ENV NODE_ENV=production
ENV PORT=8080

CMD ["pnpm", "start"]
