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
    this.productTelemetry = new ProductTelemetry();
    this.performanceTelemetry = new PerformanceTelemetry();
    this.networkTelemetry = new NetworkTelemetry();
    this.reliabilityTelemetry = new ReliabilityTelemetry();
    this.mediaTelemetry = new MediaTelemetry();
    this.environmentTelemetry = new EnvironmentTelemetry();
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
      // Set session IDs
      const sessionId = this.metadata.sessionId;
      this.productTelemetry.setSessionId(sessionId);
      this.performanceTelemetry.setSessionId(sessionId);
      this.networkTelemetry.setSessionId(sessionId);
      this.reliabilityTelemetry.setSessionId(sessionId);
      this.mediaTelemetry.setSessionId(sessionId);
      this.environmentTelemetry.setSessionId(sessionId);

      // Collect static data
      this.staticData = await this.staticTelemetry.collect();

      // Collect environment data
      this.environmentTelemetry.collect();

      // Initialize performance monitoring
      await this.performanceTelemetry.initialize();

      // Start network monitoring
      this.networkTelemetry.startObserving();

      // Start reliability monitoring
      this.reliabilityTelemetry.startMonitoring();

      // Setup product telemetry auto-tracking
      this.productTelemetry.setupAutoTracking();

      // Initialize inferred telemetry
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

    // Get extended telemetry data
    const perfMetrics = this.performanceTelemetry.getMetrics();
    const perfEvent = this.performanceTelemetry.getPerformanceEvent();
    const networkSummary = this.networkTelemetry.getSummary();
    const productSession = this.productTelemetry.getSessionMetrics();
    const productEngagement = this.productTelemetry.getEngagementSummary();
    const environmentData = this.environmentTelemetry.getData();

    // Prepare performance data
    const performanceData = {
      LCP_ms: perfEvent.LCP_ms,
      INP_ms: perfEvent.INP_ms,
      CLS: perfEvent.CLS,
      TTFB_ms: perfEvent.TTFB_ms,
      FCP_ms: perfEvent.FCP_ms,
      DOMContentLoaded_ms: perfEvent.DOMContentLoaded_ms,
      Load_ms: perfEvent.Load_ms,
      time_to_interactive_ms: perfEvent.time_to_interactive_ms
    };

    // Prepare network data with cache hit ratio
    const networkData = networkSummary ? {
      ...networkSummary,
      cache_hit_ratio: networkSummary.by_cache_status && networkSummary.total_requests > 0
        ? (networkSummary.by_cache_status.hit || 0) / networkSummary.total_requests
        : null,
      avg_status_code: null
    } : null;

    // Prepare product data
    const productData = {
      user_id_hash: productSession.user_id_hash,
      tenant_id: productSession.tenant_id,
      session_start: productSession.session_start,
      session_end: productSession.session_end,
      session_duration_sec: productSession.session_duration_sec,
      latest_feature_used: this.productTelemetry.getEvents()
        .filter(e => e.event === 'feature_used')
        .slice(-1)[0]?.feature_used || null,
      latest_conversion_event: this.productTelemetry.getEvents()
        .filter(e => e.event === 'conversion_event')
        .slice(-1)[0]?.conversion_event || null,
      latest_conversion_value: this.productTelemetry.getEvents()
        .filter(e => e.event === 'conversion_event')
        .slice(-1)[0]?.conversion_value || null,
      dwell_time_sec: productEngagement.dwell_time_sec,
      scroll_depth_pct: productEngagement.scroll_depth_pct,
      click_count: productEngagement.click_count
    };

    // Prepare environment data (stabilized fields)
    const envData = {
      browser_name: environmentData.browser_name,
      browser_version: environmentData.browser_version,
      gpu_renderer: this.staticData?.device?.gpuRenderer || null,
      device_class: environmentData.device_class,
      hardware_acceleration: environmentData.hardware_acceleration,
      renderer_path: environmentData.renderer_path,
      platform: this.staticData?.device?.platform || null,
      architecture: this.staticData?.device?.architecture || null
    };

    return samples.map(sample =>
      this.schemaExporter.exportContinuous(
        sample,
        permissionMetrics,
        inferred,
        performanceData,
        networkData,
        productData,
        envData,
        this.staticData // Pass static data to fill in continuous records
      )
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
   * Get all telemetry data including new modules
   */
  getAllTelemetryExtended() {
    if (!this.isInitialized) {
      throw new Error('Telemetry not initialized. Call initialize() first.');
    }

    return {
      ...this.getAllTelemetry(),
      product: {
        session: this.productTelemetry.getSessionMetrics(),
        engagement: this.productTelemetry.getEngagementSummary(),
        events: this.productTelemetry.getEvents()
      },
      performance: this.performanceTelemetry.getMetrics(),
      network: {
        resource_timings: this.networkTelemetry.getResourceTimings(),
        summary: this.networkTelemetry.getSummary()
      },
      reliability: this.reliabilityTelemetry.getAllData(),
      media: {
        webrtc: this.mediaTelemetry.getWebRTCStats(),
        playback: this.mediaTelemetry.getPlaybackStats()
      },
      environment: this.environmentTelemetry.getData()
    };
  }

  /**
   * Track feature usage
   */
  trackFeature(featureName, metadata = {}) {
    return this.productTelemetry.trackFeatureUsed(featureName, metadata);
  }

  /**
   * Track conversion
   */
  trackConversion(eventName, value = null, metadata = {}) {
    return this.productTelemetry.trackConversion(eventName, value, metadata);
  }

  /**
   * Start WebRTC monitoring
   */
  startWebRTCMonitoring(peerConnection, intervalMs = 10000) {
    this.mediaTelemetry.startWebRTCCollection(peerConnection, intervalMs);
  }

  /**
   * Stop WebRTC monitoring
   */
  stopWebRTCMonitoring() {
    this.mediaTelemetry.stopWebRTCCollection();
  }

  /**
   * Track playback
   */
  trackPlayback(mediaElement, metadata = {}) {
    return this.mediaTelemetry.trackPlayback(mediaElement, metadata);
  }

  /**
   * Reset all telemetry (useful for testing)
   */
  reset() {
    this.stop();
    this.permissionTelemetry.cleanup();
    this.performanceTelemetry.cleanup();
    this.networkTelemetry.stopObserving();
    this.mediaTelemetry.stopWebRTCCollection();
    this.staticData = null;
    this.isInitialized = false;
    this.continuousTelemetry = new ContinuousTelemetry(this.options.continuousInterval);
    this.permissionTelemetry = new PermissionTelemetry();
    this.productTelemetry = new ProductTelemetry();
    this.performanceTelemetry = new PerformanceTelemetry();
    this.networkTelemetry = new NetworkTelemetry();
    this.reliabilityTelemetry = new ReliabilityTelemetry();
    this.mediaTelemetry = new MediaTelemetry();
    this.environmentTelemetry = new EnvironmentTelemetry();
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
    ProductTelemetry,
    PerformanceTelemetry,
    NetworkTelemetry,
    ReliabilityTelemetry,
    MediaTelemetry,
    EnvironmentTelemetry,
    MetadataManager,
    SchemaExporter
  };
}
