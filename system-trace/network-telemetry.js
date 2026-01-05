/**
 * Network & Resource Timing Telemetry Module
 * Per-request timing and transfer details
 */

class NetworkTelemetry {
  constructor() {
    this.resourceTimings = [];
    this.isObserving = false;
    this.observer = null;
  }

  /**
   * Hash URL path (client-side)
   */
  hashUrlPath(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      return this.hashString(path);
    } catch (e) {
      return this.hashString(url);
    }
  }

  /**
   * Simple hash function
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
   * Start observing resource timings
   */
  startObserving() {
    if (this.isObserving) return;

    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'resource') {
              this.processResourceTiming(entry);
            }
          });
        });
        this.observer.observe({ entryTypes: ['resource'] });
        this.isObserving = true;
      } catch (e) {
        // PerformanceObserver not supported
      }
    }

    // Also process existing entries
    this.processExistingResources();
  }

  /**
   * Process existing resource entries
   */
  processExistingResources() {
    const entries = performance.getEntriesByType('resource');
    entries.forEach(entry => {
      this.processResourceTiming(entry);
    });
  }

  /**
   * Process a resource timing entry
   */
  processResourceTiming(entry) {
    // Skip data URLs and same-origin resources that are too small
    if (entry.name.startsWith('data:') || entry.name.startsWith('blob:')) {
      return;
    }

    const timing = entry;
    const detail = entry.detail || {};

    // Determine protocol
    let protocol = 'HTTP/1.1';
    try {
      const url = new URL(timing.name);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        // Try to detect HTTP/2 or HTTP/3
        if (detail.nextHopProtocol) {
          protocol = detail.nextHopProtocol;
        } else if (timing.nextHopProtocol) {
          protocol = timing.nextHopProtocol;
        }
      } else if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        protocol = 'WebSocket';
      }
    } catch (e) {
      // Invalid URL
    }

    // Determine resource type
    const resourceType = this.getResourceType(timing.name, timing.initiatorType);

    // Calculate timing breakdown
    const dns_ms = timing.domainLookupEnd > 0
      ? Math.round(timing.domainLookupEnd - timing.domainLookupStart)
      : 0;

    const connect_ms = timing.connectEnd > 0
      ? Math.round(timing.connectEnd - timing.connectStart)
      : 0;

    const tls_ms = timing.secureConnectionStart > 0
      ? Math.round(timing.connectEnd - timing.secureConnectionStart)
      : 0;

    const request_ms = timing.responseStart > 0
      ? Math.round(timing.responseStart - timing.requestStart)
      : 0;

    const response_ms = timing.responseEnd > 0
      ? Math.round(timing.responseEnd - timing.responseStart)
      : 0;

    const download_ms = timing.responseEnd > 0 && timing.responseStart > 0
      ? Math.round(timing.responseEnd - timing.responseStart)
      : 0;

    const total_ms = timing.duration
      ? Math.round(timing.duration)
      : Math.round(timing.responseEnd - timing.fetchStart);

    // Determine cache status
    const cacheStatus = this.determineCacheStatus(timing);

    // Get transfer sizes
    const transfer_size_kb = timing.transferSize
      ? Math.round((timing.transferSize / 1024) * 100) / 100
      : null;

    const encoded_body_size_kb = timing.encodedBodySize
      ? Math.round((timing.encodedBodySize / 1024) * 100) / 100
      : null;

    const decoded_body_size_kb = timing.decodedBodySize
      ? Math.round((timing.decodedBodySize / 1024) * 100) / 100
      : null;

    const resourceTiming = {
      event: 'resource_timing',
      session_id: this.sessionId,
      protocol: protocol,
      resource_type: resourceType,
      url_path_hash: this.hashUrlPath(timing.name),
      status_code: detail.status || timing.responseStatus || null,
      cache_status: cacheStatus,
      transfer_size_kb: transfer_size_kb,
      encoded_body_size_kb: encoded_body_size_kb,
      decoded_body_size_kb: decoded_body_size_kb,
      dns_ms: dns_ms,
      tls_ms: tls_ms,
      connect_ms: connect_ms,
      request_ms: request_ms,
      response_ms: response_ms,
      download_ms: download_ms,
      total_ms: total_ms,
      save_data_enabled: navigator.connection?.saveData || false,
      timestamp: new Date().toISOString()
    };

    this.resourceTimings.push(resourceTiming);
    return resourceTiming;
  }

  /**
   * Get resource type
   */
  getResourceType(url, initiatorType) {
    if (initiatorType) {
      const typeMap = {
        'xmlhttprequest': 'xhr',
        'fetch': 'xhr',
        'img': 'img',
        'script': 'script',
        'link': 'style',
        'css': 'style',
        'video': 'media',
        'audio': 'media'
      };
      return typeMap[initiatorType] || 'other';
    }

    // Fallback: guess from URL
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.match(/\.(js|mjs)$/)) return 'script';
    if (lowerUrl.match(/\.(css)$/)) return 'style';
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'img';
    if (lowerUrl.match(/\.(mp4|webm|ogg)$/)) return 'media';

    return 'other';
  }

  /**
   * Determine cache status
   */
  determineCacheStatus(timing) {
    if (timing.transferSize === 0 && timing.decodedBodySize > 0) {
      return 'hit';
    }
    if (timing.transferSize > 0 && timing.decodedBodySize === timing.transferSize) {
      return 'miss';
    }
    if (timing.transferSize > 0 && timing.decodedBodySize > timing.transferSize) {
      return 'revalidated';
    }
    return 'unknown';
  }

  /**
   * Get all resource timings
   */
  getResourceTimings() {
    return this.resourceTimings;
  }

  /**
   * Get resource timing summary
   */
  getSummary() {
    if (this.resourceTimings.length === 0) return null;

    const timings = this.resourceTimings;
    const byType = {};
    const byProtocol = {};
    const byCacheStatus = {};

    timings.forEach(t => {
      // By type
      byType[t.resource_type] = (byType[t.resource_type] || 0) + 1;

      // By protocol
      byProtocol[t.protocol] = (byProtocol[t.protocol] || 0) + 1;

      // By cache status
      byCacheStatus[t.cache_status] = (byCacheStatus[t.cache_status] || 0) + 1;
    });

    const avgTotal = timings.reduce((sum, t) => sum + (t.total_ms || 0), 0) / timings.length;
    const avgTransfer = timings
      .filter(t => t.transfer_size_kb !== null)
      .reduce((sum, t) => sum + (t.transfer_size_kb || 0), 0) /
      timings.filter(t => t.transfer_size_kb !== null).length;

    // Calculate cache hit ratio
    const cacheHits = byCacheStatus['hit'] || 0;
    const cacheMisses = byCacheStatus['miss'] || 0;
    const cacheRevalidated = byCacheStatus['revalidated'] || 0;
    const totalCacheable = cacheHits + cacheMisses + cacheRevalidated;
    const cacheHitRatio = totalCacheable > 0 ? cacheHits / totalCacheable : 0;

    // Calculate average status code
    const statusCodes = timings.filter(t => t.status_code !== null).map(t => t.status_code);
    const avgStatusCode = statusCodes.length > 0
      ? Math.round(statusCodes.reduce((sum, code) => sum + code, 0) / statusCodes.length)
      : null;

    // Calculate average timing breakdown
    const avgTiming = {
      dns: 0,
      tls: 0,
      tcp: 0,
      request: 0,
      response: 0,
      total: Math.round(avgTotal)
    };

    let timingCount = 0;
    timings.forEach(t => {
      if (t.dns_ms) {
        avgTiming.dns += t.dns_ms;
        timingCount++;
      }
      if (t.tls_ms) {
        avgTiming.tls += t.tls_ms;
      }
      if (t.connect_ms) {
        avgTiming.tcp += t.connect_ms;
      }
      if (t.request_ms) {
        avgTiming.request += t.request_ms;
      }
      if (t.response_ms) {
        avgTiming.response += t.response_ms;
      }
    });

    if (timingCount > 0) {
      avgTiming.dns = Math.round(avgTiming.dns / timingCount);
      avgTiming.tls = Math.round(avgTiming.tls / timingCount);
      avgTiming.tcp = Math.round(avgTiming.tcp / timingCount);
      avgTiming.request = Math.round(avgTiming.request / timingCount);
      avgTiming.response = Math.round(avgTiming.response / timingCount);
    }

    return {
      total_requests: timings.length,
      avg_total_ms: Math.round(avgTotal),
      avg_transfer_size_kb: Math.round(avgTransfer * 100) / 100,
      cache_hit_ratio: Math.round(cacheHitRatio * 1000) / 1000,
      avg_status_code: avgStatusCode,
      avg_timing: avgTiming,
      by_type: byType,
      by_protocol: byProtocol,
      by_cache_status: byCacheStatus
    };
  }

  /**
   * Stop observing
   */
  stopObserving() {
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch (e) {}
      this.observer = null;
    }
    this.isObserving = false;
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }
}
