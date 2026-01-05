/**
 * Main Telemetry Orchestrator
 * Coordinates static, continuous, and inferred telemetry collection
 */

class TelemetryCollector {
  constructor(options = {}) {
    this.options = {
      continuousInterval: options.continuousInterval || 5000,
      autoStart: options.autoStart !== false,
      ...options
    };

    this.staticTelemetry = new StaticTelemetry();
    this.continuousTelemetry = new ContinuousTelemetry(this.options.continuousInterval);
    this.inferredTelemetry = null;

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
      this.staticData = this.staticTelemetry.collect();
      this.inferredTelemetry = new InferredTelemetry(
        this.staticData,
        this.continuousTelemetry.getSamples()
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
   * Reset all telemetry (useful for testing)
   */
  reset() {
    this.stop();
    this.staticData = null;
    this.isInitialized = false;
    this.continuousTelemetry = new ContinuousTelemetry(this.options.continuousInterval);
    this.inferredTelemetry = null;
  }
}

// Export for use in modules or global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TelemetryCollector, StaticTelemetry, ContinuousTelemetry, InferredTelemetry };
}
