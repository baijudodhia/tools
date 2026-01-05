/**
 * Metadata & Session Management Module
 * Handles record IDs, session tracking, and governance fields
 */

class MetadataManager {
  constructor(options = {}) {
    this.sessionId = this.generateSessionId();
    this.recordCounter = 0;
    this.options = {
      appName: options.appName || 'SystemTrace',
      appVersion: options.appVersion || '1.0.0',
      environment: options.environment || 'PROD',
      userId: options.userId || null,
      agentId: options.agentId || null,
      consentVersion: options.consentVersion || '1.0',
      consentTimestamp: options.consentTimestamp || new Date().toISOString(),
      dataRetentionPolicy: options.dataRetentionPolicy || '90d',
      auditReferenceId: options.auditReferenceId || null
    };
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRecordId() {
    this.recordCounter++;
    return `record_${this.sessionId}_${this.recordCounter}`;
  }

  getMetadata(recordType = 'STATIC') {
    return {
      record_id: this.generateRecordId(),
      session_id: this.sessionId,
      user_id: this.options.userId,
      agent_id: this.options.agentId,
      record_type: recordType,
      collected_at: new Date().toISOString(),
      page_url: typeof window !== 'undefined' ? window.location.href : null,
      app_name: this.options.appName,
      app_version: this.options.appVersion,
      environment: this.options.environment
    };
  }

  getGovernanceFields() {
    return {
      consent_version: this.options.consentVersion,
      consent_timestamp: this.options.consentTimestamp,
      data_retention_policy: this.options.dataRetentionPolicy,
      audit_reference_id: this.options.auditReferenceId
    };
  }

  setUserId(userId) {
    this.options.userId = userId;
  }

  setAgentId(agentId) {
    this.options.agentId = agentId;
  }

  updateConsent(version, timestamp) {
    this.options.consentVersion = version;
    this.options.consentTimestamp = timestamp || new Date().toISOString();
  }
}
