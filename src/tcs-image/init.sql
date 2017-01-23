-- System configuration
SELECT set_config('log_statement', 'all', true);
ALTER SYSTEM SET wal_level TO 'replica';
ALTER SYSTEM SET archive_mode TO on;
ALTER SYSTEM SET archive_command TO true;
ALTER SYSTEM SET max_wal_senders = 20;
ALTER SYSTEM SET max_replication_slots = 2;
ALTER SYSTEM SET wal_keep_segments = 200;

CREATE ROLE barman with SUPERUSER;
ALTER ROLE barman with LOGIN;
CREATE ROLE streaming_barman with REPLICATION LOGIN;

CREATE DATABASE prod WITH OWNER postgres;
CREATE DATABASE qa WITH OWNER postgres;
CREATE DATABASE dev WITH OWNER postgres;

\c dev
\i ./src/tcs-image/SQL/create-smdr.sql

\c qa
\i ./src/tcs-image/SQL/create-smdr.sql

\c prod
\i ./src/tcs-image/SQL/create-smdr.sql
