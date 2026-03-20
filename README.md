# @multivendor/observability

Enterprise Observability Abstraction (OpenTelemetry).

Esta biblioteca fornece uma abstração unificada para observabilidade utilizando OpenTelemetry.

## Instalação

```bash
npm install @multivendor/observability @opentelemetry/api
```

## Como Usar

```typescript
import { getTracer, getMetrics, getLogger } from '@multivendor/observability';

const tracer = getTracer('my-service');
// ...
```

### Propagação de Contexto (Baggage)

Útil para passar informações de negócio entre diferentes serviços (ex: `tenant-id`).

```typescript
tracer.startActiveSpan('process', (span) => {
  const ctx = span.getContext();
  ctx.setBaggage('tenant-id', 'company-a');
  
  // O valor estará disponível em spans filhos ou serviços chamados via HTTP
  const tenantId = ctx.getBaggage('tenant-id');
});
```

### Health Checks

Interface para expor o estado da aplicação.

```typescript
import { registerHealthCheck, HealthStatus } from '@multivendor/obs-core';

registerHealthCheck({
  getName: () => 'database',
  check: async () => {
    const isAlive = await db.ping();
    return {
      status: isAlive ? HealthStatus.UP : HealthStatus.DOWN,
      details: { host: 'localhost' }
    };
  }
});
```

### Middlewares

#### Express

A biblioteca oferece um middleware para facilitar a instrumentação de aplicações Express.

```typescript
import express from 'express';
import { expressMiddleware } from '@multivendor/obs-core';

const app = express();

// Registra o middleware
app.use(expressMiddleware('my-api-service'));

app.get('/hello', (req, res) => {
  res.send('Hello World');
});

app.listen(3000);
```

### Customizando Logs Internos

Você pode substituir o logger interno da biblioteca (usado para diagnóstico) por um logger da sua preferência (ex: Winston, Pino).

```typescript
import { setInternalLogger } from '@multivendor/obs-core';

setInternalLogger({
  info: (msg, ...args) => myCustomLogger.info(msg, ...args),
  warn: (msg, ...args) => myCustomLogger.warn(msg, ...args),
  error: (msg, ...args) => myCustomLogger.error(msg, ...args),
});
```

## Interfaces Principais

### `ITelemetrySpan`
- `setAttribute(key, value)`: Define um atributo simples no span.
- `setAttributes(attributes)`: Define múltiplos atributos de uma vez.
- `setStatus({ code, message })`: Define o status do span (OK, ERROR, UNSET).
- `recordException(error)`: Registra uma exceção no span.
- `end()`: Encerra o span manualmente (geralmente gerenciado pelo `startActiveSpan`).

### `TelemetryStatus`
Enumeração para estados de span:
- `TelemetryStatus.OK`
- `TelemetryStatus.ERROR`
- `TelemetryStatus.UNSET`

## Compatibilidade e Bundlers

A biblioteca foi projetada principalmente para ambientes Node.js, mas possui verificações de segurança para não quebrar em outros contextos (como navegadores ou durante o processo de build em bundlers como Webpack, Vite ou Esbuild).

Se você estiver usando um bundler:
1. **Node Globals**: Certifique-se de que o seu bundler lida corretamente com `process.env`. Muitos bundlers modernos substituem isso automaticamente.
2. **Dynamic Requires**: Como utilizamos `require` dinâmico para carregar os provedores sob demanda, alguns bundlers podem emitir avisos. Isso é intencional para manter o bundle leve, incluindo apenas o provedor que você realmente instalar.

## Desenvolvimento e CI/CD

O projeto utiliza **GitHub Actions** para automação de testes e distribuição:

- **CI (`ci.yml`)**: Executado em cada Push ou Pull Request para as branches `main` ou `master`. Realiza o build de todos os pacotes em múltiplas versões de Node.js.
- **Release (`release.yml`)**: Executado ao criar uma tag (ex: `v1.0.0`). Realiza o build e publica todos os pacotes no **NPM**.
  - Requisito NPM: Segredo `NPM_TOKEN` configurado no repositório.

## Licença

ISC
