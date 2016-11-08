FROM node
# Create app directory
RUN mkdir -p /usr/src/tcs
WORKDIR /usr/src/tcs

# Install app dependencies
COPY package.json /usr/src/tcs/
RUN npm install

# Bundle app source
COPY ./lib/ /usr/src/tcs/lib/

# Disable the TMS inteface by setting param to "false"
CMD [ "node", "lib/telephony-capture-service.js", "192.16.99.100", "true"]