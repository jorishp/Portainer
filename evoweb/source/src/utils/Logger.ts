import { DateTime } from 'luxon';

// Axios errors include request headers and form bodies containing passwords/tokens.
// Keep only operational error metadata in logs, never the request/response objects.
function safe(value: any): any {
  if (value && value.isAxiosError) {
    return { name: 'HttpError', message: value.message, code: value.code, status: value.response?.status };
  }
  if (value instanceof Error) return { name: value.name, message: value.message };
  return value;
}

export class Logger {
  private static get timestamp(): string {
    return DateTime.now().toFormat('HH:mm:ss.SSS');
  }

  static info(message: string, ...args: any[]) {
    console.log(`[${this.timestamp}] [INFO] ${message}`, ...args.map(safe));
  }
  static error(message: string, ...args: any[]) {
    console.error(`[${this.timestamp}] [ERROR] ${message}`, ...args.map(safe));
  }
  static warn(message: string, ...args: any[]) {
    console.warn(`[${this.timestamp}] [WARN] ${message}`, ...args.map(safe));
  }
  static debug(message: string, ...args: any[]) {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      console.log(`[${this.timestamp}] [DEBUG] ${message}`, ...args.map(safe));
    }
  }
  static silly(message: string, ...args: any[]) {
    if (process.env.DEBUG === 'true') {
      console.log(`[${this.timestamp}] [SILLY] ${message}`, ...args.map(safe));
    }
  }
}
