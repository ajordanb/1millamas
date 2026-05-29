FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


FROM socialengine/nginx-spa:latest AS runner
COPY --from=builder /usr/src/app/dist /app
EXPOSE 80
CMD ["nginx"]
