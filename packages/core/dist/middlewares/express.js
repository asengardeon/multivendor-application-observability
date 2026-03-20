"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expressMiddleware = void 0;
const index_1 = require("../index");
/**
 * Middleware para Express que cria um span para cada requisição.
 */
const expressMiddleware = (serviceName) => {
    const tracer = (0, index_1.getTracer)(serviceName);
    return (req, res, next) => {
        const spanName = `${req.method} ${req.path}`;
        tracer.startActiveSpanWithAttributes(spanName, {
            'http.method': req.method,
            'http.url': req.url,
            'http.path': req.path,
            'http.user_agent': req.headers['user-agent']
        }, async (span) => {
            // Intercepta o fim da resposta para fechar o span e definir o status
            const originalEnd = res.end;
            res.end = function (...args) {
                span.setAttribute('http.status_code', res.statusCode);
                if (res.statusCode >= 400) {
                    span.setStatus({
                        code: index_1.TelemetryStatus.ERROR,
                        message: `HTTP ${res.statusCode}`
                    });
                }
                else {
                    span.setStatus({ code: index_1.TelemetryStatus.OK });
                }
                span.end();
                return originalEnd.apply(this, args);
            };
            next();
        });
    };
};
exports.expressMiddleware = expressMiddleware;
