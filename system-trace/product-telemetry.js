/**
 * Product Outcomes & Engagement Telemetry Module
 * Ties technical metrics to business outcomes
 */

class ProductTelemetry {
  constructor() {
    this.sessionStart = new Date().toISOString();
    this.sessionEnd = null;
    this.events = [];
    this.featureUsage = new Map();
    this.conversionEvents = [];
    this.engagementMetrics = {
      dwellTime: 0,
      scrollDepth: 0,
      clickCount: 0,
      lastActivity: Date.now()
    };
  }

  /**
   * Hash a string (simple hash function for client-side)
   */
  hashString(str) {
    if (!str) return null;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `h_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Set user ID (will be hashed)
   */
  setUserId(userId) {
    this.userIdHash = this.hashString(userId);
  }

  /**
   * Set tenant/account ID
   */
  setTenantId(tenantId) {
    this.tenantId = tenantId;
  }

  /**
   * Track feature usage
   */
  trackFeatureUsed(featureName, metadata = {}) {
    const event = {
      event: 'feature_used',
      user_id_hash: this.userIdHash,
      tenant_id: this.tenantId,
      session_id: this.sessionId,
      feature_used: featureName,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.events.push(event);

    // Track feature usage count
    const count = this.featureUsage.get(featureName) || 0;
    this.featureUsage.set(featureName, count + 1);

    return event;
  }

  /**
   * Track conversion event
   */
  trackConversion(eventName, value = null, metadata = {}) {
    const event = {
      event: 'conversion_event',
      user_id_hash: this.userIdHash,
      tenant_id: this.tenantId,
      session_id: this.sessionId,
      conversion_event: eventName,
      conversion_value: value,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.conversionEvents.push(event);
    this.events.push(event);

    return event;
  }

  /**
   * Update engagement metrics
   */
  updateEngagement(dwellTime = null, scrollDepth = null, clickCount = null) {
    if (dwellTime !== null) {
      this.engagementMetrics.dwellTime = dwellTime;
    }
    if (scrollDepth !== null) {
      this.engagementMetrics.scrollDepth = Math.max(this.engagementMetrics.scrollDepth, scrollDepth);
    }
    if (clickCount !== null) {
      this.engagementMetrics.clickCount += clickCount;
    }
    this.engagementMetrics.lastActivity = Date.now();
  }

  /**
   * Track scroll depth
   */
  trackScroll() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const scrollDepth = scrollHeight > 0 ? (scrolled / scrollHeight) * 100 : 0;
    this.updateEngagement(null, scrollDepth, null);
  }

  /**
   * Track clicks
   */
  trackClick() {
    this.updateEngagement(null, null, 1);
  }

  /**
   * Calculate current dwell time
   */
  calculateDwellTime() {
    return Math.round((Date.now() - new Date(this.sessionStart).getTime()) / 1000);
  }

  /**
   * End session
   */
  endSession() {
    this.sessionEnd = new Date().toISOString();
  }

  /**
   * Get session metrics
   */
  getSessionMetrics() {
    return {
      session_start: this.sessionStart,
      session_end: this.sessionEnd,
      session_duration_sec: this.sessionEnd
        ? Math.round((new Date(this.sessionEnd).getTime() - new Date(this.sessionStart).getTime()) / 1000)
        : this.calculateDwellTime(),
      user_id_hash: this.userIdHash,
      tenant_id: this.tenantId
    };
  }

  /**
   * Get engagement summary
   */
  getEngagementSummary() {
    return {
      dwell_time_sec: this.engagementMetrics.dwellTime || this.calculateDwellTime(),
      scroll_depth_pct: Math.round(this.engagementMetrics.scrollDepth * 100) / 100,
      click_count: this.engagementMetrics.clickCount,
      feature_usage_count: Array.from(this.featureUsage.entries()).map(([feature, count]) => ({
        feature,
        count
      })),
      conversion_events: this.conversionEvents.length,
      conversion_value_total: this.conversionEvents.reduce((sum, e) => sum + (e.conversion_value || 0), 0)
    };
  }

  /**
   * Get all events
   */
  getEvents() {
    return this.events;
  }

  /**
   * Setup automatic tracking
   */
  setupAutoTracking() {
    // Track scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackScroll();
      }, 100);
    });

    // Track clicks
    document.addEventListener('click', () => {
      this.trackClick();
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateEngagement(this.calculateDwellTime(), null, null);
      }
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  /**
   * Set session ID (from metadata manager)
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }
}
