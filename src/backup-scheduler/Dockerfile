FROM node:6.9.1

RUN apt-get update \
  && apt-get install -y postgresql postgresql-contrib \
  && apt-get install sudo \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
  
# Create app directory
RUN mkdir -p /service
WORKDIR /service

# Install app dependencies
COPY package.json /service
RUN npm install

CMD [ "node", "lib/backup-scheduler/backup-scheduler.js"]

MAINTAINER Rod Monk
