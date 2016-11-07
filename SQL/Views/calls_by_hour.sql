SELECT
	date_part(
		'hour' :: TEXT,
		raw_call.call_time
	) AS "Hour",
	COUNT(*) AS "Incoming Calls"
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
		AND(raw_call.direction = 'I' :: bpchar)
		AND(
			raw_call.connected_time >= '00:00:05' :: INTERVAL
		)
	)
GROUP BY
	(
		date_part(
			'hour' :: TEXT,
			raw_call.call_time
		)
	)
ORDER BY
	(
		date_part(
			'hour' :: TEXT,
			raw_call.call_time
		)
	)