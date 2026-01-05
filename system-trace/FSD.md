Below is the **FINAL, EXCEL-READY COLUMN HEADER FILE** aligned with the **revised FSD** (permission-based fully merged into Static / Continuous / Inferred).

You can **copy-paste this directly into Excel (Row 1)**.
This is a **single flat schema**, analytics-friendly, audit-safe, and scalable.

---

# 📊 FINAL EXCEL COLUMN HEADER FILE

## Client / Agent Telemetry – High Scrutiny Mode

---

## 1️⃣ Record & Session Metadata

```
record_id
session_id
user_id
agent_id
record_type                (STATIC / CONTINUOUS)
collected_at
page_url
app_name
app_version
environment                (PROD / UAT / QA)
```

---

## 2️⃣ Static – Device & Hardware

```
platform
architecture
cpu_cores
device_memory_gb
gpu_vendor
gpu_renderer
device_class               (Desktop / Laptop / Mobile)
touch_supported
max_touch_points
battery_supported
```

---

## 3️⃣ Static – Display & Visual

```
screen_width
screen_height
avail_width
avail_height
pixel_ratio
color_depth
color_gamut                (sRGB / P3)
hdr_supported
```

---

## 4️⃣ Static – Browser, Runtime & Locale

```
browser_name
browser_version
rendering_engine
js_engine_inferred
user_agent
ua_arch
language
languages
timezone_offset_minutes
do_not_track
pdf_viewer_enabled
```

---

## 5️⃣ Static – Web API & Capability Surface

```
api_webgl
api_webgl2
api_webgpu
api_webrtc
api_wasm
api_service_worker
api_push
api_bg_sync
api_media_devices
api_clipboard
api_webauthn
api_payment_request
api_file_system_access
api_offscreen_canvas
api_audio_context
api_indexeddb
api_shared_array_buffer
api_drm_supported
```

---

## 6️⃣ Static – Permission-Aware Capabilities

```
camera_available
camera_device_count
microphone_available
microphone_device_count
location_capable
advanced_device_capable     (Bluetooth/USB/HID/NFC)
```

---

## 7️⃣ Continuous – Network Metrics

```
online
effective_connection_type
rtt_ms
downlink_mbps
rtt_jitter_ms
network_change_count
save_data_enabled
```

---

## 8️⃣ Continuous – Browser Resource & Load

```
js_heap_limit_mb
js_heap_total_mb
js_heap_used_mb
heap_growth_mb
event_loop_delay_ms
long_task_count
timer_throttling_detected
```

---

## 9️⃣ Continuous – Page, Focus & Engagement

```
tab_visibility              (visible / hidden)
window_has_focus
foreground_time_sec
background_time_sec
idle_time_sec
focus_loss_count
```

---

## 🔟 Continuous – Camera Activity (If Permission Granted)

```
camera_permission
camera_active
camera_active_ratio
camera_fps
camera_fps_drops
camera_freeze_events
camera_switch_count
virtual_camera_suspected
```

---

## 1️⃣1️⃣ Continuous – Microphone Activity (If Permission Granted)

```
mic_permission
mic_active
mic_activity_ratio
mic_volume_avg
mic_silence_ratio
background_noise_level      (Low / Medium / High)
mic_mute_toggle_count
```

---

## 1️⃣2️⃣ Continuous – Screen / Tab Share Activity (If Permission Granted)

```
screen_share_permission
screen_share_active
screen_share_type           (Screen / Window / Tab)
screen_share_resolution
screen_share_fps
screen_freeze_events
screen_focus_loss_count
screen_share_interruptions
```

---

## 1️⃣3️⃣ Continuous – Location Runtime (If Permission Granted)

```
location_permission
latitude
longitude
location_accuracy_m
movement_speed_mps
location_change_count
geofence_violation
```

---

## 1️⃣4️⃣ Continuous – Clipboard & File Interaction (If Permission Granted)

```
clipboard_permission
copy_event_count
paste_event_count
file_upload_count
file_type
file_size_kb
file_checksum
file_reuse_detected
aborted_upload_count
```

---

## 1️⃣5️⃣ Continuous – Advanced Device Interaction (If Used)

```
advanced_device_used
advanced_device_type         (Bluetooth / USB / HID / NFC)
device_vendor_id
device_product_id
device_interaction_count
device_disconnect_count
```

---

## 1️⃣6️⃣ Inferred – Agent Presence & Behaviour

```
screen_presence_ratio
camera_presence_ratio
mic_presence_ratio
idle_ratio
multitasking_likelihood     (Low / Medium / High)
```

---

## 1️⃣7️⃣ Inferred – Session Integrity & Network Quality

```
network_stability_score
session_reliability_score
throttling_likelihood       (Low / Medium / High)
device_stability_score
```

---

## 1️⃣8️⃣ Inferred – Supervision & Risk Scores

```
agent_presence_score
session_integrity_score
network_reliability_score
composite_agent_risk_score
risk_level                  (Low / Medium / High / Critical)
```

---

## 1️⃣9️⃣ Governance & Audit

```
consent_version
consent_timestamp
data_retention_policy
audit_reference_id
```

---

# ✅ HOW TO USE THIS IN EXCEL (Recommended)

* **Row 1** → Paste all headers
* **One row per record**

  * STATIC → once per session
  * CONTINUOUS → every N seconds
* Use **Pivot Tables** on:

  * `agent_id`
  * `session_id`
  * `risk_level`
* Charts:

  * Presence vs Risk
  * Network stability vs Failures
  * Agent score distribution

---

## Final Compliance Note (Internal)

> This schema contains **only browser-exposed and consent-driven telemetry**, structured for analytics without requiring joins or enrichment, and is suitable for RBI / CERT-In audits.

---

### Next (If You Want)

* 📁 **Pre-filled Excel (.xlsx) template**
* 📈 **Ready-made pivot dashboards**
* 🧮 **Score calibration thresholds**
* 🧾 **Audit evidence checklist**

Just tell me what to deliver next.
