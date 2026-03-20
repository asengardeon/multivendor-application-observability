"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNativeMeter = exports.registerHealthCheck = exports.registerNativeMetrics = exports.getLogger = exports.getMetrics = exports.getTracer = exports.setObservabilityProvider = exports.setInternalLogger = void 0;
/**
 * Global observability provider instance.
 */
const getInitialProvider = () => {
    // Verificação de segurança para o ambiente Node.js
    const safeProcess = typeof process !== 'undefined' ? process : { env: { OBSERVABILITY_VENDOR: 'otel' } };
    const vendor = safeProcess.env?.OBSERVABILITY_VENDOR?.toLowerCase();
    // Verificação de segurança para o 'require' do Node.js
    const safeRequire = typeof require !== 'undefined' ? require : (modulePath) => {
        // No browser, podemos tentar retornar algo global ou falhar silenciosamente
        return {};
    };
    const getProvider = (path, name) => {
        try {
            // No monorepo, tentamos carregar os pacotes de provedores
            const moduleContent = safeRequire(path);
            const ProviderClass = moduleContent[name];
            if (!ProviderClass) {
                throw new Error(`Classe ${name} não encontrada no módulo ${path}`);
            }
            const p = new ProviderClass();
            if (typeof internalLogger !== 'undefined') {
                p.setInternalLogger?.(internalLogger);
            }
            return p;
        }
        catch (e) {
            if (typeof internalLogger !== 'undefined') {
                internalLogger.error(`Falha ao carregar ${name}:`, e);
            }
            else {
                console.error(`[Observability] Falha ao carregar ${name}:`, e);
            }
            // Fallback para OpenTelemetry se não for ele quem falhou
            if (name !== 'OpenTelemetryProvider') {
                try {
                    const OTelModule = safeRequire('@multivendor/obs-provider-otel');
                    const OTelProviderClass = OTelModule.OpenTelemetryProvider;
                    const p = new OTelProviderClass();
                    if (typeof internalLogger !== 'undefined') {
                        p.setInternalLogger?.(internalLogger);
                    }
                    return p;
                }
                catch (innerError) {
                    throw new Error('Nenhum provedor de observabilidade disponível, incluindo o fallback.');
                }
            }
            throw e;
        }
    };
    switch (vendor) {
        case 'newrelic':
            return getProvider('@multivendor/obs-provider-newrelic', 'NewRelicProvider');
        case 'datadog':
            return getProvider('@multivendor/obs-provider-datadog', 'DatadogProvider');
        case 'otel':
        default:
            return getProvider('@multivendor/obs-provider-otel', 'OpenTelemetryProvider');
    }
};
/**
 * Logger interno para a biblioteca.
 * Por padrão usa console, mas pode ser substituído.
 */
let internalLogger = {
    warn: (msg, ...args) => console.warn(`[Observability] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[Observability] ${msg}`, ...args),
    info: (msg, ...args) => console.info(`[Observability] ${msg}`, ...args)
};
let provider = getInitialProvider();
/**
 * Define o logger interno da biblioteca.
 */
const setInternalLogger = (logger) => {
    internalLogger = logger;
    provider.setInternalLogger?.(logger);
};
exports.setInternalLogger = setInternalLogger;
const setObservabilityProvider = (newProvider) => {
    provider = newProvider;
};
exports.setObservabilityProvider = setObservabilityProvider;
const getTracer = (name) => provider.getTracer(name);
exports.getTracer = getTracer;
const getMetrics = (name) => provider.getMetrics?.(name);
exports.getMetrics = getMetrics;
const getLogger = (name) => provider.getLogger?.(name);
exports.getLogger = getLogger;
const registerNativeMetrics = (serviceName) => provider.getMetrics?.(serviceName)?.registerNativeMetrics?.();
exports.registerNativeMetrics = registerNativeMetrics;
const registerHealthCheck = (check) => provider.registerHealthCheck?.(check);
exports.registerHealthCheck = registerHealthCheck;
const getNativeMeter = (name) => provider.getMetrics?.(name)?.getNativeMeter?.();
exports.getNativeMeter = getNativeMeter;
__exportStar(require("./middlewares/express"), exports);
__exportStar(require("./interfaces"), exports);
