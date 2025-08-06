import { externalApiService } from './externalApiService';

interface HeartbeatStatus {
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  lastError?: string;
}

class HeartbeatService {
  private status: HeartbeatStatus = {
    isHealthy: true,
    lastCheck: new Date(),
    consecutiveFailures: 0
  };
  
  private interval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 300000; // 5 minutes
  private readonly MAX_FAILURES_BEFORE_UNHEALTHY = 3;

  /**
   * Start the heartbeat monitoring
   */
  start() {
    // Disabled automatic heartbeat monitoring to reduce API calls
    console.log('Heartbeat service disabled - health checks available via /api/health');
  }

  /**
   * Stop the heartbeat monitoring
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Heartbeat service stopped');
    }
  }

  /**
   * Perform a health check against the external API
   */
  private async performHealthCheck() {
    try {
      console.log('Performing heartbeat check...');
      
      // Only use /tools endpoint for health check
      const result = await externalApiService.get('/tools');
      
      if (result.success && result.data) {
        this.markHealthy();
        console.log('Heartbeat check successful - External API responding');
      } else {
        this.markUnhealthy(result.error || 'API returned unsuccessful response');
      }
    } catch (error: any) {
      this.markUnhealthy(error.message || 'Network error during health check');
    }
  }

  /**
   * Mark the service as healthy
   */
  private markHealthy() {
    const wasUnhealthy = !this.status.isHealthy;
    
    this.status.isHealthy = true;
    this.status.lastCheck = new Date();
    this.status.consecutiveFailures = 0;
    this.status.lastError = undefined;
    
    if (wasUnhealthy) {
      console.log('External API platform is back online');
    }
  }

  /**
   * Mark the service as unhealthy
   */
  private markUnhealthy(error: string) {
    this.status.consecutiveFailures++;
    this.status.lastCheck = new Date();
    this.status.lastError = error;
    
    if (this.status.consecutiveFailures >= this.MAX_FAILURES_BEFORE_UNHEALTHY && this.status.isHealthy) {
      this.status.isHealthy = false;
      console.error(`External API platform is experiencing issues after ${this.status.consecutiveFailures} consecutive failures: ${error}`);
    } else {
      console.warn(`Heartbeat check failed (${this.status.consecutiveFailures}/${this.MAX_FAILURES_BEFORE_UNHEALTHY}): ${error}`);
    }
  }

  /**
   * Get current health status
   */
  getStatus(): HeartbeatStatus {
    return { ...this.status };
  }

  /**
   * Check if the service is currently healthy
   */
  isHealthy(): boolean {
    return this.status.isHealthy;
  }
}

export const heartbeatService = new HeartbeatService();