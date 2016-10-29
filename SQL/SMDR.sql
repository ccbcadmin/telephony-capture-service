drop table RAW_CALL;
create table RAW_CALL (
	ID SERIAL,
	CALL_TIME TIMESTAMP NOT NULL,
	CONNECTED_TIME INTERVAL SECOND NOT NULL,
	RING_TIME INTERVAL SECOND  NOT NULL DEFAULT '00:00:00',
	CALLER VARCHAR(40),
	DIRECTION CHAR NOT NULL,
	CALLED_NUMBER VARCHAR(40),
	DIALED_NUMBER VARCHAR(40), 
	IS_INTERNAL CHAR NOT NULL,
	CALL_ID INTEGER NOT NULL,
	CONTINUATION CHAR NOT NULL,
	PARTY_1_DEVICE VARCHAR(40) NOT NULL,
	PARTY_1_NAME VARCHAR(40) NOT NULL,
	PARTY_2_DEVICE VARCHAR(40) DEFAULT NULL,
	PARTY_2_NAME VARCHAR(40) DEFAULT NULL,
	HOLD_TIME INTERVAL SECOND NOT NULL DEFAULT '00:00:00',
	PARK_TIME INTERVAL SECOND NOT NULL DEFAULT '00:00:00',
	EXTERNAL_TARGETING_CAUSE VARCHAR(40) DEFAULT NULL,
	EXTERNAL_TARGETER_ID VARCHAR(40) DEFAULT NULL,
	EXTERNAL_TARGETED_NUMBER VARCHAR(40) DEFAULT NULL
);

DROP TABLE TRUNK;
CREATE TABLE TRUNK (
	ID VARCHAR(5),
	TYPE VARCHAR(20),
	DESCRIPTION VARCHAR(20)
);

INSERT INTO TRUNK VALUES ('T9001', 	'CDL', 'DL TRUNK 1');
INSERT INTO TRUNK VALUES ('T9002', 	'CDL', 'DL TRUNK 2');
INSERT INTO TRUNK VALUES ('T9003', 	'CDL', 'DL TRUNK 3');
INSERT INTO TRUNK VALUES ('T9004', 	'CDL', 'DL TRUNK 4');
INSERT INTO TRUNK VALUES ('T9005',	'CSUI', 'Suicide Trunk 5');
INSERT INTO TRUNK VALUES ('T9006',	'CSUI', 'Suicide Trunk 6');
INSERT INTO TRUNK VALUES ('T9007', 	'CBUS', 'Business Trunk 7');
INSERT INTO TRUNK VALUES ('T9008',	'CBUS', 'Business Trunk 8');
INSERT INTO TRUNK VALUES ('T9009', 	'CBUS', 'Business Trunk 9');
INSERT INTO TRUNK VALUES ('T9010', 	'CBUS', 'Business Trunk 10');
INSERT INTO TRUNK VALUES ('T9011',	'CBUS', 'Business Trunk 11');
INSERT INTO TRUNK VALUES ('T9012',	'CPRI', 'Priority Trunk 12');
INSERT INTO TRUNK VALUES ('T9013', 	'CSEN', 'Seniors Trunk 13');
INSERT INTO TRUNK VALUES ('T9014', 	'CMHS', 'MHSL Trunk 14');
INSERT INTO TRUNK VALUES ('T9015',	'CMHS', 'MHSL Trunk 15');
INSERT INTO TRUNK VALUES ('T9016', 	'VM Overflow', 'Voicemail Overflow');

/* All Incoming */
select CALL_TIME, CONNECTED_TIME, RING_TIME, CALLER, PARTY_1_DEVICE AS P1D, PARTY_1_NAME AS P1N, PARTY_2_DEVICE AS P2D, PARTY_2_NAME AS P2N
from RAW_CALL
where 
	direction = 'I'
ORDER BY CALL_TIME;

/* Incoming: List  */
select CALL_TIME, CONNECTED_TIME, RING_TIME, CALLER, PARTY_1_DEVICE AS P1D, PARTY_1_NAME AS P1N, PARTY_2_DEVICE AS P2D, PARTY_2_NAME AS P2N
from RAW_CALL
where 
	direction = 'I' AND
	(position ('Volunteer' in PARTY_1_NAME) > 0 OR position ('Volunteer' in PARTY_2_NAME) > 0) AND 
	(position ('T9' in PARTY_1_DEVICE) = 1 OR position ('T9' in PARTY_2_DEVICE) = 1)
ORDER BY CALL_TIME;

/* Incoming: Unfiltered Counts by Trunk Type for September, 2016 */
select TRUNK.TYPE, COUNT(*)
from RAW_CALL, TRUNK
where 
	RAW_CALL.PARTY_2_DEVICE = TRUNK.ID AND
	direction = 'I' AND
	position ('Volunteer' in PARTY_1_NAME) = 1 AND 
	position ('T9' in PARTY_2_DEVICE) = 1
GROUP BY TRUNK.TYPE;

/* Incoming: Unfiltered Counts by Trunk Type for September 30, 2016 */
select TRUNK.TYPE, COUNT(*)
from RAW_CALL, TRUNK
where 
	RAW_CALL.PARTY_2_DEVICE = TRUNK.ID AND
	CALL_TIME >= '2016-09-30' AND
	direction = 'I' AND
	position ('Volunteer' in PARTY_1_NAME) = 1 AND 
	position ('T9' in PARTY_2_DEVICE) = 1
GROUP BY TRUNK.TYPE;

/* Incoming: Filtered Counts by Trunk Type for September, 2016 (Connected Time >= 5 secs) */
select TRUNK.TYPE, COUNT(*)
from RAW_CALL, TRUNK
where 
	RAW_CALL.PARTY_2_DEVICE = TRUNK.ID AND
	DIRECTION = 'I' AND
	TRUNK.TYPE <> 'CBUS' AND
	position ('T9' in PARTY_2_DEVICE) = 1 and
	connected_time >= '00:00:05'
GROUP BY TRUNK.TYPE;

/* Incoming: Filtered Counts by Trunk Type for September 30, 2016 (Connected Time >= 5 secs) */
select TRUNK.TYPE, COUNT(*)
from RAW_CALL, TRUNK
where 
	RAW_CALL.PARTY_2_DEVICE = TRUNK.ID AND
	CALL_TIME >= '2016-09-30' AND
	direction = 'I' AND
	TRUNK.TYPE <> 'CBUS' AND
	position ('T9' in PARTY_2_DEVICE) = 1 and
	connected_time >= '00:00:05'
GROUP BY TRUNK.TYPE;


/* Incoming: Counts by Phone Station, Sept 30, 2016 */
select PARTY_1_NAME, PARTY_2_DEVICE, COUNT(*)
from RAW_CALL
where 
	direction = 'I' AND
	position ('Volunteer' in PARTY_1_NAME) = 1 AND 
	position ('T9' in PARTY_2_DEVICE) = 1
GROUP BY PARTY_1_NAME, PARTY_2_DEVICE
ORDER BY PARTY_2_DEVICE;

/* Outgoing */
select CALLER, PARTY_1_DEVICE, PARTY_2_DEVICE
from RAW_CALL
where 
	DIRECTION = 'O' AND 
	position ('Volunteer' in PARTY_1_NAME) = 1 AND 
	(position ('T9' in PARTY_1_DEVICE) = 1 OR position ('T9' in PARTY_2_DEVICE) = 1);

select CALL_TIME, CALLER, PARTY_1_DEVICE
from RAW_CALL rc
where 
	direction = 'I' and
	CALLER IS NOT NULL AND
	CALLER <> '' AND
	position ('Volunteer' in PARTY_1_NAME) = 1 AND 
	exists (
		select * from raw_call 
		where 
			direction = 'I' AND
			position ('Volunteer' in PARTY_1_NAME) = 1 AND 
			rc.caller = caller AND
			rc.party_1_name <> party_1_name AND
			(
				call_time between rc.call_time and rc.call_time+rc.connected_time OR
				rc.call_time between call_time and call_time+connected_time
			)
	);

/* Abandonment Rates */
select distinct party_1_name, count (*)
from raw_call
where party_1_device in ('E203', 'E206', 'E207')
group by party_1_name;

/* Scratch Area */


/*
SELECT Employees.LastName, COUNT(Orders.OrderID) AS NumberOfOrders FROM (Orders
INNER JOIN Employees
ON Orders.EmployeeID=Employees.EmployeeID)
GROUP BY LastName
HAVING COUNT(Orders.OrderID) > 10;
*/
