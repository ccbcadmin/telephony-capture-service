/*
 Navicat PostgreSQL Data Transfer

 Source Server         : DockerPG
 Source Server Version : 90600
 Source Host           : 192.168.99.100
 Source Database       : postgres
 Source Schema         : public

 Target Server Version : 90600
 File Encoding         : utf-8

 Date: 11/07/2016 09:23:25 AM
*/

-- ----------------------------
--  Table structure for trunk
-- ----------------------------
DROP TABLE IF EXISTS "public"."trunk";
CREATE TABLE "public"."trunk" (
	"id" varchar(5) COLLATE "default",
	"type" varchar(20) COLLATE "default",
	"description" varchar(20) COLLATE "default"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."trunk" OWNER TO "postgres";

-- ----------------------------
--  Records of trunk
-- ----------------------------
BEGIN;
INSERT INTO "public"."trunk" VALUES ('T9001', 'CDL', 'DL TRUNK 1');
INSERT INTO "public"."trunk" VALUES ('T9002', 'CDL', 'DL TRUNK 2');
INSERT INTO "public"."trunk" VALUES ('T9003', 'CDL', 'DL TRUNK 3');
INSERT INTO "public"."trunk" VALUES ('T9004', 'CDL', 'DL TRUNK 4');
INSERT INTO "public"."trunk" VALUES ('T9005', 'CSUI', 'Suicide Trunk 5');
INSERT INTO "public"."trunk" VALUES ('T9006', 'CSUI', 'Suicide Trunk 6');
INSERT INTO "public"."trunk" VALUES ('T9007', 'CBUS', 'Business Trunk 7');
INSERT INTO "public"."trunk" VALUES ('T9008', 'CBUS', 'Business Trunk 8');
INSERT INTO "public"."trunk" VALUES ('T9009', 'CBUS', 'Business Trunk 9');
INSERT INTO "public"."trunk" VALUES ('T9010', 'CBUS', 'Business Trunk 10');
INSERT INTO "public"."trunk" VALUES ('T9011', 'CBUS', 'Business Trunk 11');
INSERT INTO "public"."trunk" VALUES ('T9012', 'CPRI', 'Priority Trunk 12');
INSERT INTO "public"."trunk" VALUES ('T9013', 'CSEN', 'Seniors Trunk 13');
INSERT INTO "public"."trunk" VALUES ('T9014', 'CMHS', 'MHSL Trunk 14');
INSERT INTO "public"."trunk" VALUES ('T9015', 'CMHS', 'MHSL Trunk 15');
INSERT INTO "public"."trunk" VALUES ('T9016', 'VM Overflow', 'Voicemail Overflow');
COMMIT;

