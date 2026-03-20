import { ITelemetryTracer, ITelemetrySpan, ITelemetryAttributes, TelemetryStatus, IObservabilityProvider, ITelemetryContext, IInternalLogger } from '@multivendor/obs-core'

/**
 * Interface fictícia para representar o SDK do Datadog.
 * Em um cenário real, você importaria 'dd-trace'.
 */
interface DatadogSDK {
  tracer: {
    trace(name: string, options: any, handle: (span: any) => any): any;
    scope: () => { active: () => any };
  }
}

// Simulando o import do Datadog
let dd: DatadogSDK
try {
  if (typeof require !== 'undefined') {
    dd = require('dd-trace')
  } else {
    throw new Error('require is not defined')
  }
} catch (e) {
  dd = (typeof global !== 'undefined' ? (global as any).datadog : undefined) || {
    tracer: {
      trace: (name: string, _options: any, handle: (span: any) => any) => {
        const mockSpan = {
          setTag: () => {},
          setAttributes: () => {},
          setTagAsError: () => {},
          finish: () => {},
          context: () => ({ toTraceId: () => undefined, toSpanId: () => undefined })
        }
        return handle(mockSpan)
      },
      scope: () => ({ active: () => null })
    }
  }
}

class DatadogContext implements ITelemetryContext {
  constructor(private readonly nativeSpan: any) {}

  get traceId(): string | undefined {
    return this.nativeSpan.context()?.toTraceId()
  }

  get spanId(): string | undefined {
    return this.nativeSpan.context()?.toSpanId()
  }

  serialize(): Record<string, string> {
    const output: Record<string, string> = {}
    // Em um cenário real: dd.tracer.inject(this.nativeSpan.context(), 'http_headers', output)
    return output
  }

  setBaggage(key: string, value: string): void {
    // Datadog gerencia baggage via tags se propagadas, 
    // ou via contexto distribuído. Abstração no-op por ora.
  }

  getBaggage(key: string): string | undefined {
    return undefined
  }
}

class DatadogSpan implements ITelemetrySpan {
  constructor(private readonly nativeSpan: any) {}

  setAttribute(key: string, value: any): this {
    this.nativeSpan.setTag(key, value)
    return this
  }

  setAttributes(attributes: ITelemetryAttributes): this {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        this.nativeSpan.setTag(key, value)
      }
    })
    return this
  }

  setStatus(status: { code: TelemetryStatus; message?: string }): this {
    if (status.code === TelemetryStatus.ERROR) {
      this.nativeSpan.setTag('error', true)
      if (status.message) {
        this.nativeSpan.setTag('error.message', status.message)
      }
    }
    return this
  }

  recordException(error: Error | string): this {
    this.nativeSpan.setTag('error', true)
    this.nativeSpan.setTag('error.msg', error instanceof Error ? error.message : error)
    this.nativeSpan.setTag('error.stack', error instanceof Error ? error.stack : undefined)
    return this
  }

  getContext(): ITelemetryContext {
    return new DatadogContext(this.nativeSpan)
  }

  getNativeSpan(): any {
    return this.nativeSpan
  }

  end(): void {
    this.nativeSpan.finish()
  }
}

class DatadogTracer implements ITelemetryTracer {
  constructor(private readonly serviceName: string) {}

  async startActiveSpan<T>(name: string, fn: (span: ITelemetrySpan) => T | Promise<T>): Promise<T> {
    return dd.tracer.trace(name, { service: this.serviceName }, (nativeSpan: any) => {
      const span = new DatadogSpan(nativeSpan)
      return fn(span)
    })
  }

  async startActiveSpanWithAttributes<T>(
    name: string,
    attributes: ITelemetryAttributes,
    fn: (span: ITelemetrySpan) => T | Promise<T>
  ): Promise<T> {
    const options = {
      service: this.serviceName,
      tags: attributes
    }
    return dd.tracer.trace(name, options, (nativeSpan: any) => {
      const span = new DatadogSpan(nativeSpan)
      return fn(span)
    })
  }
}

export class DatadogProvider implements IObservabilityProvider {
  private logger?: IInternalLogger

  setInternalLogger(logger: IInternalLogger): void {
    this.logger = logger
  }

  getTracer(name: string): ITelemetryTracer {
    return new DatadogTracer(name)
  }
}
