/**
 * Middleware para Express que cria um span para cada requisição.
 */
export declare const expressMiddleware: (serviceName: string) => (req: any, res: any, next: any) => void;
