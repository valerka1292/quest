import type { FastifyBaseLogger } from 'fastify';

export interface AuditEvent {
  action: string;
  adminId: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

let _logger: FastifyBaseLogger | null = null;

export function initAuditLogger(logger: FastifyBaseLogger) {
  _logger = logger;
}

/**
 * Log an admin action for audit trail (VULN-13).
 * Records are written to stdout as structured JSON — capture with journald/CloudWatch.
 */
export function auditLog(event: AuditEvent) {
  const record = {
    audit: true,
    timestamp: new Date().toISOString(),
    ...event,
  };

  if (_logger) {
    _logger.info(record, `AUDIT: ${event.action}`);
  } else {
    console.log(JSON.stringify(record));
  }
}
