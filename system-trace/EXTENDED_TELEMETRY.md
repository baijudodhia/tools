# Extended Telemetry Capabilities

This document describes the additional telemetry collection modules added to the System Trace system.

---

## 📊 New Telemetry Modules

### 1. **Product Outcomes & Engagement** (`product-telemetry.js`)

**Purpose**: Tie technical metrics to business outcomes

**Collects**:
- `user_id_hash` - Hashed user identifier for cohorting
- `tenant_id` / `account_id` - B2B organization tracking
- `session_start` / `session_end` - Session boundaries
- `feature_used` - Feature usage events (e.g., `chat_send`, `file_upload`)
- `conversion_event` - Business conversion events (e.g., `signup_complete`, `purchase_confirm`)
- `conversion_value` - Revenue/points associated with conversions
- `dwell_time_sec` - Time spent in session
- `scroll_depth_pct` - How far user scrolled
- `click_count` - User interaction count

**Usage**:
```javascript
telemetry.trackFeature('file_upload', { file_type: 'pdf' });
telemetry.trackConversion('purchase_complete', 99.99);
```

---

### 2. **Front-End Performance** (`performance-telemetry.js`)

**Purpose**: Core Web Vitals + Navigation Timings + App-Specific Timings

**Collects**:
- **Core Web Vitals**:
  - `LCP_ms` - Largest Contentful Paint
  - `INP_ms` - Interaction to Next Paint
  - `CLS` - Cumulative Layout Shift
- **Navigation Timings**:
  - `TTFB_ms` - Time to First Byte
  - `FCP_ms` - First Contentful Paint
  - `DOMContentLoaded_ms`
  - `Load_ms`
- **App-Specific**:
  - `time_to_interactive_ms`
  - `route_change_ms` (for SPAs)
  - `first_meaningful_action_ms`

**Auto-collected**: Yes, on page load

---

### 3. **Network & Resource Timing** (`network-telemetry.js`)

**Purpose**: Per-request timing and transfer details

**Collects**:
- `protocol` - HTTP/2, HTTP/3, QUIC, WebSocket
- `resource_type` - doc, script, style, img, xhr/fetch, media
- `url_path_hash` - Hashed URL path (privacy-safe)
- `status_code` - HTTP status code
- `cache_status` - hit/miss/revalidated
- `transfer_size_kb`, `encoded_body_size_kb`, `decoded_body_size_kb`
- `dns_ms`, `tls_ms`, `connect_ms`, `request_ms`, `response_ms`, `download_ms`, `total_ms`
- `save_data_enabled` - Data saver mode

**Auto-collected**: Yes, via PerformanceObserver

---

### 4. **Reliability & Errors** (`reliability-telemetry.js`)

**Purpose**: Countable, groupable failure modes

**Collects**:
- **JS Errors**:
  - `error_type` - JS, Promise, etc.
  - `message_hash`, `stack_hash` - Hashed for privacy
  - `component` - Component where error occurred
  - `fatal` - Whether error is fatal
- **Network Failures**:
  - `endpoint_hash` - Hashed endpoint URL
  - `status_code` - HTTP status
  - `retry_count` - Number of retries
  - `timeout_ms` - Timeout duration
- **WebSocket/WebRTC Disconnects**:
  - `reason_code`, `duration_sec`, `ice_state`
- **Service Worker Issues**:
  - `install_fail`, `activation_fail`, `fetch_fail_count`
- **Crash Hints**:
  - `long_task_ms_max` - Longest blocking task
  - `mem_pressure_events` - Memory pressure count
  - `tab_freeze_count` - Tab freeze events

**Auto-collected**: Yes, via error event listeners

---

### 5. **Media / Real-Time** (`media-telemetry.js`)

**Purpose**: WebRTC stats and playback metrics

**Collects (WebRTC)**:
- `audio_bitrate_kbps`, `video_bitrate_kbps`
- `rtt_ms`, `jitter_ms`, `packet_loss_pct`
- `audio_level_avg`, `concealed_samples_pct`, `echo_cancellation_on`
- `frame_rate_fps`, `render_resolution`
- `decoder_drops`, `freeze_count`, `mean_freeze_duration_ms`
- `mos_estimate` - Mean Opinion Score (quality estimate)

**Collects (Playback)**:
- `startup_time_ms` - Time to start playback
- `rebuffer_count` - Number of rebuffering events
- `rebuffer_ratio_pct` - Percentage of time rebuffering
- `avg_bitrate_kbps` - Average bitrate
- `drm_used` - Whether DRM was used

**Usage**:
```javascript
const pc = new RTCPeerConnection();
telemetry.startWebRTCMonitoring(pc, 10000); // Every 10s

const video = document.querySelector('video');
telemetry.trackPlayback(video, { drmUsed: true });
```

---

### 6. **Environment & Segmentation** (`environment-telemetry.js`)

**Purpose**: Explain renderer differences and device capabilities

**Collects**:
- `hardware_acceleration` - Is GPU compositing enabled?
- `webgl_supported` / `webgpu_supported` - API availability
- `renderer_path` - hardware/software/virtual
- `device_class` - desktop/laptop/tablet/mobile
- `os_name` / `os_version` - Operating system details
- `browser_name` / `browser_version` - Browser details
- `reduced_motion_pref` - Accessibility preference
- `color_scheme` - dark/light/no-preference

**Auto-collected**: Yes, on initialization

---

## 🔗 Integration

All modules are automatically initialized when you call `telemetry.initialize()`:

```javascript
const telemetry = new TelemetryCollector({
  userId: 'user123',
  tenantId: 'acme-corp'
});

await telemetry.initialize();
// All modules are now collecting data
```

---

## 📤 Data Access

### Get Extended Telemetry

```javascript
const allData = telemetry.getAllTelemetryExtended();
// Returns:
// {
//   static: {...},
//   continuous: {...},
//   inferred: {...},
//   product: {
//     session: {...},
//     engagement: {...},
//     events: [...]
//   },
//   performance: {...},
//   network: {
//     resource_timings: [...],
//     summary: {...}
//   },
//   reliability: {
//     errors: [...],
//     network_failures: [...],
//     crash_hints: {...}
//   },
//   media: {
//     webrtc: [...],
//     playback: [...]
//   },
//   environment: {...}
// }
```

### Individual Module Access

```javascript
// Product telemetry
telemetry.productTelemetry.getEngagementSummary();
telemetry.productTelemetry.getEvents();

// Performance
telemetry.performanceTelemetry.getMetrics();
telemetry.performanceTelemetry.getPerformanceEvent();

// Network
telemetry.networkTelemetry.getResourceTimings();
telemetry.networkTelemetry.getSummary();

// Reliability
telemetry.reliabilityTelemetry.getErrorSummary();
telemetry.reliabilityTelemetry.getNetworkFailureSummary();

// Media
telemetry.mediaTelemetry.getWebRTCStats();
telemetry.mediaTelemetry.getPlaybackStats();

// Environment
telemetry.environmentTelemetry.getData();
```

---

## 🎯 Use Cases

### Correlation Analysis

- **RTT vs LCP**: Quantify how network tiers impact perceived load
- **Visibility/focus vs conversion**: Detect attention drop-offs
- **Renderer path vs INP**: Prove whether SwiftShader penalizes interaction latency
- **Packet loss vs freeze ratio**: Target network remediation during calls

### Segmentation

Slice by:
- `tenant_id` - Organization-level insights
- `feature_used` - Feature adoption analysis
- `device_class` - Device-specific performance
- `protocol` - Network protocol comparison
- `renderer_path` - Hardware vs software rendering

### Diagnostics

- Per-resource timings + `status_code` + `cache_status` pinpoint slow endpoints
- Error tracking identifies problematic components
- Network failure analysis reveals infrastructure issues

---

## 🔒 Privacy & Compliance

- **Hashing**: User IDs, URLs, and error messages are hashed client-side
- **Sampling**: Can be implemented at application level (recommended: 5-10% for RUM, 100% for errors)
- **Retention**: Aligned with existing `data_retention_policy` field
- **Consent**: All modules respect existing consent tracking

---

## 📊 Export Considerations

These new telemetry types are **event-based** rather than continuous/static records. They can be:

1. **Exported as separate event streams** (JSON format)
2. **Aggregated into summary metrics** for Excel export
3. **Included in continuous records** as additional fields (if schema is extended)

The current Excel schema focuses on static/continuous records. For event-based data, consider:
- Separate event export files
- Aggregated summaries in main CSV
- Real-time streaming to analytics platforms

---

## ✅ Quick Checklist

- [x] Core Web Vitals (LCP, INP, CLS) collection
- [x] Resource timing for all requests
- [x] JS error tracking with component identification
- [x] Network failure tracking
- [x] WebRTC stats collection (when peer connection available)
- [x] Environment fields (renderer, hardware acceleration)
- [x] Product outcome tracking (features, conversions)
- [x] Engagement metrics (scroll, clicks, dwell time)

All modules are production-ready and integrated into the main telemetry orchestrator.
