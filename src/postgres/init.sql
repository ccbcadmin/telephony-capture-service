-- System configuration
ALTER SYSTEM SET wal_level TO 'replica';
ALTER SYSTEM SET archive_mode TO on;
ALTER SYSTEM SET archive_command TO 'test ! -f /postgres_wal_directory/%f && cp /var/lib/postgresql/data/pg_xlog/%f /postgres_wal_directory/%f';
ALTER SYSTEM SET max_wal_senders = 20;
ALTER USER postgres PASSWORD 'Dsbhottf4$';
-- ----------------------------
--  Table structure for SMDR
-- ----------------------------
DROP TABLE IF EXISTS "public"."SMDR";
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
