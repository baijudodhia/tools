/**
 * Main Telemetry Orchestrator
 * Coordinates static, continuous, and inferred telemetry collection
 */

class TelemetryCollector {
  constructor(options = {}) {
    this.options = {
      continuousInterval: options.continuousInterval || 5000,
      autoStart: options.autoStart !== false,
      appName: options.appName || 'SystemTrace',
      appVersion: options.appVersion || '1.0.0',
      environment: options.environment || 'PROD',
      userId: options.userId || null,
      agentId: options.agentId || null,
      consentVersion: options.consentVersion || '1.0',
      consentTimestamp: options.consentTimestamp || new Date().toISOString(),
      dataRetentionPolicy: options.dataRetentionPolicy || '90d',
      auditReferenceId: options.auditReferenceId || null,
      ...options
    };

    this.metadata = new MetadataManager(this.options);
    this.staticTelemetry = new StaticTelemetry();
    this.continuousTelemetry = new ContinuousTelemetry(this.options.continuousInterval);
    this.permissionTelemetry = new PermissionTelemetry();
    this.inferredTelemetry = null;
    this.schemaExporter = new SchemaExporter(this.metadata);

    this.staticData = null;
    this.isInitialized = false;
    this.callbacks = {
      onSample: null,
      onInferred: null,
      onError: null
    };
  }

  /**
   * Initialize and collect static telemetry
   */
  async initialize() {
    if (this.isInitialized) return this.staticData;

    try {
      this.staticData = await this.staticTelemetry.collect();
      this.inferredTelemetry = new InferredTelemetry(
        this.staticData,
        this.continuousTelemetry.getSamples(),
        this.options.continuousInterval
      );

      this.isInitialized = true;

      if (this.options.autoStart) {
        this.start();
      }

      return this.staticData;
    } catch (error) {
      this.handleError('Initialization failed', error);
      throw error;
    }
  }

  /**
   * Start continuous telemetry collection
   */
  start() {
    if (!this.isInitialized) {
      this.initialize().then(() => this.start());
      return;
    }

    this.continuousTelemetry.start();

    // Set up sample callback
    const originalCollect = this.continuousTelemetry.collectSample.bind(this.continuousTelemetry);
    this.continuousTelemetry.collectSample = () => {
      const sample = originalCollect();
      this.onSampleCollected(sample);
      return sample;
    };
  }

  /**
   * Stop continuous telemetry collection
   */
  stop() {
    this.continuousTelemetry.stop();
  }

  /**
   * Handle new sample collection
   */
  onSampleCollected(sample) {
    // Update inferred telemetry with new samples
    if (this.inferredTelemetry) {
      this.inferredTelemetry.continuousSamples = this.continuousTelemetry.getSamples();
      this.inferredTelemetry.setPermissionMetrics(this.permissionTelemetry.getAllMetrics());
    }

    // Trigger callback
    if (this.callbacks.onSample) {
      try {
        this.callbacks.onSample(sample);
      } catch (error) {
        this.handleError('Sample callback error', error);
      }
    }

    // Periodically update inferred telemetry
    const sampleCount = this.continuousTelemetry.getSamples().length;
    if (sampleCount % 5 === 0) { // Every 5 samples
      this.updateInferredTelemetry();
    }
  }

  /**
   * Update inferred telemetry
   */
  updateInferredTelemetry() {
    if (!this.inferredTelemetry) return;

    try {
      const inferred = this.inferredTelemetry.infer();

      if (this.callbacks.onInferred) {
        try {
          this.callbacks.onInferred(inferred);
        } catch (error) {
          this.handleError('Inferred callback error', error);
        }
      }
    } catch (error) {
      this.handleError('Inferred telemetry update failed', error);
    }
  }

  /**
   * Get all collected telemetry
   */
  getAllTelemetry() {
    if (!this.isInitialized) {
      throw new Error('Telemetry not initialized. Call initialize() first.');
    }

    return {
      static: this.staticData,
      continuous: {
        samples: this.continuousTelemetry.getSamples(),
        statistics: this.continuousTelemetry.getStatistics(),
        latest: this.continuousTelemetry.getLatestSample()
      },
      inferred: this.inferredTelemetry ? this.inferredTelemetry.infer() : null,
      metadata: {
        initialized: this.isInitialized,
        startTime: this.continuousTelemetry.startTime,
        sampleCount: this.continuousTelemetry.getSamples().length,
        isRunning: this.continuousTelemetry.isRunning
      }
    };
  }

  /**
   * Get static telemetry only
   */
  getStaticTelemetry() {
    if (!this.isInitialized) {
      return this.staticTelemetry.collect();
    }
    return this.staticData;
  }

  /**
   * Get continuous telemetry samples
   */
  getContinuousTelemetry() {
    return {
      samples: this.continuousTelemetry.getSamples(),
      statistics: this.continuousTelemetry.getStatistics(),
      latest: this.continuousTelemetry.getLatestSample()
    };
  }

  /**
   * Get inferred telemetry
   */
  getInferredTelemetry() {
    if (!this.inferredTelemetry) {
      return null;
    }
    return this.inferredTelemetry.infer();
  }

  /**
   * Register callback for new samples
   */
  onSample(callback) {
    this.callbacks.onSample = callback;
  }

  /**
   * Register callback for inferred telemetry updates
   */
  onInferred(callback) {
    this.callbacks.onInferred = callback;
  }

  /**
   * Register error callback
   */
  onError(callback) {
    this.callbacks.onError = callback;
  }

  /**
   * Handle errors
   */
  handleError(message, error) {
    const errorInfo = {
      message,
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString()
    };

    if (this.callbacks.onError) {
      try {
        this.callbacks.onError(errorInfo);
      } catch (e) {
        console.error('Error callback failed:', e);
      }
    } else {
      console.error('Telemetry error:', errorInfo);
    }
  }

  /**
   * Export telemetry data as JSON
   */
  exportJSON() {
    return JSON.stringify(this.getAllTelemetry(), null, 2);
  }

  /**
   * Export static telemetry as flat schema row
   */
  exportStaticRow() {
    if (!this.staticData) return null;
    return this.schemaExporter.exportStatic(this.staticData);
  }

  /**
   * Export continuous telemetry as flat schema rows
   */
  exportContinuousRows() {
    const samples = this.continuousTelemetry.getSamples();
    const permissionMetrics = this.permissionTelemetry.getAllMetrics();
    const inferred = this.inferredTelemetry ? this.inferredTelemetry.infer() : null;

    return samples.map(sample =>
      this.schemaExporter.exportContinuous(sample, permissionMetrics, inferred)
    );
  }

  /**
   * Export all telemetry as CSV (Excel-ready)
   */
  exportToCSV() {
    const rows = [];

    // Add static row
    const staticRow = this.exportStaticRow();
    if (staticRow) rows.push(staticRow);

    // Add continuous rows
    const continuousRows = this.exportContinuousRows();
    rows.push(...continuousRows);

    return this.schemaExporter.exportToCSV(rows);
  }

  /**
   * Get Excel column headers
   */
  getColumnHeaders() {
    return this.schemaExporter.getColumnHeaders();
  }

  /**
   * Permission-based monitoring controls
   */
  async startCameraMonitoring() {
    await this.permissionTelemetry.startCameraMonitoring();
  }

  stopCameraMonitoring() {
    this.permissionTelemetry.stopCameraMonitoring();
  }

  async startMicrophoneMonitoring() {
    await this.permissionTelemetry.startMicrophoneMonitoring();
  }

  stopMicrophoneMonitoring() {
    this.permissionTelemetry.stopMicrophoneMonitoring();
  }

  async startScreenShareMonitoring() {
    await this.permissionTelemetry.startScreenShareMonitoring();
  }

  stopScreenShareMonitoring() {
    this.permissionTelemetry.stopScreenShareMonitoring();
  }

  async startLocationMonitoring() {
    await this.permissionTelemetry.startLocationMonitoring();
  }

  stopLocationMonitoring() {
    this.permissionTelemetry.stopLocationMonitoring();
  }

  /**
   * Update metadata
   */
  setUserId(userId) {
    this.metadata.setUserId(userId);
  }

  setAgentId(agentId) {
    this.metadata.setAgentId(agentId);
  }

  updateConsent(version, timestamp) {
    this.metadata.updateConsent(version, timestamp);
  }

  /**
   * Reset all telemetry (useful for testing)
   */
  reset() {
    this.stop();
    this.permissionTelemetry.cleanup();
    this.staticData = null;
    this.isInitialized = false;
    this.continuousTelemetry = new ContinuousTelemetry(this.options.continuousInterval);
    this.permissionTelemetry = new PermissionTelemetry();
    this.inferredTelemetry = null;
  }
}

// Export for use in modules or global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TelemetryCollector,
    StaticTelemetry,
    ContinuousTelemetry,
    InferredTelemetry,
    PermissionTelemetry,
    MetadataManager,
    SchemaExporter
  };
}
