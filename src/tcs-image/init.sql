-- System configuration
SELECT set_config('log_statement', 'all', true);
ALTER SYSTEM SET wal_level TO 'replica';
ALTER SYSTEM SET archive_mode TO on;
ALTER SYSTEM SET archive_command TO 'test ! -f /postgres_backup_xlogs/%f && cp /var/lib/postgresql/data/pg_xlog/%f /postgres_backup_xlogs/%f';
ALTER SYSTEM SET max_wal_senders = 20;
ALTER SYSTEM SET max_replication_slots = 2;
--  ALTER SYSTEM SET wal_keep_segments = 10;

CREATE ROLE barman with SUPERUSER;
ALTER ROLE barman with LOGIN;
CREATE ROLE streaming_barman with REPLICATION LOGIN;

-- ----------------------------
--  Table structure for SMDR
-- ----------------------------
CREATE TABLE "public"."smdr" (
	"id" serial,
	"call_time" timestamp(6) NOT NULL,
	"connected_time" interval(6) NOT NULL,
	"ring_time" interval(6) NOT NULL DEFAULT '00:00:00'::interval second,
	"caller" varchar(40) COLLATE "default",
	"direction" char(1) NOT NULL COLLATE "default",
	"called_number" varchar(40) COLLATE "default",
	"dialed_number" varchar(40) COLLATE "default",
	"is_internal" char(1) NOT NULL COLLATE "default",
	"call_id" int4 NOT NULL,
	"continuation" char(1) NOT NULL COLLATE "default",
	"party_1_device" varchar(40) NOT NULL COLLATE "default",
	"party_1_name" varchar(40) NOT NULL COLLATE "default",
	"party_2_device" varchar(40) DEFAULT NULL::character varying COLLATE "default",
	"party_2_name" varchar(40) DEFAULT NULL::character varying COLLATE "default",
	"hold_time" interval(6) NOT NULL DEFAULT '00:00:00'::interval second,
	"park_time" interval(6) NOT NULL DEFAULT '00:00:00'::interval second,
	"external_targeting_cause" varchar(40) DEFAULT NULL::character varying COLLATE "default",
	"external_targeter_id" varchar(40) DEFAULT NULL::character varying COLLATE "default",
	"external_targeted_number" varchar(40) DEFAULT NULL::character varying COLLATE "default"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."smdr" OWNER TO "postgres";
