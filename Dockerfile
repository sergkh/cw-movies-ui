FROM node:21-alpine
WORKDIR /opt
COPY package*.json ./
COPY bin/ ./bin
RUN npm install
COPY public/ ./public
COPY src/ ./src
EXPOSE 3000
CMD [ "node", "./bin/www" ]