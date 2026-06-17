/**
 * Performance Monitoring Utilities
 * Track API response times, cache hits/misses, and identify bottlenecks
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.requestLog = [];
    this.MAX_LOG_SIZE = 1000;
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName) {
    return {
      name: operationName,
      startTime: performance.now(),
      end: (metadata = {}) => {
        const duration = performance.now() - this.startTime;
        this.recordMetric(operationName, duration, metadata);
        return duration;
      }
    };
  }

  /**
   * Record a metric
   */
  recordMetric(operationName, duration, metadata = {}) {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: -Infinity,
        samples: []
      });
    }

    const metric = this.metrics.get(operationName);
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.samples.push({
      duration,
      timestamp: Date.now(),
      ...metadata
    });

    // Keep only recent samples
    if (metric.samples.length > 100) {
      metric.samples = metric.samples.slice(-100);
    }

    // Log request
    if (this.requestLog.length >= this.MAX_LOG_SIZE) {
      this.requestLog = this.requestLog.slice(-500);
    }

    this.requestLog.push({
      operation: operationName,
      duration,
      timestamp: Date.now(),
      ...metadata
    });
  }

  /**
   * Get statistics for an operation
   */
  getStats(operationName) {
    const metric = this.metrics.get(operationName);
    if (!metric) return null;

    return {
      operation: operationName,
      count: metric.count,
      averageTime: metric.totalTime / metric.count,
      minTime: metric.minTime,
      maxTime: metric.maxTime,
      totalTime: metric.totalTime,
      recentSamples: metric.samples.slice(-10)
    };
  }

  /**
   * Get all statistics
   */
  getAllStats() {
    const stats = {};
    for (const [operation, metric] of this.metrics.entries()) {
      stats[operation] = {
        count: metric.count,
        averageTime: metric.totalTime / metric.count,
        minTime: metric.minTime,
        maxTime: metric.maxTime,
        totalTime: metric.totalTime
      };
    }
    return stats;
  }

  /**
   * Get slow requests
   */
  getSlowRequests(threshold = 1000) {
    return this.requestLog.filter(req => req.duration > threshold);
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.requestLog = [];
  }

  /**
   * Export metrics for analysis
   */
  export() {
    return {
      metrics: Object.fromEntries(this.metrics),
      requestLog: this.requestLog,
      summary: this.getAllStats()
    };
  }
}

// Singleton instance
let monitor = null;

export function getPerformanceMonitor() {
  if (!monitor) {
    monitor = new PerformanceMonitor();
  }
  return monitor;
}

/**
 * Middleware-compatible performance tracker
 */
export function createPerformanceMiddleware() {
  const monitor = getPerformanceMonitor();

  return {
    recordApiCall: (operationName, duration, metadata) => {
      monitor.recordMetric(operationName, duration, metadata);
    },

    getStats: (operationName) => monitor.getStats(operationName),

    getAllStats: () => monitor.getAllStats(),

    getSlowRequests: (threshold) => monitor.getSlowRequests(threshold),

    exportMetrics: () => monitor.export()
  };
}
