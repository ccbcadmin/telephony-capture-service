FROM node:6.9.1

# Create app directory
RUN mkdir -p /service
WORKDIR /service

# Install app dependencies
COPY package.json /service
RUN npm install

CMD [ "node", "lib/database-interface/database-interface.js"]

MAINTAINER Rod Monk
