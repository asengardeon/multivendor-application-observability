import { ITelemetryTracer, IObservabilityProvider, ITelemetryMetrics, IInternalLogger } from '@multivendor/obs-core';
export declare class OpenTelemetryProvider implements IObservabilityProvider {
    private logger?;
    setInternalLogger(logger: IInternalLogger): void;
    getTracer(name: string): ITelemetryTracer;
    getMetrics(name: string): ITelemetryMetrics;
}
