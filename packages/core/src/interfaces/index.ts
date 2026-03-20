export interface ITelemetryAttributes {
  [key: string]: string | number | boolean | undefined | string[] | number[] | boolean[];
}

export enum TelemetryStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  UNSET = 'UNSET'
}

export interface ITelemetrySpan {
  setAttribute(key: string, value: any): this;
  setAttributes(attributes: ITelemetryAttributes): this;
  setStatus(status: { code: TelemetryStatus; message?: string }): this;
  recordException(error: Error | string): this;
  end(): void;
  getContext(): ITelemetryContext;
  getNativeSpan?(): any;
}

export interface ITelemetryContext {
  traceId?: string;
  spanId?: string;
  serialize(): Record<string, string>;
  setBaggage(key: string, value: string): void;
  getBaggage(key: string): string | undefined;
}

export interface ITelemetryTracer {
  startActiveSpan<T>(
    name: string,
    fn: (span: ITelemetrySpan) => T | Promise<T>
  ): T | Promise<T>;

  startActiveSpanWithAttributes<T>(
    name: string,
    attributes: ITelemetryAttributes,
    fn: (span: ITelemetrySpan) => T | Promise<T>
  ): T | Promise<T>;
}

// --- Metrics ---

export interface IMetricAttributes {
  [key: string]: string | number | boolean;
}

export interface ICounter {
  add(value: number, attributes?: IMetricAttributes): void;
}

export interface IGauge {
  record(value: number, attributes?: IMetricAttributes): void;
}

export interface IHistogram {
  record(value: number, attributes?: IMetricAttributes): void;
}

export interface ITelemetryMetrics {
  createCounter(name: string, options?: { description?: string }): ICounter;
  createGauge(name: string, options?: { description?: string }): IGauge;
  createHistogram(name: string, options?: { description?: string }): IHistogram;
  /**
   * Ativa a coleta de métricas nativas (ex: CPU, memória, event loop).
   */
  registerNativeMetrics?(): void;
  getNativeMeter?(): any;
}

// --- Logger ---

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogger {
  log(level: LogLevel, message: string, attributes?: ITelemetryAttributes): void;
  debug(message: string, attributes?: ITelemetryAttributes): void;
  info(message: string, attributes?: ITelemetryAttributes): void;
  warn(message: string, attributes?: ITelemetryAttributes): void;
  error(message: string, attributes?: ITelemetryAttributes): void;
}

// --- Health Checks ---

export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN'
}

export interface IHealthCheckResult {
  status: HealthStatus;
  details?: Record<string, any>;
}

export interface IHealthCheck {
  getName(): string;
  check(): Promise<IHealthCheckResult>;
}

// --- Provider ---

export interface IInternalLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface IObservabilityProvider {
  getTracer(name: string): ITelemetryTracer;
  getMetrics?(name: string): ITelemetryMetrics;
  getLogger?(name: string): ILogger;
  registerHealthCheck?(check: IHealthCheck): void;
  setInternalLogger?(logger: IInternalLogger): void;
}
