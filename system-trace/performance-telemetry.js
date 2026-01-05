/**
 * Front-End Performance Telemetry Module
 * Core Web Vitals + Navigation Timings + App-Specific Timings
 */

class PerformanceTelemetry {
  constructor() {
    this.coreWebVitals = {};
    this.navigationTimings = {};
    this.appTimings = {};
    this.observers = [];
    this.isObserving = false;
  }

  /**
   * Initialize performance monitoring
   */
  async initialize() {
    // Wait for page load
    if (document.readyState === 'complete') {
      this.collectNavigationTimings();
    } else {
      window.addEventListener('load', () => {
        this.collectNavigationTimings();
      });
    }

    // Start Core Web Vitals observation
    this.observeCoreWebVitals();
  }

  /**
   * Collect Core Web Vitals
   */
  observeCoreWebVitals() {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.coreWebVitals.LCP_ms = Math.round(lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        // LCP not supported
      }

      // INP (Interaction to Next Paint) - simplified version
      try {
        const inpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'first-input' || entry.entryType === 'event') {
              const inp = entry.processingStart - entry.startTime;
              if (!this.coreWebVitals.INP_ms || inp < this.coreWebVitals.INP_ms) {
                this.coreWebVitals.INP_ms = Math.round(inp);
              }
            }
          });
        });
        inpObserver.observe({ entryTypes: ['first-input', 'event'] });
        this.observers.push(inpObserver);
      } catch (e) {
        // INP not fully supported
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.coreWebVitals.CLS = Math.round(clsValue * 1000) / 1000;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        // CLS not supported
      }
    }
  }

  /**
   * Collect Navigation Timings
   */
  collectNavigationTimings() {
    if (!performance.timing) return;

    const timing = performance.timing;
    const navigation = performance.getEntriesByType('navigation')[0];

    if (navigation) {
      this.navigationTimings = {
        TTFB_ms: Math.round(navigation.responseStart - navigation.requestStart),
        FCP_ms: this.getFCP(),
        DOMContentLoaded_ms: Math.round(timing.domContentLoadedEventEnd - timing.navigationStart),
        Load_ms: Math.round(timing.loadEventEnd - timing.navigationStart)
      };
    } else if (timing) {
      // Fallback for older browsers
      this.navigationTimings = {
        TTFB_ms: Math.round(timing.responseStart - timing.requestStart),
        FCP_ms: null,
        DOMContentLoaded_ms: Math.round(timing.domContentLoadedEventEnd - timing.navigationStart),
        Load_ms: Math.round(timing.loadEventEnd - timing.navigationStart)
      };
    }
  }

  /**
   * Get First Contentful Paint
   */
  getFCP() {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? Math.round(fcpEntry.startTime) : null;
  }

  /**
   * Track app-specific timing
   */
  trackAppTiming(name, startTime, endTime = null) {
    if (!this.appTimings[name]) {
      this.appTimings[name] = [];
    }

    const duration = endTime
      ? Math.round(endTime - startTime)
      : Math.round(performance.now() - startTime);

    this.appTimings[name].push({
      duration,
      timestamp: new Date().toISOString()
    });

    return duration;
  }

  /**
   * Mark time to interactive
   */
  markTimeToInteractive() {
    if (document.readyState === 'complete') {
      const tti = performance.timing
        ? Math.round(performance.timing.domInteractive - performance.timing.navigationStart)
        : null;

      if (tti) {
        this.appTimings.time_to_interactive_ms = tti;
      }
    }
  }

  /**
   * Track route change (for SPAs)
   */
  trackRouteChange(route, startTime = null) {
    const changeStart = startTime || performance.now();

    // Wait for route to be ready
    setTimeout(() => {
      const duration = Math.round(performance.now() - changeStart);
      this.trackAppTiming('route_change_ms', changeStart, performance.now());
    }, 100);
  }

  /**
   * Track first meaningful action
   */
  trackFirstMeaningfulAction(actionName, startTime = null) {
    if (!this.appTimings.first_meaningful_action_ms) {
      const actionStart = startTime || performance.timing?.navigationStart || 0;
      const duration = Math.round(performance.now() - actionStart);
      this.appTimings.first_meaningful_action_ms = {
        action: actionName,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all performance metrics
   */
  getMetrics() {
    return {
      core_web_vitals: {
        LCP_ms: this.coreWebVitals.LCP_ms || null,
        INP_ms: this.coreWebVitals.INP_ms || null,
        CLS: this.coreWebVitals.CLS || null
      },
      navigation_timings: this.navigationTimings,
      app_timings: this.appTimings
    };
  }

  /**
   * Get performance event for export
   */
  getPerformanceEvent(route = null) {
    const metrics = this.getMetrics();
    return {
      event: 'performance_timing',
      session_id: this.sessionId,
      TTFB_ms: metrics.navigation_timings.TTFB_ms,
      FCP_ms: metrics.navigation_timings.FCP_ms,
      LCP_ms: metrics.core_web_vitals.LCP_ms,
      INP_ms: metrics.core_web_vitals.INP_ms,
      CLS: metrics.core_web_vitals.CLS,
      DOMContentLoaded_ms: metrics.navigation_timings.DOMContentLoaded_ms,
      Load_ms: metrics.navigation_timings.Load_ms,
      time_to_interactive_ms: metrics.app_timings.time_to_interactive_ms || null,
      route_change_ms: metrics.app_timings.route_change_ms?.[metrics.app_timings.route_change_ms.length - 1]?.duration || null,
      first_meaningful_action_ms: metrics.app_timings.first_meaningful_action_ms?.duration || null,
      route: route || window.location.pathname,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (e) {}
    });
    this.observers = [];
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }
}
