"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewRelicProvider = void 0;
const obs_core_1 = require("@multivendor/obs-core");
// Simulando o import do New Relic
let newrelic;
try {
    if (typeof require !== 'undefined') {
        newrelic = require('newrelic');
    }
    else {
        throw new Error('require is not defined');
    }
}
catch (e) {
    newrelic = (typeof global !== 'undefined' ? global.newrelic : undefined) || {
        startWebTransaction: (_url, handle) => handle(),
        startBackgroundTransaction: (_name, _group, handle) => handle(),
        addCustomAttribute: () => { },
        noticeError: () => { },
        setTransactionName: () => { },
        getTransaction: () => ({ end: () => { } })
    };
}
class NewRelicContext {
    get traceId() {
        return undefined; // NR gerencia internamente ou via headers específicos
    }
    get spanId() {
        return undefined;
    }
    serialize() {
        const output = {};
        // Em um cenário real: newrelic.getLinkingMetadata()
        return output;
    }
    setBaggage(key, value) {
        // New Relic não expõe Baggage API diretamente de forma compatível
    }
    getBaggage(key) {
        return undefined;
    }
}
class NewRelicSpan {
    setAttribute(key, value) {
        newrelic.addCustomAttribute(key, value);
        return this;
    }
    setAttributes(attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== undefined) {
                newrelic.addCustomAttribute(key, value);
            }
        });
        return this;
    }
    setStatus(status) {
        if (status.code === obs_core_1.TelemetryStatus.ERROR) {
            newrelic.noticeError(status.message || 'Error reported via setStatus');
        }
        return this;
    }
    recordException(error) {
        newrelic.noticeError(error);
        return this;
    }
    getContext() {
        return new NewRelicContext();
    }
    getNativeSpan() {
        return newrelic;
    }
    end() {
        // O New Relic gerencia o fim da transação automaticamente no wrap,
        // mas poderíamos chamar o fim manual se necessário.
    }
}
class NewRelicTracer {
    constructor(name) {
        this.name = name;
    }
    async startActiveSpan(name, fn) {
        const span = new NewRelicSpan();
        // O New Relic usa o conceito de transações/segmentos
        return newrelic.startBackgroundTransaction(name, this.name, () => fn(span));
    }
    async startActiveSpanWithAttributes(name, attributes, fn) {
        const span = new NewRelicSpan();
        span.setAttributes(attributes);
        return newrelic.startBackgroundTransaction(name, this.name, () => fn(span));
    }
}
class NewRelicProvider {
    setInternalLogger(logger) {
        this.logger = logger;
    }
    getTracer(name) {
        return new NewRelicTracer(name);
    }
}
exports.NewRelicProvider = NewRelicProvider;
