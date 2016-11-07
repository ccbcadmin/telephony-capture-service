SELECT
	raw_call. ID AS "ID",
	trunk. ID AS "TRUNK_ID",
	trunk. TYPE,
	trunk.description,
	raw_call.call_time,
	date_part(
		'epoch' :: TEXT,
		raw_call.connected_time
	) AS connected_time,
	date_part(
		'epoch' :: TEXT,
		raw_call.ring_time
	) AS ring_time,
	raw_call.caller,
	raw_call.called_number,
	raw_call.dialed_number,
	raw_call.party_1_device,
	raw_call.party_1_name,
	raw_call.party_2_device,
	raw_call.party_2_name,
	date_part(
		'epoch' :: TEXT,
		raw_call.park_time
	) AS park_time,
	date_part(
		'epoch' :: TEXT,
		raw_call.hold_time
	) AS hold_time,
	raw_call.external_targeting_cause,
	raw_call.external_targeter_id,
	raw_call.external_targeted_number
FROM
	raw_call,
	trunk
WHERE
	(
		(
			(raw_call.party_2_device) :: TEXT =(trunk. ID) :: TEXT
		)
		AND((trunk. ID) :: TEXT <> 'CBUS' :: TEXT)
		AND(
			raw_call.call_time >(
				'2015-01-01' :: DATE - '1 year' :: INTERVAL
			)
		)
		AND(
			(trunk. TYPE) :: TEXT <> 'CBUS' :: TEXT
		)
		AND(raw_call.direction = 'I' :: bpchar)
	)