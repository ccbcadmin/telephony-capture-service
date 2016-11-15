FROM node:latest

# Create app directory
RUN mkdir -p /service
WORKDIR /service

# Install app dependencies
COPY package.json /service
RUN npm install

CMD [ "node", "lib/telephony-capture-service/telephony-capture-service.js"]

MAINTAINER Rod Monk
