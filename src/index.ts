import { IObservabilityProvider, IInternalLogger } from './interfaces'
import { OpenTelemetryProvider } from './providers/otel'

/**
 * Global observability provider instance.
 */
const getInitialProvider = (): IObservabilityProvider => {
  try {
    const p = new OpenTelemetryProvider()
    if (typeof internalLogger !== 'undefined') {
      p.setInternalLogger?.(internalLogger)
    }
    return p
  } catch (e) {
    if (typeof internalLogger !== 'undefined') {
      internalLogger.error(`Falha ao carregar OpenTelemetryProvider:`, e)
    } else {
      console.error(`[Observability] Falha ao carregar OpenTelemetryProvider:`, e)
    }
    throw new Error('Nenhum provedor de observabilidade disponível.')
  }
}

/**
 * Logger interno para a biblioteca.
 * Por padrão usa console, mas pode ser substituído.
 */
let internalLogger: IInternalLogger = {
  warn: (msg, ...args) => console.warn(`[Observability] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Observability] ${msg}`, ...args),
  info: (msg, ...args) => console.info(`[Observability] ${msg}`, ...args)
}

let provider: IObservabilityProvider = getInitialProvider()

/**
 * Define o logger interno da biblioteca.
 */
export const setInternalLogger = (logger: IInternalLogger): void => {
  internalLogger = logger
  provider.setInternalLogger?.(logger)
}

export const setObservabilityProvider = (newProvider: IObservabilityProvider): void => {
  provider = newProvider
}

export const getTracer = (name: string) => provider.getTracer(name)

export const getMetrics = (name: string) => provider.getMetrics?.(name)

export const getLogger = (name: string) => provider.getLogger?.(name)

export const registerNativeMetrics = (serviceName: string) => provider.getMetrics?.(serviceName)?.registerNativeMetrics?.()

export const registerHealthCheck = (check: any) => provider.registerHealthCheck?.(check)

export const getNativeMeter = (name: string) => provider.getMetrics?.(name)?.getNativeMeter?.()

export * from './middlewares/express'
export * from './interfaces'
