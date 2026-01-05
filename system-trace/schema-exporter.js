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
      js_heap_limit_mb: null,
      js_heap_total_mb: null,
      js_heap_used_mb: null,
      heap_growth_mb: null,
      event_loop_delay_ms: null,
      long_task_count: null,
      timer_throttling_detected: null,
      tab_visibility: null,
      window_has_focus: null,
      foreground_time_sec: null,
      background_time_sec: null,
      idle_time_sec: null,
      focus_loss_count: null,
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
  exportContinuous(continuousSample, permissionMetrics = {}, inferredData = null) {
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

      // 2️⃣-6️⃣ Static fields (null for continuous records)
      platform: null,
      architecture: null,
      cpu_cores: null,
      device_memory_gb: null,
      gpu_vendor: null,
      gpu_renderer: null,
      device_class: null,
      touch_supported: null,
      max_touch_points: null,
      battery_supported: null,
      screen_width: null,
      screen_height: null,
      avail_width: null,
      avail_height: null,
      pixel_ratio: null,
      color_depth: null,
      color_gamut: null,
      hdr_supported: null,
      browser_name: null,
      browser_version: null,
      rendering_engine: null,
      js_engine_inferred: null,
      user_agent: null,
      ua_arch: null,
      language: null,
      languages: null,
      timezone_offset_minutes: null,
      do_not_track: null,
      pdf_viewer_enabled: null,
      api_webgl: null,
      api_webgl2: null,
      api_webgpu: null,
      api_webrtc: null,
      api_wasm: null,
      api_service_worker: null,
      api_push: null,
      api_bg_sync: null,
      api_media_devices: null,
      api_clipboard: null,
      api_webauthn: null,
      api_payment_request: null,
      api_file_system_access: null,
      api_offscreen_canvas: null,
      api_audio_context: null,
      api_indexeddb: null,
      api_shared_array_buffer: null,
      api_drm_supported: null,
      camera_available: null,
      camera_device_count: null,
      microphone_available: null,
      microphone_device_count: null,
      location_capable: null,
      advanced_device_capable: null,

      // 7️⃣ Continuous – Network Metrics
      online: network.online || false,
      effective_connection_type: network.effectiveConnectionType || null,
      rtt_ms: network.rtt || null,
      downlink_mbps: network.downlinkSpeed || null,
      rtt_jitter_ms: network.rttJitter || null,
      network_change_count: network.networkChangeCount || 0,
      save_data_enabled: network.saveData || false,

      // 8️⃣ Continuous – Browser Resource & Load
      js_heap_limit_mb: memory.jsHeapLimitMB || null,
      js_heap_total_mb: memory.jsHeapTotalMB || null,
      js_heap_used_mb: memory.jsHeapUsedMB || null,
      heap_growth_mb: memory.heapGrowthMB || null,
      event_loop_delay_ms: performance.eventLoopDelay || null,
      long_task_count: performance.longTasksCount || 0,
      timer_throttling_detected: performance.timerThrottlingDetected || false,

      // 9️⃣ Continuous – Page, Focus & Engagement
      tab_visibility: activity.tabVisibility || null,
      window_has_focus: activity.windowHasFocus || false,
      foreground_time_sec: activity.foregroundTime || null,
      background_time_sec: activity.backgroundTime || null,
      idle_time_sec: activity.idleDuration || null,
      focus_loss_count: activity.focusLossCount || 0,

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

      // 1️⃣6️⃣ Inferred – Agent Presence & Behaviour
      screen_presence_ratio: agentPresence.screen_presence_ratio || null,
      camera_presence_ratio: agentPresence.camera_presence_ratio || null,
      mic_presence_ratio: agentPresence.mic_presence_ratio || null,
      idle_ratio: agentPresence.idle_ratio || null,
      multitasking_likelihood: agentPresence.multitasking_likelihood || null,

      // 1️⃣7️⃣ Inferred – Session Integrity & Network Quality
      network_stability_score: sessionIntegrity.network_stability_score || null,
      session_reliability_score: sessionIntegrity.session_reliability_score || null,
      throttling_likelihood: sessionIntegrity.throttling_likelihood || null,
      device_stability_score: sessionIntegrity.device_stability_score || null,

      // 1️⃣8️⃣ Inferred – Supervision & Risk Scores
      agent_presence_score: riskScores.agent_presence_score || null,
      session_integrity_score: riskScores.session_integrity_score || null,
      network_reliability_score: riskScores.network_reliability_score || null,
      composite_agent_risk_score: riskScores.composite_agent_risk_score || null,
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
      'online', 'effective_connection_type', 'rtt_ms', 'downlink_mbps', 'rtt_jitter_ms', 'network_change_count', 'save_data_enabled',
      'js_heap_limit_mb', 'js_heap_total_mb', 'js_heap_used_mb', 'heap_growth_mb', 'event_loop_delay_ms', 'long_task_count', 'timer_throttling_detected',
      'tab_visibility', 'window_has_focus', 'foreground_time_sec', 'background_time_sec', 'idle_time_sec', 'focus_loss_count',
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
}
