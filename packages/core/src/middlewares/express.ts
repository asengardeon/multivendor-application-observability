import { getTracer, TelemetryStatus } from '../index'

/**
 * Middleware para Express que cria um span para cada requisição.
 */
export const expressMiddleware = (serviceName: string) => {
  const tracer = getTracer(serviceName)

  return (req: any, res: any, next: any) => {
    const spanName = `${req.method} ${req.path}`
    
    tracer.startActiveSpanWithAttributes(
      spanName,
      {
        'http.method': req.method,
        'http.url': req.url,
        'http.path': req.path,
        'http.user_agent': req.headers['user-agent']
      },
      async (span) => {
        // Intercepta o fim da resposta para fechar o span e definir o status
        const originalEnd = res.end
        res.end = function (...args: any[]) {
          span.setAttribute('http.status_code', res.statusCode)
          
          if (res.statusCode >= 400) {
            span.setStatus({ 
              code: TelemetryStatus.ERROR, 
              message: `HTTP ${res.statusCode}` 
            })
          } else {
            span.setStatus({ code: TelemetryStatus.OK })
          }
          
          span.end()
          return originalEnd.apply(this, args)
        }

        next()
      }
    )
  }
}
