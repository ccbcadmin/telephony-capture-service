# Image provided to execute the command line tools
FROM node:6.9.1

MAINTAINER Rod Monk

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app
RUN npm install

# scoop up all the NodeJS code
COPY ./lib /app/lib

# ENTRYPOINT ["node"]
