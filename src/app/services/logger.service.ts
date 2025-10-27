import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  
  constructor() { }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.debug(message, ...optionalParams);
    }
  }

  /**
   * Log informational messages (only in development)
   */
  log(message: string, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.log(message, ...optionalParams);
    }
  }

  /**
   * Log warnings (always logged)
   */
  warn(message: string, ...optionalParams: any[]): void {
    console.warn(message, ...optionalParams);
  }

  /**
   * Log errors (always logged)
   */
  error(message: string, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }

  /**
   * Log information messages (only in development)
   */
  info(message: string, ...optionalParams: any[]): void {
    if (!environment.production) {
      console.info(message, ...optionalParams);
    }
  }
}
