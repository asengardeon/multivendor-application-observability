"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenTelemetryProvider = void 0;
const api_1 = require("@opentelemetry/api");
const obs_core_1 = require("@multivendor/obs-core");
// OpenTelemetry api can export baggage as a constant or type depending on version.
// We use 'any' for the baggage operations to avoid version conflicts in the abstraction.
const otelBaggage = require('@opentelemetry/api').baggage;
class OTelCounter {
    constructor(counter) {
        this.counter = counter;
    }
    add(value, attributes) {
        this.counter.add(value, attributes);
    }
}
class OTelGauge {
    constructor(gauge) {
        this.gauge = gauge;
    }
    record(value, attributes) {
        this.gauge.record(value, attributes);
    }
}
class OTelHistogram {
    constructor(histogram) {
        this.histogram = histogram;
    }
    record(value, attributes) {
        this.histogram.record(value, attributes);
    }
}
class OTelMetricsWrapper {
    constructor(name) {
        this.name = name;
        // Em um cenário real, usaríamos metrics.getMeter(name)
        // Para evitar quebrar se o pacote não estiver instalado, vamos simular ou usar require dinâmico
        try {
            if (typeof require !== 'undefined') {
                const { metrics } = require('@opentelemetry/api');
                this.metricsApi = metrics.getMeter(name);
            }
        }
        catch (e) {
            // Fallback ou no-op
        }
    }
    createCounter(name, options) {
        return new OTelCounter(this.metricsApi?.createCounter(name, options));
    }
    createGauge(name, options) {
        return new OTelGauge(this.metricsApi?.createUpDownCounter(name, options)); // Gauge no OTel costuma ser UpDownCounter ou Observable
    }
    createHistogram(name, options) {
        return new OTelHistogram(this.metricsApi?.createHistogram(name, options));
    }
    setInternalLogger(logger) {
        this.logger = logger;
    }
    registerNativeMetrics() {
        try {
            if (typeof require !== 'undefined') {
                const { HostMetrics } = require('@opentelemetry/host-metrics');
                const { metrics } = require('@opentelemetry/api');
                const hostMetrics = new HostMetrics({
                    meterProvider: metrics.getMeterProvider(),
                    name: this.name
                });
                hostMetrics.start();
                if (this.logger) {
                    this.logger.info(`Host metrics iniciadas com sucesso para ${this.name}.`);
                }
            }
        }
        catch (e) {
            const message = `@opentelemetry/host-metrics não encontrado ou erro ao iniciar. Métricas nativas não serão coletadas para ${this.name}.`;
            if (this.logger) {
                this.logger.warn(message);
            }
            else {
                console.warn(`[OTel] ${message}`);
            }
        }
    }
    getNativeMeter() {
        return this.metricsApi;
    }
}
class OTelContext {
    constructor(span) {
        this.span = span;
    }
    get traceId() {
        return this.span.spanContext().traceId;
    }
    get spanId() {
        return this.span.spanContext().spanId;
    }
    serialize() {
        const output = {};
        api_1.propagation.inject(api_1.context.active(), output);
        return output;
    }
    setBaggage(key, value) {
        if (!otelBaggage)
            return;
        const activeBaggage = otelBaggage.getBaggage(api_1.context.active()) || otelBaggage.createBaggage();
        const newBaggage = activeBaggage.setEntry(key, { value });
        // No OTel, baggage é imutável no contexto, mas aqui estamos simulando uma API imperativa.
        // Em um cenário real, o usuário deveria usar context.with(...) para propagar.
        // Para simplificar a abstração, vamos assumir que o provedor gerencia isso se possível.
        // Nota: Esta implementação específica do OTel não vai persistir o baggage no contexto global de forma mágica sem o .with()
    }
    getBaggage(key) {
        if (!otelBaggage)
            return undefined;
        return otelBaggage.getBaggage(api_1.context.active())?.getEntry(key)?.value;
    }
}
class OTelSpanWrapper {
    constructor(span) {
        this.span = span;
    }
    setAttribute(key, value) {
        this.span.setAttribute(key, value);
        return this;
    }
    setAttributes(attributes) {
        this.span.setAttributes(attributes);
        return this;
    }
    setStatus(status) {
        const otelStatus = this.mapStatus(status.code);
        this.span.setStatus({ code: otelStatus, message: status.message });
        return this;
    }
    recordException(error) {
        this.span.recordException(error);
        return this;
    }
    getContext() {
        return new OTelContext(this.span);
    }
    getNativeSpan() {
        return this.span;
    }
    end() {
        this.span.end();
    }
    mapStatus(status) {
        switch (status) {
            case obs_core_1.TelemetryStatus.OK:
                return api_1.SpanStatusCode.OK;
            case obs_core_1.TelemetryStatus.ERROR:
                return api_1.SpanStatusCode.ERROR;
            default:
                return api_1.SpanStatusCode.UNSET;
        }
    }
}
class OTelTracerWrapper {
    constructor(tracer) {
        this.tracer = tracer;
    }
    async startActiveSpan(name, fn) {
        return this.tracer.startActiveSpan(name, async (span) => {
            const wrapper = new OTelSpanWrapper(span);
            try {
                const result = await fn(wrapper);
                return result;
            }
            catch (error) {
                wrapper.setStatus({
                    code: obs_core_1.TelemetryStatus.ERROR,
                    message: error instanceof Error ? error.message : String(error)
                });
                wrapper.recordException(error);
                throw error;
            }
            finally {
                wrapper.end();
            }
        });
    }
    async startActiveSpanWithAttributes(name, attributes, fn) {
        return this.tracer.startActiveSpan(name, { attributes: attributes }, async (span) => {
            const wrapper = new OTelSpanWrapper(span);
            try {
                const result = await fn(wrapper);
                return result;
            }
            catch (error) {
                wrapper.setStatus({
                    code: obs_core_1.TelemetryStatus.ERROR,
                    message: error instanceof Error ? error.message : String(error)
                });
                wrapper.recordException(error);
                throw error;
            }
            finally {
                wrapper.end();
            }
        });
    }
}
class OpenTelemetryProvider {
    setInternalLogger(logger) {
        this.logger = logger;
    }
    getTracer(name) {
        const otelTracer = api_1.trace.getTracer(name);
        return new OTelTracerWrapper(otelTracer);
    }
    getMetrics(name) {
        const wrapper = new OTelMetricsWrapper(name);
        if (this.logger) {
            wrapper.setInternalLogger(this.logger);
        }
        return wrapper;
    }
}
exports.OpenTelemetryProvider = OpenTelemetryProvider;
