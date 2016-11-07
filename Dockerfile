FROM node
# Create app directory
RUN mkdir -p /usr/src/tcs
WORKDIR /usr/src/tcs

# Install app dependencies
COPY package.json /usr/src/tcs/
RUN npm install

# Bundle app source
COPY ./lib/ /usr/src/tcs/lib/

CMD [ "npm", "start" ]