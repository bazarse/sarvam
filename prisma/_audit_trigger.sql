-- Append-only enforcement for the AuditLog table (defence in depth).
-- Any UPDATE or DELETE raises an exception, so even a compromised app role
-- cannot tamper with the audit trail. INSERT is still allowed.
CREATE OR REPLACE FUNCTION deny_auditlog_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditlog_no_update ON "AuditLog";
DROP TRIGGER IF EXISTS auditlog_no_delete ON "AuditLog";

CREATE TRIGGER auditlog_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION deny_auditlog_mutation();

CREATE TRIGGER auditlog_no_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION deny_auditlog_mutation();
