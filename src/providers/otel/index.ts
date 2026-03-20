import {
  trace,
  Span,
  SpanStatusCode,
  Attributes,
  Tracer,
  propagation,
  context,
  Baggage
} from '@opentelemetry/api'

import {
  ITelemetrySpan,
  ITelemetryTracer,
  IObservabilityProvider,
  TelemetryStatus,
  ITelemetryAttributes,
  ITelemetryContext,
  ITelemetryMetrics,
  ICounter,
  IGauge,
  IHistogram,
  IMetricAttributes,
  IInternalLogger
} from '../../interfaces'

// OpenTelemetry api can export baggage as a constant or type depending on version.
// We use 'any' for the baggage operations to avoid version conflicts in the abstraction.
const otelBaggage = (require('@opentelemetry/api') as any).baggage;

class OTelCounter implements ICounter {
  constructor(private readonly counter: any) {}
  add(value: number, attributes?: IMetricAttributes): void {
    this.counter.add(value, attributes)
  }
}

class OTelGauge implements IGauge {
  constructor(private readonly gauge: any) {}
  record(value: number, attributes?: IMetricAttributes): void {
    this.gauge.record(value, attributes)
  }
}

class OTelHistogram implements IHistogram {
  constructor(private readonly histogram: any) {}
  record(value: number, attributes?: IMetricAttributes): void {
    this.histogram.record(value, attributes)
  }
}

class OTelMetricsWrapper implements ITelemetryMetrics {
  private metricsApi: any
  private logger?: IInternalLogger
  constructor(private readonly name: string) {
    // Em um cenário real, usaríamos metrics.getMeter(name)
    // Para evitar quebrar se o pacote não estiver instalado, vamos simular ou usar require dinâmico
    try {
      if (typeof require !== 'undefined') {
        const { metrics } = require('@opentelemetry/api')
        this.metricsApi = metrics.getMeter(name)
      }
    } catch (e) {
      // Fallback ou no-op
    }
  }

  createCounter(name: string, options?: { description?: string }): ICounter {
    return new OTelCounter(this.metricsApi?.createCounter(name, options))
  }

  createGauge(name: string, options?: { description?: string }): IGauge {
    return new OTelGauge(this.metricsApi?.createUpDownCounter(name, options)) // Gauge no OTel costuma ser UpDownCounter ou Observable
  }

  createHistogram(name: string, options?: { description?: string }): IHistogram {
    return new OTelHistogram(this.metricsApi?.createHistogram(name, options))
  }

  setInternalLogger(logger: IInternalLogger): void {
    this.logger = logger
  }

  registerNativeMetrics(): void {
    try {
      if (typeof require !== 'undefined') {
        const { HostMetrics } = require('@opentelemetry/host-metrics')
        const { metrics } = require('@opentelemetry/api')

        const hostMetrics = new HostMetrics({
          meterProvider: metrics.getMeterProvider(),
          name: this.name
        })

        hostMetrics.start()

        if (this.logger) {
          this.logger.info(`Host metrics iniciadas com sucesso para ${this.name}.`)
        }
      }
    } catch (e) {
      const message = `@opentelemetry/host-metrics não encontrado ou erro ao iniciar. Métricas nativas não serão coletadas para ${this.name}.`
      if (this.logger) {
        this.logger.warn(message)
      } else {
        console.warn(`[OTel] ${message}`)
      }
    }
  }

  getNativeMeter(): any {
    return this.metricsApi
  }
}

class OTelContext implements ITelemetryContext {
  constructor(private readonly span: Span) {}

  get traceId(): string | undefined {
    return this.span.spanContext().traceId
  }

  get spanId(): string | undefined {
    return this.span.spanContext().spanId
  }

  serialize(): Record<string, string> {
    const output: Record<string, string> = {}
    propagation.inject(context.active(), output)
    return output
  }

  setBaggage(key: string, value: string): void {
    if (!otelBaggage) return
    const activeBaggage = otelBaggage.getBaggage(context.active()) || otelBaggage.createBaggage()
    const newBaggage = activeBaggage.setEntry(key, { value })
    // No OTel, baggage é imutável no contexto, mas aqui estamos simulando uma API imperativa.
    // Em um cenário real, o usuário deveria usar context.with(...) para propagar.
    // Para simplificar a abstração, vamos assumir que o provedor gerencia isso se possível.
    // Nota: Esta implementação específica do OTel não vai persistir o baggage no contexto global de forma mágica sem o .with()
  }

  getBaggage(key: string): string | undefined {
    if (!otelBaggage) return undefined
    return otelBaggage.getBaggage(context.active())?.getEntry(key)?.value
  }
}

class OTelSpanWrapper implements ITelemetrySpan {
  constructor(private readonly span: Span) {}

  setAttribute(key: string, value: any): this {
    this.span.setAttribute(key, value)
    return this
  }

  setAttributes(attributes: ITelemetryAttributes): this {
    this.span.setAttributes(attributes as Attributes)
    return this
  }

  setStatus(status: { code: TelemetryStatus; message?: string }): this {
    const otelStatus = this.mapStatus(status.code)
    this.span.setStatus({ code: otelStatus, message: status.message })
    return this
  }

  recordException(error: Error | string): this {
    this.span.recordException(error)
    return this
  }

  getContext(): ITelemetryContext {
    return new OTelContext(this.span)
  }

  getNativeSpan(): any {
    return this.span
  }

  end(): void {
    this.span.end()
  }

  private mapStatus(status: TelemetryStatus): SpanStatusCode {
    switch (status) {
      case TelemetryStatus.OK:
        return SpanStatusCode.OK
      case TelemetryStatus.ERROR:
        return SpanStatusCode.ERROR
      default:
        return SpanStatusCode.UNSET
    }
  }
}

class OTelTracerWrapper implements ITelemetryTracer {
  constructor(private readonly tracer: Tracer) {}

  async startActiveSpan<T>(
    name: string,
    fn: (span: ITelemetrySpan) => T | Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span: Span) => {
      const wrapper = new OTelSpanWrapper(span)
      try {
        const result = await fn(wrapper)
        return result
      } catch (error) {
        wrapper.setStatus({
          code: TelemetryStatus.ERROR,
          message: error instanceof Error ? error.message : String(error)
        })
        wrapper.recordException(error as Error)
        throw error
      } finally {
        wrapper.end()
      }
    })
  }

  async startActiveSpanWithAttributes<T>(
    name: string,
    attributes: ITelemetryAttributes,
    fn: (span: ITelemetrySpan) => T | Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      name,
      { attributes: attributes as Attributes },
      async (span: Span) => {
        const wrapper = new OTelSpanWrapper(span)
        try {
          const result = await fn(wrapper)
          return result
        } catch (error) {
          wrapper.setStatus({
            code: TelemetryStatus.ERROR,
            message: error instanceof Error ? error.message : String(error)
          })
          wrapper.recordException(error as Error)
          throw error
        } finally {
          wrapper.end()
        }
      }
    )
  }
}

export class OpenTelemetryProvider implements IObservabilityProvider {
  private logger?: IInternalLogger

  setInternalLogger(logger: IInternalLogger): void {
    this.logger = logger
  }

  getTracer(name: string): ITelemetryTracer {
    const otelTracer = trace.getTracer(name)
    return new OTelTracerWrapper(otelTracer)
  }

  getMetrics(name: string): ITelemetryMetrics {
    const wrapper = new OTelMetricsWrapper(name)
    if (this.logger) {
      wrapper.setInternalLogger(this.logger)
    }
    return wrapper
  }
}
