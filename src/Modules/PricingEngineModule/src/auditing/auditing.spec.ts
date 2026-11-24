import { createAuditLog } from './audit-log';
import { computeHash, insertAuditSql } from './background-audit-log-writer';
import { extractModuleName, isHealthPath } from './security-audit.middleware';

describe('Nest auditing (C# parity helpers)', () => {
  it('computeHash is stable for same payload', () => {
    const log = createAuditLog({
      id: '11111111-1111-1111-1111-111111111111',
      entityName: 'HttpRequest',
      entityId: 'corr-1',
      action: 'GET',
      userId: 'anonymous',
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
      oldValues: '',
      newValues: '{"a":1}',
    });
    const a = computeHash(log);
    const b = computeHash(log);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it('insertAuditSql is dialect-specific', () => {
    expect(insertAuditSql('mssql')).toContain('[dbo].[AUDIT_LOGS]');
    expect(insertAuditSql('mssql')).toContain('[CLIENT_ID]');
    expect(insertAuditSql('postgresql')).toContain('"AUDIT_LOGS"');
    expect(insertAuditSql('postgresql')).toContain('"CLIENT_ID"');
    expect(insertAuditSql('mysql')).toContain('`AUDIT_LOGS`');
    expect(insertAuditSql('mysql')).toContain('`CLIENT_ID`');
  });

  it('extractModuleName reads segment after /api/', () => {
    expect(extractModuleName('/api/PricingEngine/CommissionModels')).toBe('PricingEngine');
    expect(extractModuleName('/health')).toBe('health');
  });

  it('isHealthPath skips /hc, /health, and /metrics probes', () => {
    expect(isHealthPath('/hc')).toBe(true);
    expect(isHealthPath('/hc/')).toBe(true);
    expect(isHealthPath('/health')).toBe(true);
    expect(isHealthPath('/metrics')).toBe(true);
    expect(isHealthPath('/api/pricing-engine-module/commission-models')).toBe(false);
  });
});
