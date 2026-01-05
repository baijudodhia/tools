# CSV Export - Complete Field List

## ✅ All Information is Now Exported to CSV

All requested telemetry data is now included in the CSV export. Here's what's included:

---

## 1️⃣ Core Web Vitals + Resource Timing

**✅ EXPORTED in CSV:**

### Core Web Vitals:
- `LCP_ms` - Largest Contentful Paint
- `INP_ms` - Interaction to Next Paint
- `CLS` - Cumulative Layout Shift
- `TTFB_ms` - Time to First Byte
- `FCP_ms` - First Contentful Paint
- `DOMContentLoaded_ms` - DOM Content Loaded time
- `Load_ms` - Full page load time
- `time_to_interactive_ms` - Time to interactive

### Resource Timing Summary:
- `resource_timing_avg_total_ms` - Average total request time
- `resource_timing_avg_transfer_kb` - Average transfer size
- `resource_timing_total_requests` - Total number of requests
- `resource_timing_cache_hit_ratio` - Cache hit ratio (0-1)
- `resource_timing_avg_status_code` - Average HTTP status code

**Note**: Per-request details (status_code, cache_status per resource) are collected but exported as aggregated summaries. For detailed per-request data, use the JSON export or access `networkTelemetry.getResourceTimings()`.

---

## 2️⃣ Connection-Aware UX Detection

**✅ EXPORTED in CSV:**

- `connection_tier` - Connection tier classification (A/B/C)
  - **A**: Fast (RTT < 100ms, downlink > 5 Mbps)
  - **B**: Medium (RTT 100-150ms, downlink 2-5 Mbps)
  - **C**: Slow (RTT ≥ 150ms OR downlink ≤ 2 Mbps)
- `slow_connection_detected` - Boolean flag (true if RTT ≥ 150ms OR downlink ≤ 2 Mbps)

**Usage**: Filter by `slow_connection_detected = true` to identify sessions needing lighter payloads.

---

## 3️⃣ Stabilized Environment Fields in Continuous Events

**✅ EXPORTED in CSV:**

These fields are now **stabilized** (populated) in continuous records to explain variance:

- `browser_name` - Browser name (stabilized)
- `browser_version` - Browser version (stabilized)
- `gpu_renderer` - GPU renderer (stabilized)
- `device_class` - Device class (stabilized)
- `platform` - Platform (stabilized)
- `architecture` - Architecture (stabilized)
- `hardware_acceleration` - Hardware acceleration enabled (stabilized)
- `renderer_path` - Renderer path: hardware/software/virtual (stabilized)

**Why**: This allows you to correlate performance metrics (e.g., INP_ms) with renderer differences (SwiftShader vs hardware) in continuous records.

---

## 4️⃣ Outcome Signals (Product Outcomes & Engagement)

**✅ EXPORTED in CSV:**

- `user_id_hash` - Hashed user identifier
- `tenant_id` - Tenant/account ID (B2B)
- `session_start` - Session start timestamp
- `session_end` - Session end timestamp
- `session_duration_sec` - Total session duration
- `feature_used` - Latest feature used in session
- `conversion_event` - Latest conversion event
- `conversion_value` - Value associated with conversion
- `dwell_time_sec` - Time spent in session
- `scroll_depth_pct` - Scroll depth percentage (0-100)
- `click_count` - Total click count

**Usage**: Correlate technical metrics (LCP_ms, RTT) with business outcomes (conversion_event, conversion_value).

---

## 📊 Complete CSV Column List

The CSV now includes **310+ columns** (up from 289):

### Original 289 columns (from DATA_SCHEMA.md)
- All static device/browser/display fields
- All continuous network/memory/performance fields
- All permission-based fields
- All inferred/risk score fields
- All governance/audit fields

### New 21+ columns added:
1. `connection_tier` - Connection tier (A/B/C)
2. `slow_connection_detected` - Slow connection flag
3. `LCP_ms` - Largest Contentful Paint
4. `INP_ms` - Interaction to Next Paint
5. `CLS` - Cumulative Layout Shift
6. `TTFB_ms` - Time to First Byte
7. `FCP_ms` - First Contentful Paint
8. `DOMContentLoaded_ms` - DOM ready time
9. `Load_ms` - Full load time
10. `time_to_interactive_ms` - Time to interactive
11. `hardware_acceleration` - Hardware acceleration enabled
12. `renderer_path` - Renderer path
13. `resource_timing_avg_total_ms` - Avg request time
14. `resource_timing_avg_transfer_kb` - Avg transfer size
15. `resource_timing_total_requests` - Total requests
16. `resource_timing_cache_hit_ratio` - Cache hit ratio
17. `resource_timing_avg_status_code` - Avg status code
18. `user_id_hash` - Hashed user ID
19. `tenant_id` - Tenant ID
20. `session_start` - Session start
21. `session_end` - Session end
22. `session_duration_sec` - Session duration
23. `feature_used` - Latest feature
24. `conversion_event` - Latest conversion
25. `conversion_value` - Conversion value
26. `dwell_time_sec` - Dwell time
27. `scroll_depth_pct` - Scroll depth
28. `click_count` - Click count

---

## 🔍 How to Use in Excel

### 1. **Quantify Network Impact on UX**
```excel
Filter: slow_connection_detected = true
Columns: LCP_ms, INP_ms, TTFB_ms, rtt_ms, downlink_mbps
```
Shows how slow connections (tier B/C) impact Core Web Vitals.

### 2. **Correlate Performance with Renderer**
```excel
Pivot: renderer_path vs INP_ms
Group by: browser_name, hardware_acceleration
```
Proves whether SwiftShader penalizes interaction latency.

### 3. **Link Tech Metrics to Business Outcomes**
```excel
Scatter Chart: LCP_ms (X) vs conversion_value (Y)
Filter: conversion_event IS NOT NULL
```
Shows if slow LCP impacts conversions.

### 4. **Resource Timing Analysis**
```excel
Filter: resource_timing_cache_hit_ratio < 0.5
Columns: resource_timing_avg_total_ms, resource_timing_total_requests
```
Identifies cache miss issues affecting performance.

---

## ✅ Verification Checklist

- [x] Core Web Vitals (LCP, INP, CLS) exported
- [x] Navigation timings (TTFB, FCP, DOMContentLoaded, Load) exported
- [x] Resource timing summaries exported
- [x] Connection tier detection exported
- [x] Slow connection flag exported
- [x] Environment fields stabilized in continuous records
- [x] Product outcome signals exported
- [x] Engagement metrics exported
- [x] All fields included in CSV column headers
- [x] All fields included in Excel-like table display

---

## 📝 Notes

1. **Per-Request Details**: Individual resource timings with status_code and cache_status per request are collected but exported as **aggregated summaries** to keep CSV manageable. For detailed per-request analysis, use:
   ```javascript
   telemetry.networkTelemetry.getResourceTimings()
   ```

2. **Static vs Continuous**:
   - Static records: New fields are `null`
   - Continuous records: New fields are populated with actual values

3. **Stabilized Fields**: Environment fields (browser_name, gpu_renderer, etc.) are now populated in continuous records to enable variance analysis.

4. **Connection-Aware UX**: The `slow_connection_detected` flag can be used to trigger lighter payloads, batched requests, and reduced polling in your application logic.

---

**All requested information is now exported to CSV!** 🎉
