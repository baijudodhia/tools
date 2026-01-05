/**
 * Media / Real-Time Telemetry Module
 * WebRTC stats and playback metrics
 */

class MediaTelemetry {
  constructor() {
    this.webrtcStats = [];
    this.playbackStats = [];
    this.isCollectingWebRTC = false;
    this.webrtcInterval = null;
    this.peerConnections = new Map();
  }

  /**
   * Start collecting WebRTC stats
   */
  startWebRTCCollection(peerConnection, intervalMs = 10000) {
    if (this.isCollectingWebRTC) return;

    this.isCollectingWebRTC = true;
    this.webrtcInterval = setInterval(() => {
      this.collectWebRTCStats(peerConnection);
    }, intervalMs);

    // Collect immediately
    this.collectWebRTCStats(peerConnection);
  }

  /**
   * Stop WebRTC collection
   */
  stopWebRTCCollection() {
    if (this.webrtcInterval) {
      clearInterval(this.webrtcInterval);
      this.webrtcInterval = null;
    }
    this.isCollectingWebRTC = false;
  }

  /**
   * Collect WebRTC statistics
   */
  async collectWebRTCStats(peerConnection) {
    if (!peerConnection || peerConnection.connectionState === 'closed') {
      return;
    }

    try {
      const stats = await peerConnection.getStats();
      const statsData = {};

      stats.forEach(report => {
        statsData[report.id] = report;
      });

      // Extract audio stats
      const audioStats = this.extractAudioStats(statsData);

      // Extract video stats
      const videoStats = this.extractVideoStats(statsData);

      // Extract connection stats
      const connectionStats = this.extractConnectionStats(statsData);

      const webrtcEvent = {
        event: 'webrtc_stats',
        session_id: this.sessionId,
        rtt_ms: connectionStats.rtt || null,
        jitter_ms: connectionStats.jitter || null,
        packet_loss_pct: connectionStats.packetLoss || null,
        audio_bitrate_kbps: audioStats.bitrate || null,
        video_bitrate_kbps: videoStats.bitrate || null,
        audio_level_avg: audioStats.level || null,
        concealed_samples_pct: audioStats.concealedSamples || null,
        echo_cancellation_on: audioStats.echoCancellation || null,
        frame_rate_fps: videoStats.frameRate || null,
        render_resolution: videoStats.resolution || null,
        decoder_drops: videoStats.decoderDrops || null,
        freeze_count: videoStats.freezeCount || null,
        mean_freeze_duration_ms: videoStats.meanFreezeDuration || null,
        mos_estimate: this.calculateMOS(connectionStats, audioStats, videoStats),
        timestamp: new Date().toISOString()
      };

      this.webrtcStats.push(webrtcEvent);
      return webrtcEvent;
    } catch (error) {
      console.error('Error collecting WebRTC stats:', error);
      return null;
    }
  }

  /**
   * Extract audio statistics
   */
  extractAudioStats(statsData) {
    let bitrate = null;
    let level = null;
    let concealedSamples = null;
    let echoCancellation = null;

    for (const [id, report] of Object.entries(statsData)) {
      if (report.type === 'media-source' && report.kind === 'audio') {
        level = report.audioLevel || null;
      }
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        bitrate = report.bytesReceived ? (report.bytesReceived * 8 / 1000) : null;
        concealedSamples = report.concealedSamples ?
          (report.concealedSamples / (report.samplesReceived || 1)) * 100 : null;
      }
      if (report.type === 'media-source' && report.echoCancellation !== undefined) {
        echoCancellation = report.echoCancellation;
      }
    }

    return { bitrate, level, concealedSamples, echoCancellation };
  }

  /**
   * Extract video statistics
   */
  extractVideoStats(statsData) {
    let bitrate = null;
    let frameRate = null;
    let resolution = null;
    let decoderDrops = null;
    let freezeCount = 0;
    let meanFreezeDuration = null;

    for (const [id, report] of Object.entries(statsData)) {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        bitrate = report.bytesReceived ? (report.bytesReceived * 8 / 1000) : null;
        frameRate = report.framesPerSecond || report.framesReceived ?
          (report.framesReceived / ((Date.now() - report.timestamp) / 1000)) : null;
      }
      if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
        resolution = report.frameWidth && report.frameHeight ?
          `${report.frameWidth}x${report.frameHeight}` : null;
      }
      if (report.type === 'track' && report.kind === 'video') {
        decoderDrops = report.framesDropped || null;
        freezeCount = report.freezeCount || 0;
        meanFreezeDuration = report.meanFreezeDuration || null;
      }
    }

    return { bitrate, frameRate, resolution, decoderDrops, freezeCount, meanFreezeDuration };
  }

  /**
   * Extract connection statistics
   */
  extractConnectionStats(statsData) {
    let rtt = null;
    let jitter = null;
    let packetLoss = null;

    for (const [id, report] of Object.entries(statsData)) {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : null;
      }
      if (report.type === 'inbound-rtp') {
        jitter = report.jitter ? report.jitter * 1000 : null;
        if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
          const total = report.packetsLost + report.packetsReceived;
          packetLoss = total > 0 ? (report.packetsLost / total) * 100 : null;
        }
      }
    }

    return { rtt, jitter, packetLoss };
  }

  /**
   * Calculate MOS (Mean Opinion Score) estimate
   */
  calculateMOS(connectionStats, audioStats, videoStats) {
    // Simplified MOS calculation based on RTT, jitter, packet loss
    let mos = 5.0; // Start with perfect score

    // RTT impact
    if (connectionStats.rtt) {
      if (connectionStats.rtt > 300) mos -= 1.5;
      else if (connectionStats.rtt > 150) mos -= 0.8;
      else if (connectionStats.rtt > 100) mos -= 0.3;
    }

    // Jitter impact
    if (connectionStats.jitter) {
      if (connectionStats.jitter > 50) mos -= 1.0;
      else if (connectionStats.jitter > 30) mos -= 0.5;
      else if (connectionStats.jitter > 15) mos -= 0.2;
    }

    // Packet loss impact
    if (connectionStats.packetLoss) {
      if (connectionStats.packetLoss > 5) mos -= 1.5;
      else if (connectionStats.packetLoss > 2) mos -= 0.8;
      else if (connectionStats.packetLoss > 1) mos -= 0.3;
    }

    // Video freeze impact
    if (videoStats.freezeCount > 5) mos -= 1.0;
    else if (videoStats.freezeCount > 2) mos -= 0.5;

    return Math.max(1.0, Math.min(5.0, Math.round(mos * 10) / 10));
  }

  /**
   * Track playback metrics (for video/audio playback)
   */
  trackPlayback(mediaElement, metadata = {}) {
    const playback = {
      event: 'playback_stats',
      session_id: this.sessionId,
      startup_time_ms: null,
      rebuffer_count: 0,
      rebuffer_ratio_pct: 0,
      avg_bitrate_kbps: null,
      drm_used: metadata.drmUsed || false,
      timestamp: new Date().toISOString()
    };

    // Track startup time
    const startTime = performance.now();
    mediaElement.addEventListener('canplay', () => {
      playback.startup_time_ms = Math.round(performance.now() - startTime);
    }, { once: true });

    // Track rebuffering
    let rebufferStart = null;
    let totalRebufferTime = 0;

    mediaElement.addEventListener('waiting', () => {
      rebufferStart = performance.now();
    });

    mediaElement.addEventListener('playing', () => {
      if (rebufferStart) {
        totalRebufferTime += performance.now() - rebufferStart;
        playback.rebuffer_count++;
        rebufferStart = null;
      }
    });

    // Calculate rebuffer ratio
    mediaElement.addEventListener('ended', () => {
      const duration = mediaElement.duration;
      if (duration > 0) {
        playback.rebuffer_ratio_pct = Math.round((totalRebufferTime / (duration * 1000)) * 100 * 100) / 100;
      }
      this.playbackStats.push(playback);
    });

    return playback;
  }

  /**
   * Get all WebRTC stats
   */
  getWebRTCStats() {
    return this.webrtcStats;
  }

  /**
   * Get playback stats
   */
  getPlaybackStats() {
    return this.playbackStats;
  }

  /**
   * Get latest WebRTC stats
   */
  getLatestWebRTCStats() {
    return this.webrtcStats.length > 0
      ? this.webrtcStats[this.webrtcStats.length - 1]
      : null;
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }
}
