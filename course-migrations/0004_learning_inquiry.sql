-- Scope discovery before loading bodies; ordinary course workflows exclude inquiry records.
CREATE INDEX IF NOT EXISTS course_inquiry_source
ON course_records (course_id, kind, json_extract(body, '$.sourceId'));
