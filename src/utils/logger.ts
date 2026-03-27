export interface ILogger {
  info(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
}

export class ConsoleLogger implements ILogger {
  info(message: string, context?: Record<string, any>): void {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    console.error(`[ERROR] ${message}`, error || '', context ? JSON.stringify(context) : '');
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '');
    }
  }
}

export const logger = new ConsoleLogger();
