import { IObservabilityProvider, IInternalLogger } from './interfaces';
/**
 * Define o logger interno da biblioteca.
 */
export declare const setInternalLogger: (logger: IInternalLogger) => void;
export declare const setObservabilityProvider: (newProvider: IObservabilityProvider) => void;
export declare const getTracer: (name: string) => import("./interfaces").ITelemetryTracer;
export declare const getMetrics: (name: string) => import("./interfaces").ITelemetryMetrics | undefined;
export declare const getLogger: (name: string) => import("./interfaces").ILogger | undefined;
export declare const registerNativeMetrics: (serviceName: string) => void | undefined;
export declare const registerHealthCheck: (check: any) => void | undefined;
export declare const getNativeMeter: (name: string) => any;
export * from './middlewares/express';
export * from './interfaces';
