# 📊 Excel Pivot Table Guide for System Trace Telemetry

This guide outlines the recommended pivot tables you can create with the exported Excel data.

---

## 🎯 Recommended Pivot Tables (Per DATA_SCHEMA.md)

### 1. **Agent Analysis by Risk Level**
**Purpose**: Identify high-risk agents and sessions

**Rows**: `agent_id`, `session_id`
**Columns**: `risk_level`
**Values**:
- Count of `record_id`
- Average `composite_agent_risk_score`
- Average `agent_presence_score`
- Average `session_integrity_score`

**Filters**: `environment`, `record_type = CONTINUOUS`

**Use Cases**:
- Identify agents with consistently high risk scores
- Track risk trends over time
- Flag sessions requiring investigation

---

### 2. **Session Reliability by Agent**
**Purpose**: Monitor session quality per agent

**Rows**: `agent_id`, `session_id`
**Columns**: `record_type`
**Values**:
- Average `session_reliability_score`
- Average `network_stability_score`
- Average `network_reliability_score`
- Count of network disconnections (`online = false`)

**Filters**: `environment = PROD`

**Use Cases**:
- Identify agents with poor network connectivity
- Track session quality metrics
- Detect infrastructure issues

---

### 3. **Device & Browser Capability Analysis**
**Purpose**: Understand device distribution and capabilities

**Rows**: `device_class`, `browser_name`, `browser_version`
**Columns**: `environment`
**Values**:
- Count of `record_id` (where `record_type = STATIC`)
- Count distinct `session_id`
- Average `cpu_cores`
- Average `device_memory_gb`

**Filters**: `record_type = STATIC`

**Use Cases**:
- Device compatibility analysis
- Browser version distribution
- Hardware capability assessment

---

### 4. **Permission Usage & Presence Analysis**
**Purpose**: Track camera/mic/screen share usage patterns

**Rows**: `agent_id`, `session_id`
**Columns**: `camera_permission`, `mic_permission`, `screen_share_permission`
**Values**:
- Average `camera_presence_ratio`
- Average `mic_presence_ratio`
- Average `screen_presence_ratio`
- Average `camera_active_ratio`
- Average `mic_activity_ratio`

**Filters**: `record_type = CONTINUOUS`, `camera_permission = granted` (or similar)

**Use Cases**:
- Monitor agent engagement with media features
- Detect unusual absence patterns
- Compliance tracking for required presence

---

### 5. **Network Quality by Connection Type**
**Purpose**: Analyze network performance by connection type

**Rows**: `effective_connection_type`, `environment`
**Columns**: `risk_level`
**Values**:
- Average `rtt_ms`
- Average `rtt_jitter_ms`
- Average `downlink_mbps`
- Average `network_stability_score`
- Count of `network_change_count`

**Filters**: `record_type = CONTINUOUS`, `online = true`

**Use Cases**:
- Network performance benchmarking
- Identify connection quality issues
- Correlate network quality with risk scores

---

### 6. **Performance & Throttling Analysis**
**Purpose**: Detect performance degradation and throttling

**Rows**: `agent_id`, `device_class`
**Columns**: `throttling_likelihood`, `timer_throttling_detected`
**Values**:
- Count of records where `timer_throttling_detected = true`
- Average `event_loop_delay_ms`
- Average `long_task_count`
- Average `js_heap_used_mb`
- Average `heap_growth_mb`

**Filters**: `record_type = CONTINUOUS`

**Use Cases**:
- Identify devices with performance issues
- Detect browser throttling patterns
- Memory leak detection

---

### 7. **Focus Loss & Multitasking Analysis**
**Purpose**: Track user engagement and multitasking behavior

**Rows**: `agent_id`, `session_id`
**Columns**: `multitasking_likelihood`
**Values**:
- Sum of `focus_loss_count`
- Average `idle_ratio`
- Average `screen_presence_ratio`
- Average `foreground_time_sec`
- Average `background_time_sec`

**Filters**: `record_type = CONTINUOUS`

**Use Cases**:
- Detect agents with excessive multitasking
- Monitor engagement levels
- Flag suspicious behavior patterns

---

### 8. **Camera & Microphone Quality Analysis**
**Purpose**: Monitor media quality and detect anomalies

**Rows**: `agent_id`, `session_id`
**Columns**: `virtual_camera_suspected`
**Values**:
- Average `camera_fps`
- Sum of `camera_fps_drops`
- Sum of `camera_freeze_events`
- Average `mic_volume_avg`
- Average `mic_silence_ratio`
- Average `background_noise_level`

**Filters**: `record_type = CONTINUOUS`, `camera_permission = granted`, `mic_permission = granted`

**Use Cases**:
- Detect virtual camera usage (fraud detection)
- Monitor media quality issues
- Identify technical problems

---

### 9. **Geographic & Location Analysis**
**Purpose**: Track location patterns and geofence violations

**Rows**: `agent_id`, `session_id`
**Columns**: `geofence_violation`
**Values**:
- Count of `location_change_count`
- Average `movement_speed_mps`
- Average `location_accuracy_m`
- Count distinct `latitude` / `longitude` pairs

**Filters**: `record_type = CONTINUOUS`, `location_permission = granted`

**Use Cases**:
- Detect unauthorized location changes
- Monitor agent mobility
- Geofence compliance tracking

---

### 10. **File Upload & Clipboard Activity**
**Purpose**: Monitor file interactions and clipboard usage

**Rows**: `agent_id`, `session_id`
**Columns**: `file_reuse_detected`
**Values**:
- Sum of `file_upload_count`
- Sum of `copy_event_count`
- Sum of `paste_event_count`
- Average `file_size_kb`
- Count distinct `file_type`

**Filters**: `record_type = CONTINUOUS`

**Use Cases**:
- Detect file reuse patterns
- Monitor clipboard activity
- Security audit for file operations

---

### 11. **Time-Based Risk Trend Analysis**
**Purpose**: Track risk scores over time

**Rows**: `collected_at` (grouped by hour/day)
**Columns**: `risk_level`
**Values**:
- Average `composite_agent_risk_score`
- Count of `record_id`
- Average `agent_presence_score`
- Average `session_integrity_score`

**Filters**: `record_type = CONTINUOUS`, `environment = PROD`

**Use Cases**:
- Identify peak risk periods
- Track risk trends over time
- Correlate with business hours/events

---

### 12. **Device Stability & Consistency**
**Purpose**: Identify device fingerprint inconsistencies

**Rows**: `agent_id`, `session_id`
**Columns**: `device_stability_score`
**Values**:
- Average `device_stability_score`
- Count of distinct `gpu_renderer` per session
- Count of distinct `js_heap_limit_mb` per session
- Average `fingerprint_consistency_score` (if calculated)

**Filters**: `record_type = CONTINUOUS`

**Use Cases**:
- Detect device switching
- Identify VM/sandbox environments
- Fraud detection through fingerprint analysis

---

### 13. **Browser Resource Usage by Device Class**
**Purpose**: Analyze memory and performance by device type

**Rows**: `device_class`, `browser_name`
**Columns**: `risk_level`
**Values**:
- Average `js_heap_used_mb`
- Average `js_heap_limit_mb`
- Average `heap_growth_mb`
- Average `event_loop_delay_ms`

**Filters**: `record_type = CONTINUOUS`, `memory.available = true`

**Use Cases**:
- Identify memory pressure by device type
- Browser performance comparison
- Device capability assessment

---

### 14. **Screen Share Quality & Interruptions**
**Purpose**: Monitor screen sharing reliability

**Rows**: `agent_id`, `session_id`
**Columns**: `screen_share_type`
**Values**:
- Average `screen_share_fps`
- Sum of `screen_freeze_events`
- Sum of `screen_share_interruptions`
- Average `screen_focus_loss_count`

**Filters**: `record_type = CONTINUOUS`, `screen_share_permission = granted`

**Use Cases**:
- Monitor screen share quality
- Detect technical issues
- Track interruption patterns

---

### 15. **Composite Risk Score Distribution**
**Purpose**: Overall risk assessment overview

**Rows**: `risk_level`
**Columns**: `environment`
**Values**:
- Count of `record_id`
- Count distinct `agent_id`
- Count distinct `session_id`
- Average `composite_agent_risk_score`
- Min/Max `composite_agent_risk_score`

**Filters**: `record_type = CONTINUOUS`

**Use Cases**:
- High-level risk overview
- Risk distribution analysis
- Compliance reporting

---

## 📈 Recommended Charts

### 1. **Presence vs Risk Scatter Chart**
- X-axis: `screen_presence_ratio`
- Y-axis: `composite_agent_risk_score`
- Color by: `risk_level`
- Use: Identify correlation between presence and risk

### 2. **Network Stability vs Failures**
- X-axis: `network_stability_score`
- Y-axis: Count of `online = false`
- Group by: `effective_connection_type`
- Use: Network quality analysis

### 3. **Agent Score Distribution**
- Chart type: Histogram
- Values: `composite_agent_risk_score`
- Group by: `risk_level`
- Use: Risk score distribution visualization

### 4. **Time Series Risk Trends**
- X-axis: `collected_at` (time)
- Y-axis: Average `composite_agent_risk_score`
- Group by: `agent_id` or `risk_level`
- Use: Track risk trends over time

### 5. **Device Capability Heatmap**
- Rows: `device_class`
- Columns: `browser_name`
- Values: Average `cpu_cores`, `device_memory_gb`
- Use: Device capability visualization

---

## 🔍 Advanced Analysis Tips

### 1. **Combined Filters**
Use multiple filters together:
- `risk_level = High` AND `multitasking_likelihood = High`
- `virtual_camera_suspected = true` AND `camera_active_ratio < 0.5`
- `timer_throttling_detected = true` AND `device_class = Mobile`

### 2. **Calculated Fields**
Create calculated fields in Excel:
- **Risk-to-Presence Ratio**: `composite_agent_risk_score / screen_presence_ratio`
- **Network Quality Index**: `(network_stability_score + session_reliability_score) / 2`
- **Engagement Score**: `(screen_presence_ratio + camera_presence_ratio + mic_presence_ratio) / 3`

### 3. **Slicers**
Add slicers for interactive filtering:
- `environment` (PROD/UAT/QA)
- `risk_level`
- `device_class`
- `browser_name`
- `effective_connection_type`

### 4. **Timeline Slicer**
Use Excel's Timeline slicer on `collected_at` to:
- Filter by date ranges
- Analyze trends over specific periods
- Compare time-based patterns

---

## 📋 Quick Reference: Key Metrics by Use Case

### **Fraud Detection**
- `virtual_camera_suspected`
- `device_stability_score` (low = suspicious)
- `fingerprint_consistency_score` (low = suspicious)
- `multitasking_likelihood = High` with `screen_presence_ratio < 0.3`

### **Performance Monitoring**
- `event_loop_delay_ms`
- `timer_throttling_detected`
- `heap_growth_mb`
- `long_task_count`

### **Network Quality**
- `network_stability_score`
- `rtt_jitter_ms`
- `network_change_count`
- `session_reliability_score`

### **Agent Engagement**
- `screen_presence_ratio`
- `camera_presence_ratio`
- `mic_presence_ratio`
- `idle_ratio`
- `focus_loss_count`

### **Compliance & Audit**
- `consent_version`
- `consent_timestamp`
- `audit_reference_id`
- `data_retention_policy`

---

## ✅ Best Practices

1. **Always filter by `record_type`** - Separate STATIC and CONTINUOUS records
2. **Use `session_id` for session-level analysis** - Aggregate continuous records per session
3. **Group by `agent_id` for agent-level insights** - Track patterns across sessions
4. **Include `environment` filter** - Separate PROD from UAT/QA data
5. **Use date grouping on `collected_at`** - Analyze trends over time
6. **Combine multiple metrics** - Risk scores are more meaningful with context

---

## 🎯 Sample Pivot Table Setup (Excel Steps)

1. **Select your data range** (all exported rows)
2. **Insert → PivotTable**
3. **Choose fields**:
   - Drag `agent_id` to Rows
   - Drag `risk_level` to Columns
   - Drag `composite_agent_risk_score` to Values (set to Average)
   - Drag `record_id` to Values (set to Count)
4. **Add filters**:
   - Drag `record_type` to Filters, select "CONTINUOUS"
   - Drag `environment` to Filters, select "PROD"
5. **Format**:
   - Right-click Values → Number Format → 2 decimals
   - Apply conditional formatting to highlight high-risk scores

---

This pivot table guide provides comprehensive analysis capabilities for your telemetry data, enabling fraud detection, performance monitoring, and compliance reporting.
