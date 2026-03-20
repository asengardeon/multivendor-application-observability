"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogProvider = void 0;
const obs_core_1 = require("@multivendor/obs-core");
// Simulando o import do Datadog
let dd;
try {
    if (typeof require !== 'undefined') {
        dd = require('dd-trace');
    }
    else {
        throw new Error('require is not defined');
    }
}
catch (e) {
    dd = (typeof global !== 'undefined' ? global.datadog : undefined) || {
        tracer: {
            trace: (name, _options, handle) => {
                const mockSpan = {
                    setTag: () => { },
                    setAttributes: () => { },
                    setTagAsError: () => { },
                    finish: () => { },
                    context: () => ({ toTraceId: () => undefined, toSpanId: () => undefined })
                };
                return handle(mockSpan);
            },
            scope: () => ({ active: () => null })
        }
    };
}
class DatadogContext {
    constructor(nativeSpan) {
        this.nativeSpan = nativeSpan;
    }
    get traceId() {
        return this.nativeSpan.context()?.toTraceId();
    }
    get spanId() {
        return this.nativeSpan.context()?.toSpanId();
    }
    serialize() {
        const output = {};
        // Em um cenário real: dd.tracer.inject(this.nativeSpan.context(), 'http_headers', output)
        return output;
    }
    setBaggage(key, value) {
        // Datadog gerencia baggage via tags se propagadas, 
        // ou via contexto distribuído. Abstração no-op por ora.
    }
    getBaggage(key) {
        return undefined;
    }
}
class DatadogSpan {
    constructor(nativeSpan) {
        this.nativeSpan = nativeSpan;
    }
    setAttribute(key, value) {
        this.nativeSpan.setTag(key, value);
        return this;
    }
    setAttributes(attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== undefined) {
                this.nativeSpan.setTag(key, value);
            }
        });
        return this;
    }
    setStatus(status) {
        if (status.code === obs_core_1.TelemetryStatus.ERROR) {
            this.nativeSpan.setTag('error', true);
            if (status.message) {
                this.nativeSpan.setTag('error.message', status.message);
            }
        }
        return this;
    }
    recordException(error) {
        this.nativeSpan.setTag('error', true);
        this.nativeSpan.setTag('error.msg', error instanceof Error ? error.message : error);
        this.nativeSpan.setTag('error.stack', error instanceof Error ? error.stack : undefined);
        return this;
    }
    getContext() {
        return new DatadogContext(this.nativeSpan);
    }
    getNativeSpan() {
        return this.nativeSpan;
    }
    end() {
        this.nativeSpan.finish();
    }
}
class DatadogTracer {
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    async startActiveSpan(name, fn) {
        return dd.tracer.trace(name, { service: this.serviceName }, (nativeSpan) => {
            const span = new DatadogSpan(nativeSpan);
            return fn(span);
        });
    }
    async startActiveSpanWithAttributes(name, attributes, fn) {
        const options = {
            service: this.serviceName,
            tags: attributes
        };
        return dd.tracer.trace(name, options, (nativeSpan) => {
            const span = new DatadogSpan(nativeSpan);
            return fn(span);
        });
    }
}
class DatadogProvider {
    setInternalLogger(logger) {
        this.logger = logger;
    }
    getTracer(name) {
        return new DatadogTracer(name);
    }
}
exports.DatadogProvider = DatadogProvider;
