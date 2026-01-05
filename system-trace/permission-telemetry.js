/**
 * Permission-Based Continuous Telemetry Module
 * Monitors camera, microphone, screen share, location, clipboard, and advanced devices
 * Only collects data if permissions are granted
 */

class PermissionTelemetry {
  constructor() {
    this.camera = {
      stream: null,
      active: false,
      permission: null,
      activeRatio: 0,
      fps: 0,
      fpsDrops: 0,
      freezeEvents: 0,
      switchCount: 0,
      virtualCameraSuspected: false,
      startTime: null,
      activeTime: 0,
      totalTime: 0,
      lastFrameTime: null,
      frameCount: 0
    };

    this.microphone = {
      stream: null,
      active: false,
      permission: null,
      activityRatio: 0,
      volumeAvg: 0,
      silenceRatio: 0,
      backgroundNoiseLevel: 'Low',
      muteToggleCount: 0,
      startTime: null,
      activeTime: 0,
      totalTime: 0,
      volumeHistory: [],
      lastMuteState: null
    };

    this.screenShare = {
      stream: null,
      active: false,
      permission: null,
      type: null,
      resolution: null,
      fps: 0,
      freezeEvents: 0,
      focusLossCount: 0,
      interruptions: 0,
      startTime: null,
      lastFrameTime: null,
      frameCount: 0
    };

    this.location = {
      permission: null,
      watchId: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      movementSpeed: 0,
      locationChangeCount: 0,
      geofenceViolation: false,
      lastLocation: null,
      lastLocationTime: null
    };

    this.clipboard = {
      permission: null,
      copyEventCount: 0,
      pasteEventCount: 0,
      fileUploadCount: 0,
      fileType: null,
      fileSizeKB: 0,
      fileChecksum: null,
      fileReuseDetected: false,
      abortedUploadCount: 0,
      uploadedFiles: []
    };

    this.advancedDevices = {
      used: false,
      type: null,
      vendorId: null,
      productId: null,
      interactionCount: 0,
      disconnectCount: 0,
      devices: []
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Clipboard events
    document.addEventListener('copy', () => {
      this.clipboard.copyEventCount++;
    });

    document.addEventListener('paste', () => {
      this.clipboard.pasteEventCount++;
    });

    // File upload events
    document.addEventListener('change', (e) => {
      if (e.target.type === 'file' && e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });
  }

  /**
   * Camera Monitoring
   */
  async startCameraMonitoring() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.camera.stream = stream;
      this.camera.active = true;
      this.camera.permission = 'granted';
      this.camera.startTime = Date.now();
      this.camera.lastFrameTime = Date.now();

      const track = stream.getVideoTracks()[0];
      if (track) {
        // Monitor camera switches
        track.addEventListener('ended', () => {
          this.camera.switchCount++;
        });

        // Detect virtual cameras (heuristic)
        const settings = track.getSettings();
        if (settings.deviceId && settings.deviceId.includes('virtual') ||
            settings.label && settings.label.toLowerCase().includes('virtual')) {
          this.camera.virtualCameraSuspected = true;
        }
      }

      // Monitor frame rate
      this.monitorCameraFPS();
    } catch (error) {
      this.camera.permission = error.name === 'NotAllowedError' ? 'denied' : 'error';
      this.camera.active = false;
    }
  }

  stopCameraMonitoring() {
    if (this.camera.stream) {
      this.camera.stream.getTracks().forEach(track => track.stop());
      this.camera.stream = null;
      this.camera.active = false;
    }
  }

  monitorCameraFPS() {
    if (!this.camera.active) return;

    const now = Date.now();
    this.camera.frameCount++;

    if (this.camera.lastFrameTime) {
      const frameTime = now - this.camera.lastFrameTime;
      const expectedFrameTime = 1000 / 30; // 30fps target

      if (frameTime > expectedFrameTime * 2) {
        this.camera.fpsDrops++;
        this.camera.freezeEvents++;
      }
    }

    this.camera.lastFrameTime = now;
    this.camera.fps = Math.round((this.camera.frameCount / ((now - this.camera.startTime) / 1000)) * 10) / 10;

    if (this.camera.active) {
      setTimeout(() => this.monitorCameraFPS(), 1000);
    }
  }

  getCameraMetrics() {
    if (this.camera.permission === null) {
      return {
        camera_permission: null,
        camera_active: false,
        camera_active_ratio: 0,
        camera_fps: 0,
        camera_fps_drops: 0,
        camera_freeze_events: 0,
        camera_switch_count: 0,
        virtual_camera_suspected: false
      };
    }

    const totalTime = (Date.now() - (this.camera.startTime || Date.now())) / 1000;
    const activeRatio = this.camera.active && totalTime > 0
      ? Math.round((this.camera.activeTime / totalTime) * 100) / 100
      : 0;

    return {
      camera_permission: this.camera.permission,
      camera_active: this.camera.active,
      camera_active_ratio: activeRatio,
      camera_fps: this.camera.fps,
      camera_fps_drops: this.camera.fpsDrops,
      camera_freeze_events: this.camera.freezeEvents,
      camera_switch_count: this.camera.switchCount,
      virtual_camera_suspected: this.camera.virtualCameraSuspected
    };
  }

  /**
   * Microphone Monitoring
   */
  async startMicrophoneMonitoring() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphone.stream = stream;
      this.microphone.active = true;
      this.microphone.permission = 'granted';
      this.microphone.startTime = Date.now();

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      this.monitorMicrophoneVolume(analyser);
    } catch (error) {
      this.microphone.permission = error.name === 'NotAllowedError' ? 'denied' : 'error';
      this.microphone.active = false;
    }
  }

  stopMicrophoneMonitoring() {
    if (this.microphone.stream) {
      this.microphone.stream.getTracks().forEach(track => track.stop());
      this.microphone.stream = null;
      this.microphone.active = false;
    }
  }

  monitorMicrophoneVolume(analyser) {
    if (!this.microphone.active) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    this.microphone.volumeHistory.push(average);

    if (this.microphone.volumeHistory.length > 100) {
      this.microphone.volumeHistory.shift();
    }

    this.microphone.volumeAvg = Math.round(
      this.microphone.volumeHistory.reduce((a, b) => a + b, 0) / this.microphone.volumeHistory.length
    );

    // Calculate silence ratio
    const silentFrames = this.microphone.volumeHistory.filter(v => v < 10).length;
    this.microphone.silenceRatio = Math.round((silentFrames / this.microphone.volumeHistory.length) * 100) / 100;

    // Determine background noise level
    if (average < 20) this.microphone.backgroundNoiseLevel = 'Low';
    else if (average < 50) this.microphone.backgroundNoiseLevel = 'Medium';
    else this.microphone.backgroundNoiseLevel = 'High';

    if (this.microphone.active) {
      setTimeout(() => this.monitorMicrophoneVolume(analyser), 100);
    }
  }

  getMicrophoneMetrics() {
    if (this.microphone.permission === null) {
      return {
        mic_permission: null,
        mic_active: false,
        mic_activity_ratio: 0,
        mic_volume_avg: 0,
        mic_silence_ratio: 0,
        background_noise_level: 'Low',
        mic_mute_toggle_count: 0
      };
    }

    const totalTime = (Date.now() - (this.microphone.startTime || Date.now())) / 1000;
    const activityRatio = this.microphone.active && totalTime > 0
      ? Math.round((this.microphone.activeTime / totalTime) * 100) / 100
      : 0;

    return {
      mic_permission: this.microphone.permission,
      mic_active: this.microphone.active,
      mic_activity_ratio: activityRatio,
      mic_volume_avg: this.microphone.volumeAvg,
      mic_silence_ratio: this.microphone.silenceRatio,
      background_noise_level: this.microphone.backgroundNoiseLevel,
      mic_mute_toggle_count: this.microphone.muteToggleCount
    };
  }

  /**
   * Screen Share Monitoring
   */
  async startScreenShareMonitoring() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      this.screenShare.stream = stream;
      this.screenShare.active = true;
      this.screenShare.permission = 'granted';
      this.screenShare.startTime = Date.now();
      this.screenShare.lastFrameTime = Date.now();

      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        this.screenShare.resolution = `${settings.width}x${settings.height}`;
        this.screenShare.type = settings.displaySurface || 'Screen';

        track.addEventListener('ended', () => {
          this.screenShare.interruptions++;
          this.screenShare.active = false;
        });
      }

      this.monitorScreenShareFPS();
    } catch (error) {
      this.screenShare.permission = error.name === 'NotAllowedError' ? 'denied' : 'error';
      this.screenShare.active = false;
    }
  }

  stopScreenShareMonitoring() {
    if (this.screenShare.stream) {
      this.screenShare.stream.getTracks().forEach(track => track.stop());
      this.screenShare.stream = null;
      this.screenShare.active = false;
    }
  }

  monitorScreenShareFPS() {
    if (!this.screenShare.active) return;

    const now = Date.now();
    this.screenShare.frameCount++;

    if (this.screenShare.lastFrameTime) {
      const frameTime = now - this.screenShare.lastFrameTime;
      if (frameTime > 200) { // More than 200ms = freeze
        this.screenShare.freezeEvents++;
      }
    }

    this.screenShare.lastFrameTime = now;
    this.screenShare.fps = Math.round((this.screenShare.frameCount / ((now - this.screenShare.startTime) / 1000)) * 10) / 10;

    if (this.screenShare.active) {
      setTimeout(() => this.monitorScreenShareFPS(), 1000);
    }
  }

  getScreenShareMetrics() {
    if (this.screenShare.permission === null) {
      return {
        screen_share_permission: null,
        screen_share_active: false,
        screen_share_type: null,
        screen_share_resolution: null,
        screen_share_fps: 0,
        screen_freeze_events: 0,
        screen_focus_loss_count: 0,
        screen_share_interruptions: 0
      };
    }

    return {
      screen_share_permission: this.screenShare.permission,
      screen_share_active: this.screenShare.active,
      screen_share_type: this.screenShare.type,
      screen_share_resolution: this.screenShare.resolution,
      screen_share_fps: this.screenShare.fps,
      screen_freeze_events: this.screenShare.freezeEvents,
      screen_focus_loss_count: this.screenShare.focusLossCount,
      screen_share_interruptions: this.screenShare.interruptions
    };
  }

  /**
   * Location Monitoring
   */
  async startLocationMonitoring() {
    if (!('geolocation' in navigator)) {
      this.location.permission = 'not_supported';
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      this.location.permission = 'granted';
      this.updateLocation(position);

      this.location.watchId = navigator.geolocation.watchPosition(
        (pos) => this.updateLocation(pos),
        (err) => {
          if (err.code === 1) this.location.permission = 'denied';
        },
        { enableHighAccuracy: true }
      );
    } catch (error) {
      this.location.permission = error.code === 1 ? 'denied' : 'error';
    }
  }

  stopLocationMonitoring() {
    if (this.location.watchId !== null) {
      navigator.geolocation.clearWatch(this.location.watchId);
      this.location.watchId = null;
    }
  }

  updateLocation(position) {
    if (this.location.lastLocation) {
      const distance = this.calculateDistance(
        this.location.lastLocation.latitude,
        this.location.lastLocation.longitude,
        position.coords.latitude,
        position.coords.longitude
      );
      const timeDelta = (Date.now() - this.location.lastLocationTime) / 1000;
      if (timeDelta > 0) {
        this.location.movementSpeed = Math.round((distance / timeDelta) * 100) / 100;
      }
      this.location.locationChangeCount++;
    }

    this.location.latitude = Math.round(position.coords.latitude * 1000000) / 1000000;
    this.location.longitude = Math.round(position.coords.longitude * 1000000) / 1000000;
    this.location.accuracy = Math.round(position.coords.accuracy);
    this.location.lastLocation = { latitude: this.location.latitude, longitude: this.location.longitude };
    this.location.lastLocationTime = Date.now();
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getLocationMetrics() {
    return {
      location_permission: this.location.permission,
      latitude: this.location.latitude,
      longitude: this.location.longitude,
      location_accuracy_m: this.location.accuracy,
      movement_speed_mps: this.location.movementSpeed,
      location_change_count: this.location.locationChangeCount,
      geofence_violation: this.location.geofenceViolation
    };
  }

  /**
   * Clipboard & File Interaction
   */
  handleFileUpload(file) {
    this.clipboard.fileUploadCount++;
    this.clipboard.fileType = file.type || 'unknown';
    this.clipboard.fileSizeKB = Math.round((file.size / 1024) * 100) / 100;

    // Calculate checksum (simplified - would use crypto API in production)
    this.calculateFileChecksum(file).then(checksum => {
      this.clipboard.fileChecksum = checksum;

      // Check for file reuse
      if (this.clipboard.uploadedFiles.includes(checksum)) {
        this.clipboard.fileReuseDetected = true;
      } else {
        this.clipboard.uploadedFiles.push(checksum);
      }
    });
  }

  async calculateFileChecksum(file) {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return `${file.name}_${file.size}_${file.lastModified}`;
    }
  }

  getClipboardMetrics() {
    return {
      clipboard_permission: this.clipboard.permission || (navigator.clipboard ? 'available' : 'not_supported'),
      copy_event_count: this.clipboard.copyEventCount,
      paste_event_count: this.clipboard.pasteEventCount,
      file_upload_count: this.clipboard.fileUploadCount,
      file_type: this.clipboard.fileType,
      file_size_kb: this.clipboard.fileSizeKB,
      file_checksum: this.clipboard.fileChecksum,
      file_reuse_detected: this.clipboard.fileReuseDetected,
      aborted_upload_count: this.clipboard.abortedUploadCount
    };
  }

  /**
   * Advanced Device Interaction
   */
  async checkAdvancedDevices() {
    // This would require actual device access
    // Placeholder for Bluetooth/USB/HID/NFC detection
    return {
      advanced_device_used: this.advancedDevices.used,
      advanced_device_type: this.advancedDevices.type,
      device_vendor_id: this.advancedDevices.vendorId,
      device_product_id: this.advancedDevices.productId,
      device_interaction_count: this.advancedDevices.interactionCount,
      device_disconnect_count: this.advancedDevices.disconnectCount
    };
  }

  /**
   * Get all permission-based metrics
   */
  getAllMetrics() {
    return {
      camera: this.getCameraMetrics(),
      microphone: this.getMicrophoneMetrics(),
      screenShare: this.getScreenShareMetrics(),
      location: this.getLocationMetrics(),
      clipboard: this.getClipboardMetrics(),
      advancedDevices: this.checkAdvancedDevices()
    };
  }

  /**
   * Cleanup all monitoring
   */
  cleanup() {
    this.stopCameraMonitoring();
    this.stopMicrophoneMonitoring();
    this.stopScreenShareMonitoring();
    this.stopLocationMonitoring();
  }
}
