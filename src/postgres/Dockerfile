FROM postgres

RUN mkdir -p /docker-entrypoint-initdb.d
COPY ./src/postgres/init.sql /docker-entrypoint-initdb.d/