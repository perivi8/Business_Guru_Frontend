import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Production-safe logging service
 * Automatically disables console logging in production builds
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  
  constructor() {}

  /**
   * Log general information (disabled in production)
   */
  log(...args: any[]): void {
    if (!environment.production) {
      console.log(...args);
    }
  }

  /**
   * Log warnings (disabled in production)
   */
  warn(...args: any[]): void {
    if (!environment.production) {
      console.warn(...args);
    }
  }

  /**
   * Log errors (always enabled for error tracking)
   */
  error(...args: any[]): void {
    // Errors are logged even in production for monitoring
    // But sensitive data should be sanitized before logging
    console.error(...args);
  }

  /**
   * Log debug information (disabled in production)
   */
  debug(...args: any[]): void {
    if (!environment.production) {
      console.debug(...args);
    }
  }

  /**
   * Log table data (disabled in production)
   */
  table(data: any): void {
    if (!environment.production) {
      console.table(data);
    }
  }

  /**
   * Group logs together (disabled in production)
   */
  group(label: string): void {
    if (!environment.production) {
      console.group(label);
    }
  }

  /**
   * End log group (disabled in production)
   */
  groupEnd(): void {
    if (!environment.production) {
      console.groupEnd();
    }
  }

  /**
   * Log with timestamp (disabled in production)
   */
  logWithTime(message: string, ...args: any[]): void {
    if (!environment.production) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${message}`, ...args);
    }
  }
}
