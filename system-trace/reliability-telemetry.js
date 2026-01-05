/**
 * Reliability & Errors Telemetry Module
 * JS errors, network failures, WebSocket/WebRTC disconnects, crashes
 */

class ReliabilityTelemetry {
  constructor() {
    this.errors = [];
    this.networkFailures = [];
    this.websocketDisconnects = [];
    this.webrtcDisconnects = [];
    this.serviceWorkerIssues = [];
    this.crashHints = {
      longTaskMax: 0,
      memPressureEvents: 0,
      tabFreezeCount: 0
    };
    this.isMonitoring = false;
  }

  /**
   * Hash a string
   */
  hashString(str) {
    if (!str) return null;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `h_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Start error monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackJSError(event.error, event.message, event.filename, event.lineno, event.colno);
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackJSError(event.reason, event.reason?.message || 'Unhandled Promise Rejection', null, null, null);
    });

    // Long tasks (crash hints)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            const duration = entry.duration;
            if (duration > this.crashHints.longTaskMax) {
              this.crashHints.longTaskMax = Math.round(duration);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task API not supported
      }
    }

    // Memory pressure (if available)
    if (performance.memory) {
      const checkMemoryPressure = () => {
        const heapUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        if (heapUsage > 0.9) {
          this.crashHints.memPressureEvents++;
        }
      };
      setInterval(checkMemoryPressure, 5000);
    }

    // Tab freeze detection
    let lastFrameTime = performance.now();
    const checkFreeze = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      if (frameTime > 1000) { // More than 1 second = freeze
        this.crashHints.tabFreezeCount++;
      }
      lastFrameTime = now;
      requestAnimationFrame(checkFreeze);
    };
    requestAnimationFrame(checkFreeze);

    this.isMonitoring = true;
  }

  /**
   * Track JavaScript error
   */
  trackJSError(error, message, filename, lineno, colno) {
    const errorMessage = message || error?.message || 'Unknown error';
    const errorStack = error?.stack || '';
    const component = this.extractComponent(filename, errorStack);

    const errorEvent = {
      event: 'error',
      session_id: this.sessionId,
      error_type: 'JS',
      message_hash: this.hashString(errorMessage),
      stack_hash: this.hashString(errorStack),
      component: component,
      fatal: this.isFatalError(error),
      filename: filename || null,
      lineno: lineno || null,
      colno: colno || null,
      timestamp: new Date().toISOString()
    };

    this.errors.push(errorEvent);
    return errorEvent;
  }

  /**
   * Extract component name from stack trace
   */
  extractComponent(filename, stack) {
    if (filename) {
      const match = filename.match(/\/([^\/]+)\.(js|ts|jsx|tsx)/);
      if (match) return match[1];
    }
    if (stack) {
      const lines = stack.split('\n');
      for (const line of lines) {
        const match = line.match(/at\s+(\w+)/);
        if (match) return match[1];
      }
    }
    return 'unknown';
  }

  /**
   * Determine if error is fatal
   */
  isFatalError(error) {
    if (!error) return false;
    const message = error.message || '';
    const fatalPatterns = ['OutOfMemory', 'Maximum call stack', 'Script error'];
    return fatalPatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Track network failure
   */
  trackNetworkFailure(url, statusCode, retryCount = 0, timeoutMs = null, errorType = null) {
    const failure = {
      event: 'network_failure',
      session_id: this.sessionId,
      endpoint_hash: this.hashString(url),
      status_code: statusCode,
      retry_count: retryCount,
      timeout_ms: timeoutMs,
      error_type: errorType || (statusCode >= 500 ? 'server_error' : statusCode >= 400 ? 'client_error' : 'unknown'),
      timestamp: new Date().toISOString()
    };

    this.networkFailures.push(failure);
    return failure;
  }

  /**
   * Track WebSocket disconnect
   */
  trackWebSocketDisconnect(reasonCode, durationSec, state = null) {
    const disconnect = {
      event: 'websocket_disconnect',
      session_id: this.sessionId,
      reason_code: reasonCode,
      duration_sec: durationSec,
      state: state,
      timestamp: new Date().toISOString()
    };

    this.websocketDisconnects.push(disconnect);
    return disconnect;
  }

  /**
   * Track WebRTC disconnect
   */
  trackWebRTCDisconnect(reasonCode, durationSec, iceState = null) {
    const disconnect = {
      event: 'webrtc_disconnect',
      session_id: this.sessionId,
      reason_code: reasonCode,
      duration_sec: durationSec,
      ice_state: iceState,
      timestamp: new Date().toISOString()
    };

    this.webrtcDisconnects.push(disconnect);
    return disconnect;
  }

  /**
   * Track Service Worker issue
   */
  trackServiceWorkerIssue(type, details = {}) {
    const issue = {
      event: 'service_worker_issue',
      session_id: this.sessionId,
      issue_type: type, // 'install_fail', 'activation_fail', 'fetch_fail'
      details: details,
      timestamp: new Date().toISOString()
    };

    this.serviceWorkerIssues.push(issue);
    return issue;
  }

  /**
   * Get all errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get error summary
   */
  getErrorSummary() {
    const byType = {};
    const byComponent = {};
    const fatalCount = this.errors.filter(e => e.fatal).length;

    this.errors.forEach(error => {
      byType[error.error_type] = (byType[error.error_type] || 0) + 1;
      byComponent[error.component] = (byComponent[error.component] || 0) + 1;
    });

    return {
      total_errors: this.errors.length,
      fatal_errors: fatalCount,
      by_type: byType,
      by_component: byComponent
    };
  }

  /**
   * Get network failure summary
   */
  getNetworkFailureSummary() {
    const byStatusCode = {};
    const byErrorType = {};
    let totalRetries = 0;

    this.networkFailures.forEach(failure => {
      byStatusCode[failure.status_code] = (byStatusCode[failure.status_code] || 0) + 1;
      byErrorType[failure.error_type] = (byErrorType[failure.error_type] || 0) + 1;
      totalRetries += failure.retry_count || 0;
    });

    return {
      total_failures: this.networkFailures.length,
      total_retries: totalRetries,
      by_status_code: byStatusCode,
      by_error_type: byErrorType
    };
  }

  /**
   * Get crash hints
   */
  getCrashHints() {
    return {
      long_task_ms_max: this.crashHints.longTaskMax,
      mem_pressure_events: this.crashHints.memPressureEvents,
      tab_freeze_count: this.crashHints.tabFreezeCount
    };
  }

  /**
   * Get all reliability data
   */
  getAllData() {
    return {
      errors: this.errors,
      network_failures: this.networkFailures,
      websocket_disconnects: this.websocketDisconnects,
      webrtc_disconnects: this.webrtcDisconnects,
      service_worker_issues: this.serviceWorkerIssues,
      crash_hints: this.getCrashHints(),
      summary: {
        errors: this.getErrorSummary(),
        network_failures: this.getNetworkFailureSummary()
      }
    };
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }
}
