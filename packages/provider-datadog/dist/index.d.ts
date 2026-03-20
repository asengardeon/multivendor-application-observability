import { ITelemetryTracer, IObservabilityProvider, IInternalLogger } from '@multivendor/obs-core';
export declare class DatadogProvider implements IObservabilityProvider {
    private logger?;
    setInternalLogger(logger: IInternalLogger): void;
    getTracer(name: string): ITelemetryTracer;
}
