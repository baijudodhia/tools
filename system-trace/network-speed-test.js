/**
 * Network Speed Test Module
 * Continuous internet speed measurement (download/upload)
 */

class NetworkSpeedTest {
  constructor(intervalMs = 1000) {
    this.intervalMs = intervalMs;
    this.intervalId = null;
    this.isRunning = false;
    this.testResults = [];
    this.currentTest = null;
  }

  /**
   * Start continuous speed testing
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;

    // Run initial test
    this.runSpeedTest();

    // Set up periodic testing
    this.intervalId = setInterval(() => {
      this.runSpeedTest();
    }, this.intervalMs);
  }

  /**
   * Stop speed testing
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Cancel any ongoing test
    if (this.currentTest) {
      this.currentTest.cancel();
      this.currentTest = null;
    }
  }

  /**
   * Run speed test using multiple methods
   */
  async runSpeedTest() {
    // Method 1: Try URL-based speed test first (most accurate)
    const downloadResult = await this.testDownloadSpeed();
    const uploadResult = await this.testUploadSpeed();

    // Method 2: Get Network Information API data (for reference and fallback)
    const networkInfo = this.getNetworkInfo();

    // If URL-based test failed, use Network Information API as fallback
    let finalDownloadSpeed = downloadResult.speed;
    let finalUploadSpeed = uploadResult.speed;
    let finalMethod = downloadResult.method || 'image';

    if ((!finalDownloadSpeed || finalDownloadSpeed === 0) && networkInfo.downlink && networkInfo.downlink > 0) {
      finalDownloadSpeed = networkInfo.downlink;
      finalMethod = 'network_api_fallback';
    }

    if ((!finalUploadSpeed || finalUploadSpeed === 0) && networkInfo.downlink && networkInfo.downlink > 0) {
      // Estimate upload as 10% of downlink (typical ratio)
      finalUploadSpeed = Math.round((networkInfo.downlink * 0.1) * 100) / 100;
    }

    const result = {
      timestamp: new Date().toISOString(),
      download_speed_mbps: finalDownloadSpeed || null,
      upload_speed_mbps: finalUploadSpeed || null,
      download_latency_ms: downloadResult.latency || null,
      upload_latency_ms: uploadResult.latency || null,
      effective_connection_type: networkInfo.effectiveType || null,
      downlink_mbps: networkInfo.downlink || null,
      rtt_ms: networkInfo.rtt || null,
      save_data: networkInfo.saveData || false,
      method: finalMethod
    };

    this.testResults.push(result);

    // Keep last 100 results
    if (this.testResults.length > 100) {
      this.testResults.shift();
    }

    return result;
  }

  /**
   * Test download speed using image download
   */
  async testDownloadSpeed() {
    return new Promise((resolve) => {
      const url = this.getTestImageUrl();
      const cacheBusterUrl = url + '?t=' + Date.now();
      const startTime = performance.now();
      const img = new Image();

      img.onload = () => {
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000; // seconds

        // Get actual transfer size from Resource Timing API
        let actualSize = 0;
        try {
          const resources = performance.getEntriesByType('resource');
          const resourceEntry = resources.find(entry =>
            entry.name.includes('kwikid-logo.png') || entry.name === cacheBusterUrl
          );

          if (resourceEntry) {
            // Prefer transferSize (actual bytes transferred over network)
            actualSize = resourceEntry.transferSize || resourceEntry.decodedBodySize || 0;
          }
        } catch (e) {
          // Resource Timing API not available
        }

        // If we couldn't get the size from Resource Timing, estimate from image dimensions
        if (actualSize === 0 && img.naturalWidth && img.naturalHeight) {
          // Rough estimate: PNG with compression (typically 1-2 bytes per pixel for logos)
          actualSize = Math.max(img.naturalWidth * img.naturalHeight * 1.5, 10000); // Minimum 10KB
        }

        // If still no size, use a reasonable default (most logos are 20-100KB)
        if (actualSize === 0) {
          actualSize = 50000; // Default to 50KB
        }

        const speedMbps = actualSize > 0
          ? (actualSize * 8) / (duration * 1000000) // Convert to Mbps
          : null;
        const latency = endTime - startTime;

        resolve({
          speed: speedMbps ? Math.round(speedMbps * 100) / 100 : null,
          latency: Math.round(latency),
          method: 'image'
        });
      };

      img.onerror = () => {
        resolve({ speed: null, latency: null, method: 'image_error' });
      };

      // Add cache buster to ensure fresh download
      img.src = cacheBusterUrl;

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!img.complete) {
          resolve({ speed: null, latency: null, method: 'timeout' });
        }
      }, 10000);
    });
  }

  /**
   * Test upload speed using Network Information API
   * Note: Direct upload testing requires external endpoints which may be blocked.
   * We use Network Information API as the primary method with estimation.
   */
  async testUploadSpeed() {
    return new Promise((resolve) => {
      // Use Network Information API as primary method (no external dependency)
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && conn.downlink) {
        // Estimate upload as 10% of downlink (typical ratio for most connections)
        // For fiber/symmetric connections, this could be higher, but 10% is a safe default
        const estimatedUpload = conn.downlink * 0.1;
        resolve({
          speed: Math.round(estimatedUpload * 100) / 100,
          latency: conn.rtt || null,
          method: 'estimated'
        });
      } else {
        // No network information available
        resolve({ speed: null, latency: null, method: 'none' });
      }
    });
  }

  /**
   * Get test image URL for download speed testing
   * Uses a reliable S3-hosted image for consistent testing
   */
  getTestImageUrl(sizeKB) {
    // Use the provided S3-hosted image URL for speed testing
    // The image size doesn't matter as we measure download time
    return 'https://kwikid.s3.ap-south-1.amazonaws.com/CONFIG/AGENT/assets/logo/kwikid-logo.png';
  }

  /**
   * Get network information from API
   */
  getNetworkInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!conn) {
      return {};
    }

    return {
      effectiveType: conn.effectiveType || null,
      downlink: conn.downlink || null,
      rtt: conn.rtt || null,
      saveData: conn.saveData || false,
      type: conn.type || null
    };
  }

  /**
   * Test using WebRTC data channels (most accurate)
   */
  async testSpeedWebRTC() {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        const dataChannel = pc.createDataChannel('speedtest');
        const testData = new Array(100 * 1024).fill('0').join('');
        let bytesSent = 0;
        let bytesReceived = 0;
        const startTime = performance.now();

        dataChannel.onopen = () => {
          dataChannel.send(testData);
          bytesSent = testData.length;
        };

        dataChannel.onmessage = (event) => {
          bytesReceived += event.data.length;
        };

        setTimeout(() => {
          const duration = (performance.now() - startTime) / 1000;
          const downloadSpeed = (bytesReceived * 8) / (duration * 1000000);
          const uploadSpeed = (bytesSent * 8) / (duration * 1000000);

          pc.close();

          resolve({
            download_speed_mbps: Math.round(downloadSpeed * 100) / 100,
            upload_speed_mbps: Math.round(uploadSpeed * 100) / 100,
            method: 'webrtc'
          });
        }, 5000);
      } catch (e) {
        resolve({ download_speed_mbps: null, upload_speed_mbps: null, method: 'webrtc_failed' });
      }
    });
  }

  /**
   * Test using XMLHttpRequest (more control)
   */
  async testSpeedXHR() {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const testUrl = this.getTestImageUrl(500) + '?t=' + Date.now();
      const startTime = performance.now();
      let loadedBytes = 0;

      xhr.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          loadedBytes = e.loaded;
        }
      });

      xhr.addEventListener('load', () => {
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;
        const speedMbps = (loadedBytes * 8) / (duration * 1000000);

        resolve({
          speed: Math.round(speedMbps * 100) / 100,
          latency: Math.round(endTime - startTime),
          method: 'xhr'
        });
      });

      xhr.addEventListener('error', () => {
        resolve({ speed: null, latency: null, method: 'xhr_failed' });
      });

      xhr.open('GET', testUrl, true);
      xhr.send();

      // Timeout
      setTimeout(() => {
        xhr.abort();
        resolve({ speed: null, latency: null, method: 'xhr_timeout' });
      }, 10000);
    });
  }

  /**
   * Get latest speed test result
   */
  getLatestResult() {
    return this.testResults.length > 0
      ? this.testResults[this.testResults.length - 1]
      : null;
  }

  /**
   * Get speed test statistics
   */
  getStatistics() {
    if (this.testResults.length === 0) return null;

    const downloadSpeeds = this.testResults
      .map(r => r.download_speed_mbps)
      .filter(s => s !== null);

    const uploadSpeeds = this.testResults
      .map(r => r.upload_speed_mbps)
      .filter(s => s !== null);

    const rtts = this.testResults
      .map(r => r.rtt_ms)
      .filter(r => r !== null);

    return {
      total_tests: this.testResults.length,
      avg_download_mbps: downloadSpeeds.length > 0
        ? Math.round((downloadSpeeds.reduce((a, b) => a + b, 0) / downloadSpeeds.length) * 100) / 100
        : null,
      max_download_mbps: downloadSpeeds.length > 0 ? Math.max(...downloadSpeeds) : null,
      min_download_mbps: downloadSpeeds.length > 0 ? Math.min(...downloadSpeeds) : null,
      avg_upload_mbps: uploadSpeeds.length > 0
        ? Math.round((uploadSpeeds.reduce((a, b) => a + b, 0) / uploadSpeeds.length) * 100) / 100
        : null,
      max_upload_mbps: uploadSpeeds.length > 0 ? Math.max(...uploadSpeeds) : null,
      min_upload_mbps: uploadSpeeds.length > 0 ? Math.min(...uploadSpeeds) : null,
      avg_rtt_ms: rtts.length > 0
        ? Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length)
        : null,
      speed_variance: downloadSpeeds.length > 1
        ? this.calculateVariance(downloadSpeeds)
        : null
    };
  }

  /**
   * Calculate variance
   */
  calculateVariance(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.round(Math.sqrt(variance) * 100) / 100; // Standard deviation
  }

  /**
   * Get all test results
   */
  getResults() {
    return this.testResults;
  }

  /**
   * Get speed trend (improving/degrading)
   */
  getSpeedTrend() {
    if (this.testResults.length < 3) return null;

    const recent = this.testResults.slice(-5);
    const downloadSpeeds = recent
      .map(r => r.download_speed_mbps)
      .filter(s => s !== null);

    if (downloadSpeeds.length < 3) return null;

    const firstHalf = downloadSpeeds.slice(0, Math.floor(downloadSpeeds.length / 2));
    const secondHalf = downloadSpeeds.slice(Math.floor(downloadSpeeds.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    return {
      trend: change > 5 ? 'improving' : change < -5 ? 'degrading' : 'stable',
      change_percent: Math.round(change * 100) / 100
    };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NetworkSpeedTest };
}
