FROM node:20-alpine

WORKDIR /app

# Built with the repo root as build context (see docker-compose.yml) so this
# entrypoint can be shared from the top-level docker/ directory.
COPY docker/node/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# The frontend source is provided at runtime via the bind mount declared
# in docker-compose.yml (see the "frontend" service); npm install runs at
# container start (see entrypoint.sh) so node_modules matches whatever is
# actually mounted, rather than whatever happened to exist at build time.

EXPOSE 5173

ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
