#!/bin/bash

rm $PGDATA/pg_hba.conf

{ echo; echo "local all all trust"; } | gosu postgres tee -a "$PGDATA/pg_hba.conf" > /dev/null
{ echo; echo "local replication all trust"; } | gosu postgres tee -a "$PGDATA/pg_hba.conf" > /dev/null
{ echo; echo "host all all 127.0.0.1/32 trust"; } | gosu postgres tee -a "$PGDATA/pg_hba.conf" > /dev/null
{ echo; echo "host replication all 127.0.0.1/32 trust"; } | gosu postgres tee -a "$PGDATA/pg_hba.conf" > /dev/null
{ echo; echo "host replication all 172.0.0.0/8 md5"; } | gosu postgres tee -a "$PGDATA/pg_hba.conf" > /dev/null
{ echo; echo "host all all 172.0.0.1/8 md5"; } | gosu postgres tee -a "$PGDATA/pg_hba.conf" > /dev/null
