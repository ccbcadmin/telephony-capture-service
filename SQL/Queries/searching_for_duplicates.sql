SELECT DISTINCT
	call_time,
	caller,
	party_1_device,
	call_id,
	COUNT(*)
FROM
	raw_call
WHERE
	direction = 'I'
GROUP BY
	1,
	2,
	3,
	4
HAVING
	COUNT(*) > 1;