FROM node:24-alpine

WORKDIR /app
RUN apk add --no-cache kubectl
COPY package.json package-lock.json* ./
RUN npm install --production
COPY --chown=node:node . .
RUN chmod +x /app/docker-entrypoint.sh && mkdir -p /home/node/.kube && chown -R node:node /home/node/.kube

EXPOSE 3000
USER node
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
