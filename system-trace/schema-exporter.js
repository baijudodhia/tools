/**
 * Flat Schema Exporter
 * Converts telemetry data to Excel-ready flat schema matching DATA_SCHEMA.md
 */

class SchemaExporter {
  constructor(metadataManager) {
    this.metadata = metadataManager;
  }

  /**
   * Export static telemetry as flat schema row
   */
  exportStatic(staticData) {
    const meta = this.metadata.getMetadata('STATIC');
    const gov = this.metadata.getGovernanceFields();

    const device = staticData.device || {};
    const display = staticData.display || {};
    const browser = staticData.browser || {};
    const webAPIs = staticData.webAPIs || {};
    const storage = staticData.storage || {};
    const permissions = staticData.permissions || {};

    return {
      // 1️⃣ Record & Session Metadata
      record_id: meta.record_id,
      session_id: meta.session_id,
      user_id: meta.user_id,
      agent_id: meta.agent_id,
      record_type: meta.record_type,
      collected_at: meta.collected_at,
      page_url: meta.page_url,
      app_name: meta.app_name,
      app_version: meta.app_version,
      environment: meta.environment,

      // 2️⃣ Static – Device & Hardware
      platform: device.platform || null,
      architecture: device.architecture || null,
      cpu_cores: device.cpuLogicalCores || null,
      device_memory_gb: device.deviceMemory || null,
      gpu_vendor: device.gpuVendor || null,
      gpu_renderer: device.gpuRenderer || null,
      device_class: device.deviceClass || null,
      touch_supported: device.touchSupport || false,
      max_touch_points: device.maxTouchPoints || 0,
      battery_supported: this.checkBatterySupport(),

      // 3️⃣ Static – Display & Visual
      screen_width: display.screenResolution?.width || null,
      screen_height: display.screenResolution?.height || null,
      avail_width: display.availableScreenSize?.width || null,
      avail_height: display.availableScreenSize?.height || null,
      pixel_ratio: display.pixelRatio || null,
      color_depth: display.colorDepth || null,
      color_gamut: display.colorGamut || null,
      hdr_supported: display.hdrSupport || false,

      // 4️⃣ Static – Browser, Runtime & Locale
      browser_name: browser.browserVersion?.name || null,
      browser_version: browser.browserVersion?.major || null,
      rendering_engine: browser.renderingEngine || null,
      js_engine_inferred: browser.javascriptEngine || null,
      user_agent: browser.userAgent || null,
      ua_arch: browser.uaCH?.architecture || null,
      language: browser.language || null,
      languages: Array.isArray(browser.languages) ? browser.languages.join(',') : browser.language,
      timezone_offset_minutes: browser.timezoneOffset || null,
      do_not_track: browser.doNotTrack || null,
      pdf_viewer_enabled: browser.pdfViewer || false,

      // 5️⃣ Static – Web API & Capability Surface
      api_webgl: webAPIs.webgl || false,
      api_webgl2: webAPIs.webgl2 || false,
      api_webgpu: webAPIs.webgpu || false,
      api_webrtc: webAPIs.webrtc || false,
      api_wasm: webAPIs.webassembly || false,
      api_service_worker: webAPIs.serviceWorkers || false,
      api_push: webAPIs.pushAPI || false,
      api_bg_sync: webAPIs.backgroundSync || false,
      api_media_devices: webAPIs.mediaDevices || false,
      api_clipboard: webAPIs.clipboardAPI || false,
      api_webauthn: webAPIs.webAuthn || false,
      api_payment_request: webAPIs.paymentRequest || false,
      api_file_system_access: webAPIs.fileSystemAccess || false,
      api_offscreen_canvas: webAPIs.offscreenCanvas || false,
      api_audio_context: webAPIs.audioContext || false,
      api_indexeddb: webAPIs.indexedDB || false,
      api_shared_array_buffer: webAPIs.sharedArrayBuffer || false,
      api_drm_supported: webAPIs.drmSupported || false,

      // 6️⃣ Static – Permission-Aware Capabilities
      camera_available: permissions.camera_available || false,
      camera_device_count: permissions.camera_device_count || 0,
      microphone_available: permissions.microphone_available || false,
      microphone_device_count: permissions.microphone_device_count || 0,
      location_capable: permissions.location_capable || false,
      advanced_device_capable: permissions.advanced_device_capable || false,

      // 7️⃣-1️⃣5️⃣ Continuous fields (null for static records)
      online: null,
      effective_connection_type: null,
      rtt_ms: null,
      downlink_mbps: null,
      rtt_jitter_ms: null,
      network_change_count: null,
      save_data_enabled: null,
      download_speed_mbps: null,
      upload_speed_mbps: null,
      speed_test_method: null,
      speed_test_timestamp: null,
      connection_tier: null,
      slow_connection_detected: null,
      js_heap_limit_mb: null,
      js_heap_total_mb: null,
      js_heap_used_mb: null,
      heap_growth_mb: null,
      event_loop_delay_ms: null,
      long_task_count: null,
      timer_throttling_detected: null,
      LCP_ms: null,
      INP_ms: null,
      CLS: null,
      TTFB_ms: null,
      FCP_ms: null,
      DOMContentLoaded_ms: null,
      Load_ms: null,
      time_to_interactive_ms: null,
      hardware_acceleration: null,
      renderer_path: null,
      resource_timing_avg_total_ms: null,
      resource_timing_avg_transfer_kb: null,
      resource_timing_total_requests: null,
      resource_timing_cache_hit_ratio: null,
      resource_timing_avg_status_code: null,
      tab_visibility: null,
      window_has_focus: null,
      foreground_time_sec: null,
      background_time_sec: null,
      idle_time_sec: null,
      focus_loss_count: null,
      user_id_hash: null,
      tenant_id: null,
      session_start: null,
      session_end: null,
      session_duration_sec: null,
      feature_used: null,
      conversion_event: null,
      conversion_value: null,
      dwell_time_sec: null,
      scroll_depth_pct: null,
      click_count: null,
      camera_permission: null,
      camera_active: null,
      camera_active_ratio: null,
      camera_fps: null,
      camera_fps_drops: null,
      camera_freeze_events: null,
      camera_switch_count: null,
      virtual_camera_suspected: null,
      mic_permission: null,
      mic_active: null,
      mic_activity_ratio: null,
      mic_volume_avg: null,
      mic_silence_ratio: null,
      background_noise_level: null,
      mic_mute_toggle_count: null,
      screen_share_permission: null,
      screen_share_active: null,
      screen_share_type: null,
      screen_share_resolution: null,
      screen_share_fps: null,
      screen_freeze_events: null,
      screen_focus_loss_count: null,
      screen_share_interruptions: null,
      location_permission: null,
      latitude: null,
      longitude: null,
      location_accuracy_m: null,
      movement_speed_mps: null,
      location_change_count: null,
      geofence_violation: null,
      clipboard_permission: null,
      copy_event_count: null,
      paste_event_count: null,
      file_upload_count: null,
      file_type: null,
      file_size_kb: null,
      file_checksum: null,
      file_reuse_detected: null,
      aborted_upload_count: null,
      advanced_device_used: null,
      advanced_device_type: null,
      device_vendor_id: null,
      device_product_id: null,
      device_interaction_count: null,
      device_disconnect_count: null,

      // 1️⃣6️⃣-1️⃣8️⃣ Inferred fields (null for static records)
      screen_presence_ratio: null,
      camera_presence_ratio: null,
      mic_presence_ratio: null,
      idle_ratio: null,
      multitasking_likelihood: null,
      network_stability_score: null,
      session_reliability_score: null,
      throttling_likelihood: null,
      device_stability_score: null,
      agent_presence_score: null,
      session_integrity_score: null,
      network_reliability_score: null,
      composite_agent_risk_score: null,
      risk_level: null,

      // 1️⃣9️⃣ Governance & Audit
      consent_version: gov.consent_version,
      consent_timestamp: gov.consent_timestamp,
      data_retention_policy: gov.data_retention_policy,
      audit_reference_id: gov.audit_reference_id
    };
  }

  /**
   * Export continuous telemetry as flat schema row
   */
  exportContinuous(continuousSample, permissionMetrics = {}, inferredData = null, performanceData = null, networkData = null, productData = null, environmentData = null, staticData = null) {
    const meta = this.metadata.getMetadata('CONTINUOUS');
    const gov = this.metadata.getGovernanceFields();

    const network = continuousSample.network || {};
    const memory = continuousSample.memory || {};
    const performance = continuousSample.performance || {};
    const activity = continuousSample.activity || {};
    const camera = permissionMetrics.camera || {};
    const mic = permissionMetrics.microphone || {};
    const screenShare = permissionMetrics.screenShare || {};
    const location = permissionMetrics.location || {};
    const clipboard = permissionMetrics.clipboard || {};
    const advancedDevices = permissionMetrics.advancedDevices || {};
    const agentPresence = inferredData?.agentPresence || {};
    const sessionIntegrity = inferredData?.sessionIntegrity || {};
    const riskScores = inferredData?.riskScores || {};

    // Extended telemetry data
    const perf = performanceData || {};
    const net = networkData || {};
    const prod = productData || {};
    const env = environmentData || {};
    const stat = staticData || {};

    // Extract static data for continuous records
    const device = stat.device || {};
    const display = stat.display || {};
    const browser = stat.browser || {};
    const webAPIs = stat.webAPIs || {};
    const storage = stat.storage || {};
    const permissions = stat.permissions || {};

    return {
      // 1️⃣ Record & Session Metadata
      record_id: meta.record_id,
      session_id: meta.session_id,
      user_id: meta.user_id,
      agent_id: meta.agent_id,
      record_type: meta.record_type,
      collected_at: meta.collected_at,
      page_url: meta.page_url,
      app_name: meta.app_name,
      app_version: meta.app_version,
      environment: meta.environment,

      // 2️⃣-6️⃣ Static fields (filled in continuous records for variance explanation)
      platform: env.platform || device.platform || null,
      architecture: env.architecture || device.architecture || null,
      cpu_cores: device.cpuLogicalCores || null,
      device_memory_gb: device.deviceMemory || null,
      gpu_vendor: device.gpuVendor || null,
      gpu_renderer: env.gpu_renderer || device.gpuRenderer || null,
      device_class: env.device_class || device.deviceClass || null,
      touch_supported: device.touchSupport || false,
      max_touch_points: device.maxTouchPoints || 0,
      battery_supported: this.checkBatterySupport(),
      screen_width: display.screenResolution?.width || null,
      screen_height: display.screenResolution?.height || null,
      avail_width: display.availableScreenSize?.width || null,
      avail_height: display.availableScreenSize?.height || null,
      pixel_ratio: display.pixelRatio || null,
      color_depth: display.colorDepth || null,
      color_gamut: display.colorGamut || null,
      hdr_supported: display.hdrSupport || false,
      browser_name: env.browser_name || browser.browserVersion?.name || null,
      browser_version: env.browser_version || browser.browserVersion?.major || null,
      rendering_engine: browser.renderingEngine || null,
      js_engine_inferred: browser.javascriptEngine || null,
      user_agent: browser.userAgent || null,
      ua_arch: browser.uaCH?.architecture || null,
      language: browser.language || null,
      languages: Array.isArray(browser.languages) ? browser.languages.join(',') : browser.language || null,
      timezone_offset_minutes: browser.timezoneOffset || null,
      do_not_track: browser.doNotTrack || null,
      pdf_viewer_enabled: browser.pdfViewer || false,
      api_webgl: webAPIs.webgl || false,
      api_webgl2: webAPIs.webgl2 || false,
      api_webgpu: webAPIs.webgpu || false,
      api_webrtc: webAPIs.webrtc || false,
      api_wasm: webAPIs.webassembly || false,
      api_service_worker: webAPIs.serviceWorkers || false,
      api_push: webAPIs.pushAPI || false,
      api_bg_sync: webAPIs.backgroundSync || false,
      api_media_devices: webAPIs.mediaDevices || false,
      api_clipboard: webAPIs.clipboardAPI || false,
      api_webauthn: webAPIs.webAuthn || false,
      api_payment_request: webAPIs.paymentRequest || false,
      api_file_system_access: webAPIs.fileSystemAccess || false,
      api_offscreen_canvas: webAPIs.offscreenCanvas || false,
      api_audio_context: webAPIs.audioContext || false,
      api_indexeddb: webAPIs.indexedDB || false,
      api_shared_array_buffer: webAPIs.sharedArrayBuffer || false,
      api_drm_supported: webAPIs.drmSupported || false,
      camera_available: permissions.camera_available || false,
      camera_device_count: permissions.camera_device_count || 0,
      microphone_available: permissions.microphone_available || false,
      microphone_device_count: permissions.microphone_device_count || 0,
      location_capable: permissions.location_capable || false,
      advanced_device_capable: permissions.advanced_device_capable || false,

      // 7️⃣ Continuous – Network Metrics
      online: network.online || false,
      effective_connection_type: network.effectiveConnectionType || null,
      rtt_ms: network.rtt || null,
      downlink_mbps: network.downlinkSpeed || null,
      rtt_jitter_ms: network.rttJitter || null,
      network_change_count: network.networkChangeCount || 0,
      save_data_enabled: network.saveData || false,

      // Speed Test Results
      download_speed_mbps: network.download_speed_mbps || null,
      upload_speed_mbps: network.upload_speed_mbps || null,
      speed_test_method: network.speed_test_method || null,
      speed_test_timestamp: network.speed_test_timestamp || null,

      // Connection-Aware UX Detection
      connection_tier: this.detectConnectionTier(network.rtt, network.downlinkSpeed || network.download_speed_mbps),
      slow_connection_detected: this.isSlowConnection(network.rtt, network.downlinkSpeed || network.download_speed_mbps),

      // Resource Timing Summary (Network Telemetry)
      resource_timing_avg_total_ms: net.avg_total_ms || null,
      resource_timing_avg_transfer_kb: net.avg_transfer_size_kb || null,
      resource_timing_total_requests: net.total_requests || null,
      resource_timing_cache_hit_ratio: net.cache_hit_ratio || null,
      resource_timing_avg_status_code: net.avg_status_code || null,

      // 8️⃣ Continuous – Browser Resource & Load
      js_heap_limit_mb: memory.jsHeapLimitMB || null,
      js_heap_total_mb: memory.jsHeapTotalMB || null,
      js_heap_used_mb: memory.jsHeapUsedMB || null,
      heap_growth_mb: memory.heapGrowthMB || null,
      event_loop_delay_ms: performance.eventLoopDelay || null,
      long_task_count: performance.longTasksCount || 0,
      timer_throttling_detected: performance.timerThrottlingDetected || false,

      // Core Web Vitals (Performance Telemetry)
      LCP_ms: perf.LCP_ms || null,
      INP_ms: perf.INP_ms || null,
      CLS: perf.CLS || null,
      TTFB_ms: perf.TTFB_ms || null,
      FCP_ms: perf.FCP_ms || null,
      DOMContentLoaded_ms: perf.DOMContentLoaded_ms || null,
      Load_ms: perf.Load_ms || null,
      time_to_interactive_ms: perf.time_to_interactive_ms || null,

      // Hardware Acceleration (Environment Telemetry)
      hardware_acceleration: env.hardware_acceleration !== undefined ? env.hardware_acceleration : null,
      renderer_path: env.renderer_path || null,

      // 9️⃣ Continuous – Page, Focus & Engagement
      tab_visibility: activity.tabVisibility || null,
      window_has_focus: activity.windowHasFocus || false,
      foreground_time_sec: activity.foregroundTime || null,
      background_time_sec: activity.backgroundTime || null,
      idle_time_sec: activity.idleDuration || null,
      focus_loss_count: activity.focusLossCount || 0,

      // Product Outcomes & Engagement (Product Telemetry)
      user_id_hash: prod.user_id_hash || null,
      tenant_id: prod.tenant_id || null,
      session_start: prod.session_start || null,
      session_end: prod.session_end || null,
      session_duration_sec: prod.session_duration_sec || null,
      feature_used: prod.latest_feature_used || null,
      conversion_event: prod.latest_conversion_event || null,
      conversion_value: prod.latest_conversion_value || null,
      dwell_time_sec: prod.dwell_time_sec || null,
      scroll_depth_pct: prod.scroll_depth_pct || null,
      click_count: prod.click_count || null,

      // 🔟 Continuous – Camera Activity
      camera_permission: camera.camera_permission || null,
      camera_active: camera.camera_active || false,
      camera_active_ratio: camera.camera_active_ratio || null,
      camera_fps: camera.camera_fps || null,
      camera_fps_drops: camera.camera_fps_drops || null,
      camera_freeze_events: camera.camera_freeze_events || null,
      camera_switch_count: camera.camera_switch_count || null,
      virtual_camera_suspected: camera.virtual_camera_suspected || false,

      // 1️⃣1️⃣ Continuous – Microphone Activity
      mic_permission: mic.mic_permission || null,
      mic_active: mic.mic_active || false,
      mic_activity_ratio: mic.mic_activity_ratio || null,
      mic_volume_avg: mic.mic_volume_avg || null,
      mic_silence_ratio: mic.mic_silence_ratio || null,
      background_noise_level: mic.background_noise_level || null,
      mic_mute_toggle_count: mic.mic_mute_toggle_count || null,

      // 1️⃣2️⃣ Continuous – Screen / Tab Share Activity
      screen_share_permission: screenShare.screen_share_permission || null,
      screen_share_active: screenShare.screen_share_active || false,
      screen_share_type: screenShare.screen_share_type || null,
      screen_share_resolution: screenShare.screen_share_resolution || null,
      screen_share_fps: screenShare.screen_share_fps || null,
      screen_freeze_events: screenShare.screen_freeze_events || null,
      screen_focus_loss_count: screenShare.screen_focus_loss_count || null,
      screen_share_interruptions: screenShare.screen_share_interruptions || null,

      // 1️⃣3️⃣ Continuous – Location Runtime
      location_permission: location.location_permission || null,
      latitude: location.latitude || null,
      longitude: location.longitude || null,
      location_accuracy_m: location.location_accuracy_m || null,
      movement_speed_mps: location.movement_speed_mps || null,
      location_change_count: location.location_change_count || null,
      geofence_violation: location.geofence_violation || false,

      // 1️⃣4️⃣ Continuous – Clipboard & File Interaction
      clipboard_permission: clipboard.clipboard_permission || null,
      copy_event_count: clipboard.copy_event_count || null,
      paste_event_count: clipboard.paste_event_count || null,
      file_upload_count: clipboard.file_upload_count || null,
      file_type: clipboard.file_type || null,
      file_size_kb: clipboard.file_size_kb || null,
      file_checksum: clipboard.file_checksum || null,
      file_reuse_detected: clipboard.file_reuse_detected || false,
      aborted_upload_count: clipboard.aborted_upload_count || null,

      // 1️⃣5️⃣ Continuous – Advanced Device Interaction
      advanced_device_used: advancedDevices.advanced_device_used || false,
      advanced_device_type: advancedDevices.advanced_device_type || null,
      device_vendor_id: advancedDevices.device_vendor_id || null,
      device_product_id: advancedDevices.device_product_id || null,
      device_interaction_count: advancedDevices.device_interaction_count || null,
      device_disconnect_count: advancedDevices.device_disconnect_count || null,

      // 1️⃣6️⃣ Inferred – Agent Presence & Behaviour (filled in continuous records)
      screen_presence_ratio: agentPresence.screen_presence_ratio !== undefined ? agentPresence.screen_presence_ratio : null,
      camera_presence_ratio: agentPresence.camera_presence_ratio !== undefined ? agentPresence.camera_presence_ratio : null,
      mic_presence_ratio: agentPresence.mic_presence_ratio !== undefined ? agentPresence.mic_presence_ratio : null,
      idle_ratio: agentPresence.idle_ratio !== undefined ? agentPresence.idle_ratio : null,
      multitasking_likelihood: agentPresence.multitasking_likelihood || null,

      // 1️⃣7️⃣ Inferred – Session Integrity & Network Quality (filled in continuous records)
      network_stability_score: sessionIntegrity.network_stability_score !== undefined ? sessionIntegrity.network_stability_score : null,
      session_reliability_score: sessionIntegrity.session_reliability_score !== undefined ? sessionIntegrity.session_reliability_score : null,
      throttling_likelihood: sessionIntegrity.throttling_likelihood || null,
      device_stability_score: sessionIntegrity.device_stability_score !== undefined ? sessionIntegrity.device_stability_score : null,

      // 1️⃣8️⃣ Inferred – Supervision & Risk Scores (filled in continuous records)
      agent_presence_score: riskScores.agent_presence_score !== undefined ? riskScores.agent_presence_score : null,
      session_integrity_score: riskScores.session_integrity_score !== undefined ? riskScores.session_integrity_score : null,
      network_reliability_score: riskScores.network_reliability_score !== undefined ? riskScores.network_reliability_score : null,
      composite_agent_risk_score: riskScores.composite_agent_risk_score !== undefined ? riskScores.composite_agent_risk_score : null,
      risk_level: riskScores.risk_level || null,

      // 1️⃣9️⃣ Governance & Audit
      consent_version: gov.consent_version,
      consent_timestamp: gov.consent_timestamp,
      data_retention_policy: gov.data_retention_policy,
      audit_reference_id: gov.audit_reference_id
    };
  }

  /**
   * Get Excel column headers in order
   */
  getColumnHeaders() {
    return [
      'record_id', 'session_id', 'user_id', 'agent_id', 'record_type', 'collected_at', 'page_url', 'app_name', 'app_version', 'environment',
      'platform', 'architecture', 'cpu_cores', 'device_memory_gb', 'gpu_vendor', 'gpu_renderer', 'device_class', 'touch_supported', 'max_touch_points', 'battery_supported',
      'screen_width', 'screen_height', 'avail_width', 'avail_height', 'pixel_ratio', 'color_depth', 'color_gamut', 'hdr_supported',
      'browser_name', 'browser_version', 'rendering_engine', 'js_engine_inferred', 'user_agent', 'ua_arch', 'language', 'languages', 'timezone_offset_minutes', 'do_not_track', 'pdf_viewer_enabled',
      'api_webgl', 'api_webgl2', 'api_webgpu', 'api_webrtc', 'api_wasm', 'api_service_worker', 'api_push', 'api_bg_sync', 'api_media_devices', 'api_clipboard', 'api_webauthn', 'api_payment_request', 'api_file_system_access', 'api_offscreen_canvas', 'api_audio_context', 'api_indexeddb', 'api_shared_array_buffer', 'api_drm_supported',
      'camera_available', 'camera_device_count', 'microphone_available', 'microphone_device_count', 'location_capable', 'advanced_device_capable',
      'online', 'effective_connection_type', 'rtt_ms', 'downlink_mbps', 'rtt_jitter_ms', 'network_change_count', 'save_data_enabled', 'download_speed_mbps', 'upload_speed_mbps', 'speed_test_method', 'speed_test_timestamp', 'connection_tier', 'slow_connection_detected',
      'js_heap_limit_mb', 'js_heap_total_mb', 'js_heap_used_mb', 'heap_growth_mb', 'event_loop_delay_ms', 'long_task_count', 'timer_throttling_detected',
      'LCP_ms', 'INP_ms', 'CLS', 'TTFB_ms', 'FCP_ms', 'DOMContentLoaded_ms', 'Load_ms', 'time_to_interactive_ms',
      'hardware_acceleration', 'renderer_path',
      'resource_timing_avg_total_ms', 'resource_timing_avg_transfer_kb', 'resource_timing_total_requests', 'resource_timing_cache_hit_ratio', 'resource_timing_avg_status_code',
      'tab_visibility', 'window_has_focus', 'foreground_time_sec', 'background_time_sec', 'idle_time_sec', 'focus_loss_count',
      'user_id_hash', 'tenant_id', 'session_start', 'session_end', 'session_duration_sec', 'feature_used', 'conversion_event', 'conversion_value', 'dwell_time_sec', 'scroll_depth_pct', 'click_count',
      'camera_permission', 'camera_active', 'camera_active_ratio', 'camera_fps', 'camera_fps_drops', 'camera_freeze_events', 'camera_switch_count', 'virtual_camera_suspected',
      'mic_permission', 'mic_active', 'mic_activity_ratio', 'mic_volume_avg', 'mic_silence_ratio', 'background_noise_level', 'mic_mute_toggle_count',
      'screen_share_permission', 'screen_share_active', 'screen_share_type', 'screen_share_resolution', 'screen_share_fps', 'screen_freeze_events', 'screen_focus_loss_count', 'screen_share_interruptions',
      'location_permission', 'latitude', 'longitude', 'location_accuracy_m', 'movement_speed_mps', 'location_change_count', 'geofence_violation',
      'clipboard_permission', 'copy_event_count', 'paste_event_count', 'file_upload_count', 'file_type', 'file_size_kb', 'file_checksum', 'file_reuse_detected', 'aborted_upload_count',
      'advanced_device_used', 'advanced_device_type', 'device_vendor_id', 'device_product_id', 'device_interaction_count', 'device_disconnect_count',
      'screen_presence_ratio', 'camera_presence_ratio', 'mic_presence_ratio', 'idle_ratio', 'multitasking_likelihood',
      'network_stability_score', 'session_reliability_score', 'throttling_likelihood', 'device_stability_score',
      'agent_presence_score', 'session_integrity_score', 'network_reliability_score', 'composite_agent_risk_score', 'risk_level',
      'consent_version', 'consent_timestamp', 'data_retention_policy', 'audit_reference_id'
    ];
  }

  /**
   * Export to CSV format
   */
  exportToCSV(rows) {
    const headers = this.getColumnHeaders();
    const csvRows = [headers.join(',')];

    rows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  checkBatterySupport() {
    return 'getBattery' in navigator;
  }

  /**
   * Detect connection tier for connection-aware UX
   */
  detectConnectionTier(rtt, downlink) {
    if (!rtt || !downlink) return null;

    if (rtt >= 150 || downlink <= 2) return 'C'; // Slow tier
    if (rtt >= 100 || downlink <= 5) return 'B'; // Medium tier
    return 'A'; // Fast tier
  }

  /**
   * Detect slow connection for auto-optimization
   */
  isSlowConnection(rtt, downlink) {
    if (!rtt || !downlink) return false;
    return rtt >= 150 || downlink <= 2;
  }
}
