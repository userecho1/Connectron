import { env } from '../config/env';

export interface ILogger {
  info(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
}

export class ConsoleLogger implements ILogger {
  info(message: string, context?: Record<string, any>): void {
    if (env.TRANSPORT_MODE === 'stdio') {
      console.error(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
    } else {
      console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    console.error(`[ERROR] ${message}`, error || '', context ? JSON.stringify(context) : '');
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
  }

  debug(message: string, context?: Record<string, any>): void {
    if (env.NODE_ENV !== 'production') {
      if (env.TRANSPORT_MODE === 'stdio') {
        console.error(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '');
      } else {
        console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '');
      }
    }
  }
}

export const logger = new ConsoleLogger();
