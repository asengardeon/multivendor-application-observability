import { ITelemetryTracer, ITelemetrySpan, ITelemetryAttributes, TelemetryStatus, IObservabilityProvider, ITelemetryContext, IInternalLogger } from '@multivendor/obs-core'

/**
 * Interface fictícia para representar o SDK do New Relic.
 * Em um cenário real, você importaria 'newrelic'.
 */
interface NewRelicSDK {
  startWebTransaction(url: string, handle: () => any): any;
  startBackgroundTransaction(name: string, group: string, handle: () => any): any;
  addCustomAttribute(key: string, value: string | number | boolean): void;
  noticeError(error: Error | string, customAttributes?: any): void;
  setTransactionName(name: string): void;
  getTransaction(): { end: () => void };
}

// Simulando o import do New Relic
let newrelic: NewRelicSDK
try {
  if (typeof require !== 'undefined') {
    newrelic = require('newrelic')
  } else {
    throw new Error('require is not defined')
  }
} catch (e) {
  newrelic = (typeof global !== 'undefined' ? (global as any).newrelic : undefined) || {
    startWebTransaction: (_url: string, handle: () => any) => handle(),
    startBackgroundTransaction: (_name: string, _group: string, handle: () => any) => handle(),
    addCustomAttribute: () => {},
    noticeError: () => {},
    setTransactionName: () => {},
    getTransaction: () => ({ end: () => {} })
  }
}

class NewRelicContext implements ITelemetryContext {
  get traceId(): string | undefined {
    return undefined // NR gerencia internamente ou via headers específicos
  }

  get spanId(): string | undefined {
    return undefined
  }

  serialize(): Record<string, string> {
    const output: Record<string, string> = {}
    // Em um cenário real: newrelic.getLinkingMetadata()
    return output
  }

  setBaggage(key: string, value: string): void {
    // New Relic não expõe Baggage API diretamente de forma compatível
  }

  getBaggage(key: string): string | undefined {
    return undefined
  }
}

class NewRelicSpan implements ITelemetrySpan {
  setAttribute(key: string, value: any): this {
    newrelic.addCustomAttribute(key, value)
    return this
  }

  setAttributes(attributes: ITelemetryAttributes): this {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        newrelic.addCustomAttribute(key, value as any)
      }
    })
    return this
  }

  setStatus(status: { code: TelemetryStatus; message?: string }): this {
    if (status.code === TelemetryStatus.ERROR) {
      newrelic.noticeError(status.message || 'Error reported via setStatus')
    }
    return this
  }

  recordException(error: Error | string): this {
    newrelic.noticeError(error)
    return this
  }

  getContext(): ITelemetryContext {
    return new NewRelicContext()
  }

  getNativeSpan(): any {
    return newrelic
  }

  end(): void {
    // O New Relic gerencia o fim da transação automaticamente no wrap,
    // mas poderíamos chamar o fim manual se necessário.
  }
}

class NewRelicTracer implements ITelemetryTracer {
  constructor(private readonly name: string) {}

  async startActiveSpan<T>(name: string, fn: (span: ITelemetrySpan) => T | Promise<T>): Promise<T> {
    const span = new NewRelicSpan()
    // O New Relic usa o conceito de transações/segmentos
    return newrelic.startBackgroundTransaction(name, this.name, () => fn(span))
  }

  async startActiveSpanWithAttributes<T>(
    name: string,
    attributes: ITelemetryAttributes,
    fn: (span: ITelemetrySpan) => T | Promise<T>
  ): Promise<T> {
    const span = new NewRelicSpan()
    span.setAttributes(attributes)
    return newrelic.startBackgroundTransaction(name, this.name, () => fn(span))
  }
}

export class NewRelicProvider implements IObservabilityProvider {
  private logger?: IInternalLogger

  setInternalLogger(logger: IInternalLogger): void {
    this.logger = logger
  }

  getTracer(name: string): ITelemetryTracer {
    return new NewRelicTracer(name)
  }
}
