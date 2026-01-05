/**
 * Enhanced Telemetry Collection Module
 * Integrates external libraries and more accurate collection techniques
 */

class EnhancedTelemetryCollector {
  constructor(baseTelemetry) {
    this.telemetry = baseTelemetry;
    this.enhancements = {
      webVitals: null,
      uaParser: null,
      fingerprint: null,
      observers: []
    };
  }

  /**
   * Initialize enhanced collection
   */
  async initialize() {
    // Load external libraries if available
    await this.loadExternalLibraries();

    // Setup enhanced observers
    this.setupEnhancedObservers();

    // Enhance existing telemetry
    this.enhanceBrowserDetection();
    this.enhancePerformanceMetrics();
    this.enhanceMemoryMetrics();
    this.enhanceNetworkMetrics();
  }

  /**
   * Load external libraries dynamically
   */
  async loadExternalLibraries() {
    // Load web-vitals if available
    if (typeof webVitals !== 'undefined') {
      this.enhancements.webVitals = webVitals;
      this.setupWebVitals();
    }

    // Load UAParser if available
    if (typeof UAParser !== 'undefined') {
      this.enhancements.uaParser = new UAParser();
      this.enhanceBrowserDetection();
    }

    // Load FingerprintJS if available
    if (typeof FingerprintJS !== 'undefined') {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        this.enhancements.fingerprint = result;
        this.telemetry.staticData.fingerprint = {
          visitorId: result.visitorId,
          confidence: result.confidence?.score || null,
          components: Object.keys(result.components).length
        };
      } catch (e) {
        // FingerprintJS failed
      }
    }
  }

  /**
   * Setup enhanced Web Vitals collection
   */
  setupWebVitals() {
    if (!this.enhancements.webVitals) return;

    const { onLCP, onINP, onCLS, onFCP, onTTFB } = this.enhancements.webVitals;

    onLCP((metric) => {
      this.telemetry.performanceTelemetry.coreWebVitals.LCP_ms = Math.round(metric.value);
      this.telemetry.performanceTelemetry.coreWebVitals.LCP_element = metric.attribution?.element || null;
      this.telemetry.performanceTelemetry.coreWebVitals.LCP_url = metric.attribution?.url || null;
    });

    onINP((metric) => {
      this.telemetry.performanceTelemetry.coreWebVitals.INP_ms = Math.round(metric.value);
      this.telemetry.performanceTelemetry.coreWebVitals.INP_interactionType = metric.attribution?.interactionType || null;
      this.telemetry.performanceTelemetry.coreWebVitals.INP_eventTarget = metric.attribution?.eventTarget || null;
    });

    onCLS((metric) => {
      this.telemetry.performanceTelemetry.coreWebVitals.CLS = Math.round(metric.value * 1000) / 1000;
      this.telemetry.performanceTelemetry.coreWebVitals.CLS_sources = metric.attribution?.sources?.length || 0;
    });

    onFCP((metric) => {
      this.telemetry.performanceTelemetry.navigationTimings.FCP_ms = Math.round(metric.value);
    });

    onTTFB((metric) => {
      this.telemetry.performanceTelemetry.navigationTimings.TTFB_ms = Math.round(metric.value);
    });
  }

  /**
   * Enhance browser detection with UAParser
   */
  enhanceBrowserDetection() {
    if (!this.enhancements.uaParser) return;

    const result = this.enhancements.uaParser.getResult();
    const staticData = this.telemetry.staticData;

    if (staticData && staticData.browser) {
      // Override with more accurate data
      staticData.browser.browserName = result.browser.name || staticData.browser.browserVersion?.name;
      staticData.browser.browserVersion = result.browser.version || staticData.browser.browserVersion?.major;
      staticData.browser.browserMajor = result.browser.major;
      staticData.browser.engine = result.engine.name || staticData.browser.renderingEngine;
      staticData.browser.engineVersion = result.engine.version;
    }

    if (staticData && staticData.device) {
      staticData.device.osName = result.os.name;
      staticData.device.osVersion = result.os.version;
      staticData.device.deviceModel = result.device.model;
      staticData.device.deviceType = result.device.type;
      staticData.device.deviceVendor = result.device.vendor;
    }
  }

  /**
   * Setup enhanced observers
   */
  setupEnhancedObservers() {
    // Intersection Observer for accurate visibility
    if ('IntersectionObserver' in window) {
      const visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          this.telemetry.continuousTelemetry.trackVisibility({
            is_visible: entry.isIntersecting,
            intersection_ratio: Math.round(entry.intersectionRatio * 100) / 100,
            bounding_rect: {
              top: Math.round(entry.boundingClientRect.top),
              left: Math.round(entry.boundingClientRect.left),
              width: Math.round(entry.boundingClientRect.width),
              height: Math.round(entry.boundingClientRect.height)
            }
          });
        });
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

      visibilityObserver.observe(document.body);
      this.enhancements.observers.push(visibilityObserver);
    }

    // Mutation Observer for DOM changes
    if ('MutationObserver' in window) {
      const mutationObserver = new MutationObserver((mutations) => {
        let domChanges = 0;
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            domChanges++;
          }
        });
        if (domChanges > 0) {
          this.telemetry.performanceTelemetry.trackDOMMutation(domChanges);
        }
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'width', 'height']
      });
      this.enhancements.observers.push(mutationObserver);
    }

    // Reporting Observer for browser violations
    if ('ReportingObserver' in window) {
      try {
        const reportingObserver = new ReportingObserver((reports) => {
          reports.forEach(report => {
            this.telemetry.reliabilityTelemetry.trackBrowserReport({
              type: report.type,
              url: report.url,
              body: report.body
            });
          });
        }, {
          types: ['deprecation', 'intervention', 'crash']
        });

        reportingObserver.observe();
        this.enhancements.observers.push(reportingObserver);
      } catch (e) {
        // ReportingObserver not fully supported
      }
    }
  }

  /**
   * Enhance performance metrics with detailed navigation timing
   */
  enhancePerformanceMetrics() {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return;

    const perfData = {
      dns_lookup_ms: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcp_connect_ms: Math.round(nav.connectEnd - nav.connectStart),
      tls_handshake_ms: nav.secureConnectionStart > 0
        ? Math.round(nav.connectEnd - nav.secureConnectionStart)
        : 0,
      server_response_ms: Math.round(nav.responseStart - nav.requestStart),
      content_download_ms: Math.round(nav.responseEnd - nav.responseStart),
      redirect_time_ms: Math.round(nav.redirectEnd - nav.redirectStart),
      dom_processing_ms: Math.round(nav.domComplete - nav.domInteractive),
      dom_interactive_ms: Math.round(nav.domInteractive - nav.domLoading),
      dom_complete_ms: Math.round(nav.domComplete - nav.domLoading),
      load_event_ms: Math.round(nav.loadEventEnd - nav.loadEventStart),
      total_page_load_ms: Math.round(nav.loadEventEnd - nav.fetchStart)
    };

    if (this.telemetry.performanceTelemetry) {
      this.telemetry.performanceTelemetry.navigationTimings = {
        ...this.telemetry.performanceTelemetry.navigationTimings,
        ...perfData
      };
    }
  }

  /**
   * Enhance memory metrics with detailed breakdown
   */
  enhanceMemoryMetrics() {
    if (!performance.memory) return;

    const mem = performance.memory;
    const enhanced = {
      js_heap_size_limit: mem.jsHeapSizeLimit,
      total_js_heap_size: mem.totalJSHeapSize,
      used_js_heap_size: mem.usedJSHeapSize,
      heap_usage_percent: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100 * 100) / 100,
      available_heap: mem.jsHeapSizeLimit - mem.usedJSHeapSize,
      heap_pressure: mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.9 ? 'High' :
                     mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.7 ? 'Medium' : 'Low'
    };

    // Store in continuous telemetry for tracking
    if (this.telemetry.continuousTelemetry) {
      this.telemetry.continuousTelemetry.enhancedMemory = enhanced;
    }
  }

  /**
   * Enhance network metrics with detailed resource timing
   */
  enhanceNetworkMetrics() {
    const resources = performance.getEntriesByType('resource');
    const networkMetrics = {
      total_requests: resources.length,
      by_type: {},
      by_protocol: {},
      avg_timing: {
        dns: 0,
        tcp: 0,
        tls: 0,
        request: 0,
        response: 0,
        total: 0
      }
    };

    let dnsSum = 0, tcpSum = 0, tlsSum = 0, reqSum = 0, respSum = 0, totalSum = 0;
    let count = 0;

    resources.forEach(resource => {
      // Type distribution
      const type = resource.initiatorType || 'other';
      networkMetrics.by_type[type] = (networkMetrics.by_type[type] || 0) + 1;

      // Protocol detection
      try {
        const url = new URL(resource.name);
        const protocol = url.protocol.replace(':', '');
        networkMetrics.by_protocol[protocol] = (networkMetrics.by_protocol[protocol] || 0) + 1;
      } catch (e) {}

      // Timing averages
      if (resource.domainLookupEnd > 0) {
        dnsSum += resource.domainLookupEnd - resource.domainLookupStart;
        count++;
      }
      if (resource.connectEnd > 0) {
        tcpSum += resource.connectEnd - resource.connectStart;
        if (resource.secureConnectionStart > 0) {
          tlsSum += resource.connectEnd - resource.secureConnectionStart;
        }
      }
      if (resource.responseStart > 0) {
        reqSum += resource.responseStart - resource.requestStart;
      }
      if (resource.responseEnd > 0) {
        respSum += resource.responseEnd - resource.responseStart;
        totalSum += resource.duration || (resource.responseEnd - resource.fetchStart);
      }
    });

    if (count > 0) {
      networkMetrics.avg_timing = {
        dns: Math.round(dnsSum / count),
        tcp: Math.round(tcpSum / count),
        tls: Math.round(tlsSum / count),
        request: Math.round(reqSum / count),
        response: Math.round(respSum / count),
        total: Math.round(totalSum / count)
      };
    }

    if (this.telemetry.networkTelemetry) {
      this.telemetry.networkTelemetry.enhancedMetrics = networkMetrics;
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usage_details: estimate.usageDetails || {},
          usage_percent: estimate.quota > 0
            ? Math.round((estimate.usage / estimate.quota) * 100 * 100) / 100
            : null
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Track battery with event listeners
   */
  async setupBatteryTracking() {
    if (!navigator.getBattery) return;

    try {
      const battery = await navigator.getBattery();

      battery.addEventListener('chargingchange', () => {
        this.telemetry.continuousTelemetry.batteryMetrics.charging = battery.charging;
      });

      battery.addEventListener('levelchange', () => {
        this.telemetry.continuousTelemetry.batteryMetrics.level = Math.round(battery.level * 100);
      });

      battery.addEventListener('chargingtimechange', () => {
        this.telemetry.continuousTelemetry.batteryMetrics.chargingTime = battery.chargingTime;
      });

      battery.addEventListener('dischargingtimechange', () => {
        this.telemetry.continuousTelemetry.batteryMetrics.dischargingTime = battery.dischargingTime;
      });

      // Initial state
      this.telemetry.continuousTelemetry.batteryMetrics = {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    } catch (e) {
      // Battery API not available
    }
  }

  /**
   * Use Beacon API for reliable transmission
   */
  sendTelemetry(data, endpoint) {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      return navigator.sendBeacon(endpoint, blob);
    } else {
      // Fallback to fetch with keepalive
      return fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    }
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.enhancements.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (e) {}
    });
    this.enhancements.observers = [];
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedTelemetryCollector };
}
