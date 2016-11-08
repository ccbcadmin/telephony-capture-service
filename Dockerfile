FROM node
# Create app directory
RUN mkdir -p /usr/src/tcs
WORKDIR /usr/src/tcs

# Install app dependencies
COPY package.json /usr/src/tcs/
RUN npm install

# Bundle app source
COPY ./lib/ /usr/src/tcs/lib/

ENV TMS_ACTIVE=true
ENV TMS_HOST=192.168.1.69
ENV TMS_PORT=6543
ENV DOCKER_MACHINE_IP=192.168.99.100
ENV DELAY_STARTUP=5000

CMD [ "node", "lib/telephony-capture-service.js"]

MAINTAINER Rod Monk
