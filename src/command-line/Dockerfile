# Image provided to execute the command line tools
FROM node:6.9.1

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app
RUN npm install

ENTRYPOINT ["node"]

MAINTAINER Rod Monk
