SELECT
	to_char(raw_call.call_time, 'Day' :: TEXT) AS "Day",
	to_char(raw_call.call_time, 'D' :: TEXT) AS "Day#",
	COUNT(*) AS "No. of users"
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
	)
GROUP BY
	(
		to_char(raw_call.call_time, 'Day' :: TEXT)
	),
	(
		to_char(raw_call.call_time, 'D' :: TEXT)
	)
ORDER BY
	(
		to_char(raw_call.call_time, 'D' :: TEXT)
	)