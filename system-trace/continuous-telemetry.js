/**
 * Continuous Telemetry Collection Module
 * Sampled periodically (e.g., every 5-10 seconds)
 */

class ContinuousTelemetry {
  constructor(intervalMs = 5000) {
    this.intervalMs = intervalMs;
    this.intervalId = null;
    this.samples = [];
    this.isRunning = false;
    this.startTime = null;
    this.lastNetworkType = null;
    this.networkChangeCount = 0;
    this.lastSampleTime = null;
    this.longTasksCount = 0;
    this.frameDrops = 0;
    this.lastFrameTime = null;
    this.lastTimerCheck = null;
    this.timerStart = null;
    this.foregroundTime = 0;
    this.backgroundTime = 0;
    this.lastActivityTime = null;
    this.longTaskObserver = null;
    this.rttHistory = [];
    this.focusLossCount = 0;
    this.lastFocusState = null;
    this.lastHeapSize = null;
    this.visibilityData = {
      is_visible: true,
      intersection_ratio: 1.0,
      last_visibility_change: null,
      visibility_history: []
    };
  }

  /**
   * Start continuous monitoring
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();
    this.samples = [];
    this.lastActivityTime = Date.now();

    // Set up long task observer
    this.setupLongTaskObserver();

    // Collect initial sample
    this.collectSample();

    // Set up periodic collection
    this.intervalId = setInterval(() => {
      this.collectSample();
    }, this.intervalMs);

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Stop continuous monitoring
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.longTaskObserver) {
      try {
        this.longTaskObserver.disconnect();
      } catch (e) {}
      this.longTaskObserver = null;
    }
    this.removeEventListeners();
  }

  /**
   * Collect a single sample
   */
  collectSample() {
    const sample = {
      timestamp: new Date().toISOString(),
      elapsed: Date.now() - this.startTime,
      network: this.collectNetworkMetrics(),
      memory: this.collectMemoryMetrics(),
      performance: this.collectPerformanceMetrics(),
      activity: this.collectActivityMetrics(),
      battery: this.collectBatteryMetrics()
    };

    this.samples.push(sample);
    this.lastSampleTime = Date.now();

    return sample;
  }

  /**
   * 4.1 Network Runtime Metrics
   */
  collectNetworkMetrics() {
    const nav = navigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    const result = {
      online: nav.onLine !== false,
      offline: !nav.onLine
    };

    if (connection) {
      result.effectiveConnectionType = connection.effectiveType || null;
      result.rtt = connection.rtt || null;
      result.downlinkSpeed = connection.downlink || null;
      result.saveData = connection.saveData || false;

      // Track RTT jitter
      if (result.rtt !== null) {
        this.rttHistory.push(result.rtt);
        // Keep last 10 samples for jitter calculation
        if (this.rttHistory.length > 10) {
          this.rttHistory.shift();
        }
        result.rttJitter = this.calculateRTTJitter();
      } else {
        result.rttJitter = null;
      }

      // Track network changes
      const currentType = connection.effectiveType;
      if (this.lastNetworkType && this.lastNetworkType !== currentType) {
        this.networkChangeCount++;
      }
      this.lastNetworkType = currentType;
      result.networkChangeCount = this.networkChangeCount;
    } else {
      result.effectiveConnectionType = null;
      result.rtt = null;
      result.rttJitter = null;
      result.downlinkSpeed = null;
      result.saveData = false;
      result.networkChangeCount = this.networkChangeCount;
    }

    // Add speed test results if available
    if (this.speedTest) {
      const speedResult = this.speedTest.getLatestResult();
      if (speedResult) {
        result.download_speed_mbps = speedResult.download_speed_mbps;
        result.upload_speed_mbps = speedResult.upload_speed_mbps;
        result.speed_test_timestamp = speedResult.timestamp;
        result.speed_test_method = speedResult.method;
      }
    }

    return result;
  }

  /**
   * Set speed test instance
   */
  setSpeedTest(speedTest) {
    this.speedTest = speedTest;
  }

  calculateRTTJitter() {
    if (this.rttHistory.length < 2) return null;

    const rtts = this.rttHistory;
    const differences = [];
    for (let i = 1; i < rtts.length; i++) {
      differences.push(Math.abs(rtts[i] - rtts[i - 1]));
    }

    if (differences.length === 0) return null;
    const avgJitter = differences.reduce((a, b) => a + b, 0) / differences.length;
    return Math.round(avgJitter * 100) / 100; // Round to 2 decimals
  }

  /**
   * 4.2 Browser Memory Metrics (Chromium-based)
   */
  collectMemoryMetrics() {
    const result = {
      available: false
    };

    if (performance.memory) {
      result.available = true;
      result.jsHeapLimit = performance.memory.jsHeapSizeLimit || null;
      result.jsHeapLimitMB = result.jsHeapLimit ? Math.round((result.jsHeapLimit / (1024 * 1024)) * 100) / 100 : null;
      result.totalHeapAllocated = performance.memory.totalJSHeapSize || null;
      result.jsHeapTotalMB = result.totalHeapAllocated ? Math.round((result.totalHeapAllocated / (1024 * 1024)) * 100) / 100 : null;
      result.usedHeap = performance.memory.usedJSHeapSize || null;
      result.jsHeapUsedMB = result.usedHeap ? Math.round((result.usedHeap / (1024 * 1024)) * 100) / 100 : null;

      // Calculate heap growth in MB if we have previous sample
      if (this.lastHeapSize !== null) {
        const heapDelta = result.usedHeap - this.lastHeapSize;
        result.heapGrowthMB = Math.round((heapDelta / (1024 * 1024)) * 100) / 100; // MB
      } else {
        result.heapGrowthMB = 0;
      }
      this.lastHeapSize = result.usedHeap;
    }

    return result;
  }

  /**
   * 4.3 Performance & Load Indicators
   */
  collectPerformanceMetrics() {
    const timerMetrics = this.measureTimerDrift();
    const result = {
      eventLoopDelay: this.measureEventLoopDelay(),
      longTasksCount: this.getLongTasksCount(),
      frameDrops: this.detectFrameDrops(),
      timerDrift: timerMetrics.drift,
      timerThrottlingDetected: timerMetrics.throttlingDetected,
      responsivenessScore: this.calculateResponsivenessScore()
    };

    return result;
  }

  measureEventLoopDelay() {
    // Synchronous approximation - measure immediate setTimeout delay
    const start = performance.now();
    // Use a microtask to approximate event loop delay
    // This is a simplified measurement
    return Math.max(0, 0); // Placeholder - would need async measurement
  }

  getLongTasksCount() {
    // Return current count (observer updates it)
    return this.longTasksCount || 0;
  }

  setupLongTaskObserver() {
    // Use PerformanceObserver if available
    if ('PerformanceObserver' in window && !this.longTaskObserver) {
      try {
        this.longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          this.longTasksCount = (this.longTasksCount || 0) + entries.length;
        });
        this.longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task API not available or already observing
      }
    }
  }

  detectFrameDrops() {
    // Simplified frame drop detection
    // In a real implementation, use requestAnimationFrame timing
    if (!this.lastFrameTime) {
      this.lastFrameTime = performance.now();
      this.frameDrops = 0;
      return 0;
    }

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    const expectedFrameTime = 1000 / 60; // 60fps

    if (frameTime > expectedFrameTime * 1.5) {
      this.frameDrops = (this.frameDrops || 0) + 1;
    }

    this.lastFrameTime = now;
    return this.frameDrops || 0;
  }

  measureTimerDrift() {
    if (!this.lastTimerCheck) {
      this.lastTimerCheck = Date.now();
      this.timerStart = Date.now();
      return { drift: 0, throttlingDetected: false };
    }

    const now = Date.now();
    const expected = this.lastTimerCheck + this.intervalMs;
    const drift = now - expected;

    // Detect throttling (significant positive drift)
    const throttlingDetected = drift > 100; // More than 100ms drift indicates throttling

    this.lastTimerCheck = now;
    return { drift, throttlingDetected };
  }

  calculateResponsivenessScore() {
    // Simplified responsiveness score (0-100)
    // Based on event loop delay, frame drops, and memory pressure
    let score = 100;

    // This would be calculated from actual metrics
    // For now, return a placeholder
    return score;
  }

  /**
   * 4.4 Page & User Activity
   */
  collectActivityMetrics() {
    const hasFocus = document.hasFocus();
    const isVisible = !document.hidden;

    // Track focus loss
    if (this.lastFocusState !== null && this.lastFocusState === true && hasFocus === false) {
      this.focusLossCount++;
    }
    this.lastFocusState = hasFocus;

    const result = {
      tabVisibility: isVisible ? 'visible' : 'hidden',
      windowHasFocus: hasFocus,
      foregroundTime: null,
      backgroundTime: null,
      idleDuration: this.calculateIdleDuration(),
      focusLossCount: this.focusLossCount
    };

    // Calculate foreground/background time
    if (this.samples.length > 0) {
      const prevSample = this.samples[this.samples.length - 1];
      const timeDelta = this.intervalMs / 1000;

      if (prevSample.activity) {
        if (prevSample.activity.tabVisibility === 'visible') {
          this.foregroundTime = (this.foregroundTime || 0) + timeDelta;
        } else {
          this.backgroundTime = (this.backgroundTime || 0) + timeDelta;
        }
      }
    } else {
      this.foregroundTime = 0;
      this.backgroundTime = 0;
    }

    result.foregroundTime = Math.round((this.foregroundTime || 0) * 100) / 100;
    result.backgroundTime = Math.round((this.backgroundTime || 0) * 100) / 100;
    result.idleDuration = Math.round((result.idleDuration || 0) * 100) / 100;

    // Include visibility data if available
    if (this.visibilityData) {
      result.visibility = {
        is_visible: this.visibilityData.is_visible,
        intersection_ratio: this.visibilityData.intersection_ratio,
        last_visibility_change: this.visibilityData.last_visibility_change
      };
    }

    return result;
  }

  /**
   * Track visibility changes from IntersectionObserver
   */
  trackVisibility(data) {
    if (!data) return;

    this.visibilityData.is_visible = data.is_visible !== undefined ? data.is_visible : this.visibilityData.is_visible;
    this.visibilityData.intersection_ratio = data.intersection_ratio !== undefined
      ? data.intersection_ratio
      : this.visibilityData.intersection_ratio;
    this.visibilityData.last_visibility_change = new Date().toISOString();

    // Store bounding rect if provided
    if (data.bounding_rect) {
      this.visibilityData.last_bounding_rect = data.bounding_rect;
    }

    // Keep history (last 10 entries)
    this.visibilityData.visibility_history.push({
      is_visible: this.visibilityData.is_visible,
      intersection_ratio: this.visibilityData.intersection_ratio,
      timestamp: this.visibilityData.last_visibility_change
    });
    if (this.visibilityData.visibility_history.length > 10) {
      this.visibilityData.visibility_history.shift();
    }
  }

  calculateIdleDuration() {
    if (!this.lastActivityTime) {
      this.lastActivityTime = Date.now();
      return 0;
    }

    const now = Date.now();
    const idle = (now - this.lastActivityTime) / 1000; // seconds
    return idle;
  }

  /**
   * 4.5 Battery Metrics (If Supported)
   */
  collectBatteryMetrics() {
    const result = {
      available: false
    };

    // Battery API is async, so we'll update it asynchronously
    // but return a placeholder immediately
    if ('getBattery' in navigator && !this.batteryPromise) {
      this.batteryPromise = navigator.getBattery().then(battery => {
        this.cachedBattery = {
          available: true,
          batteryLevel: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };

        // Calculate drain rate if we have previous sample
        if (this.samples.length > 0) {
          const prevSample = this.samples[this.samples.length - 1];
          if (prevSample.battery && prevSample.battery.available && prevSample.battery.batteryLevel) {
            const timeDelta = this.intervalMs / 1000 / 3600; // hours
            const levelDelta = (prevSample.battery.batteryLevel - this.cachedBattery.batteryLevel) / 100;
            if (timeDelta > 0 && !battery.charging) {
              this.cachedBattery.drainRate = levelDelta / timeDelta; // per hour
            }
          }
        }

        return this.cachedBattery;
      }).catch(() => {
        this.cachedBattery = { available: false };
        return this.cachedBattery;
      });
    }

    // Return cached battery data if available, otherwise return placeholder
    if (this.cachedBattery) {
      return { ...this.cachedBattery };
    }

    return result;
  }

  /**
   * Set up event listeners for activity tracking
   */
  setupEventListeners() {
    this.handleVisibilityChange = () => {
      // Visibility change handled in collectSample
    };

    this.handleFocus = () => {
      this.lastActivityTime = Date.now();
    };

    this.handleBlur = () => {
      // Blur handled in collectSample
    };

    this.handleActivity = () => {
      this.lastActivityTime = Date.now();
    };

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('mousemove', this.handleActivity);
    document.addEventListener('keydown', this.handleActivity);
    document.addEventListener('touchstart', this.handleActivity);
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    if (this.handleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (this.handleFocus) {
      window.removeEventListener('focus', this.handleFocus);
    }
    if (this.handleBlur) {
      window.removeEventListener('blur', this.handleBlur);
    }
    if (this.handleActivity) {
      document.removeEventListener('mousemove', this.handleActivity);
      document.removeEventListener('keydown', this.handleActivity);
      document.removeEventListener('touchstart', this.handleActivity);
    }
  }

  /**
   * Get all collected samples
   */
  getSamples() {
    return this.samples;
  }

  /**
   * Get latest sample
   */
  getLatestSample() {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;
  }

  /**
   * Get aggregated statistics
   */
  getStatistics() {
    if (this.samples.length === 0) return null;

    const stats = {
      totalSamples: this.samples.length,
      duration: Date.now() - this.startTime,
      network: this.aggregateNetworkStats(),
      memory: this.aggregateMemoryStats(),
      performance: this.aggregatePerformanceStats(),
      activity: this.aggregateActivityStats()
    };

    return stats;
  }

  aggregateNetworkStats() {
    const onlineSamples = this.samples.filter(s => s.network.online).length;
    return {
      onlinePercentage: (onlineSamples / this.samples.length) * 100,
      networkChanges: this.networkChangeCount,
      avgRTT: this.average(this.samples.map(s => s.network.rtt).filter(v => v !== null)),
      avgDownlink: this.average(this.samples.map(s => s.network.downlinkSpeed).filter(v => v !== null))
    };
  }

  aggregateMemoryStats() {
    const memorySamples = this.samples.filter(s => s.memory.available);
    if (memorySamples.length === 0) return null;

    return {
      avgUsedHeap: this.average(memorySamples.map(s => s.memory.usedHeap)),
      maxUsedHeap: Math.max(...memorySamples.map(s => s.memory.usedHeap)),
      avgHeapGrowthRate: this.average(memorySamples.map(s => s.memory.heapGrowthRate || 0))
    };
  }

  aggregatePerformanceStats() {
    return {
      avgEventLoopDelay: this.average(this.samples.map(s => s.performance.eventLoopDelay || 0)),
      totalLongTasks: this.longTasksCount || 0,
      totalFrameDrops: this.frameDrops || 0
    };
  }

  aggregateActivityStats() {
    const visibleSamples = this.samples.filter(s => s.activity.tabVisibility === 'visible').length;
    return {
      visibilityPercentage: (visibleSamples / this.samples.length) * 100,
      totalForegroundTime: this.foregroundTime || 0,
      totalBackgroundTime: this.backgroundTime || 0
    };
  }

  average(arr) {
    if (arr.length === 0) return null;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
  }
}
