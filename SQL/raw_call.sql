/*
 Navicat PostgreSQL Data Transfer

 Source Server         : DockerPG
 Source Server Version : 90600
 Source Host           : 192.168.99.100
 Source Database       : postgres
 Source Schema         : public

 Target Server Version : 90600
 File Encoding         : utf-8

 Date: 11/07/2016 09:22:24 AM
*/

-- ----------------------------
--  Table structure for raw_call
-- ----------------------------
DROP TABLE IF EXISTS "public"."raw_call";
CREATE TABLE "public"."raw_call" (
	"id" int4 NOT NULL DEFAULT nextval('raw_call_id_seq'::regclass),
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
ALTER TABLE "public"."raw_call" OWNER TO "postgres";

