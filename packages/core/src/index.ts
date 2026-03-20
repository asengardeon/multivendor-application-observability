import { IObservabilityProvider, IInternalLogger } from './interfaces'

/**
 * Global observability provider instance.
 */
const getInitialProvider = (): IObservabilityProvider => {
  // Verificação de segurança para o ambiente Node.js
  const safeProcess = typeof process !== 'undefined' ? process : { env: { OBSERVABILITY_VENDOR: 'otel' } }
  const vendor = (safeProcess.env as any)?.OBSERVABILITY_VENDOR?.toLowerCase()

  // Verificação de segurança para o 'require' do Node.js
  const safeRequire = typeof require !== 'undefined' ? require : (modulePath: string) => {
    // No browser, podemos tentar retornar algo global ou falhar silenciosamente
    return {}
  }

  const getProvider = (path: string, name: string) => {
    try {
      // No monorepo, tentamos carregar os pacotes de provedores
      const moduleContent = safeRequire(path)
      const ProviderClass = moduleContent[name]
      if (!ProviderClass) {
        throw new Error(`Classe ${name} não encontrada no módulo ${path}`)
      }
      const p = new ProviderClass()
      if (typeof internalLogger !== 'undefined') {
        p.setInternalLogger?.(internalLogger)
      }
      return p
    } catch (e) {
      if (typeof internalLogger !== 'undefined') {
        internalLogger.error(`Falha ao carregar ${name}:`, e)
      } else {
        console.error(`[Observability] Falha ao carregar ${name}:`, e)
      }
      
      // Fallback para OpenTelemetry se não for ele quem falhou
      if (name !== 'OpenTelemetryProvider') {
        try {
          const OTelModule = safeRequire('@multivendor/obs-provider-otel')
          const OTelProviderClass = OTelModule.OpenTelemetryProvider
          const p = new OTelProviderClass()
          if (typeof internalLogger !== 'undefined') {
            p.setInternalLogger?.(internalLogger)
          }
          return p
        } catch (innerError) {
          throw new Error('Nenhum provedor de observabilidade disponível, incluindo o fallback.')
        }
      }
      throw e
    }
  }

  switch (vendor) {
    case 'newrelic':
      return getProvider('@multivendor/obs-provider-newrelic', 'NewRelicProvider')
    case 'datadog':
      return getProvider('@multivendor/obs-provider-datadog', 'DatadogProvider')
    case 'otel':
    default:
      return getProvider('@multivendor/obs-provider-otel', 'OpenTelemetryProvider')
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
