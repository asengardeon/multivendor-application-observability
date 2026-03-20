# multivendor-application-observability (Monorepo)

Enterprise Observability Abstraction (OTel, NR, Datadog).

Esta biblioteca foi dividida em pacotes modulares para garantir que você instale apenas o que for necessário.

## Instalação

### 1. Core da Biblioteca (Obrigatório)

O `@multivendor/obs-core` contém as interfaces, o middleware Express e a lógica de abstração.

```bash
npm install @multivendor/obs-core
```

### 2. Escolhendo seu Provedor

Instale o pacote do provedor que deseja utilizar. A biblioteca continuará utilizando a variável de ambiente `OBSERVABILITY_VENDOR` para carregar o provedor correto em runtime.

#### OpenTelemetry (Padrão)
```bash
npm install @multivendor/obs-provider-otel @opentelemetry/api
```

#### Datadog
```bash
npm install @multivendor/obs-provider-datadog dd-trace
```

#### New Relic
```bash
npm install @multivendor/obs-provider-newrelic newrelic
```

## Configuração

A variável de ambiente `OBSERVABILITY_VENDOR` define qual pacote será carregado dinamicamente:

| Valor | Pacote Carregado |
|-------|------------------|
| `otel` (padrão) | `@multivendor/obs-provider-otel` |
| `datadog` | `@multivendor/obs-provider-datadog` |
| `newrelic` | `@multivendor/obs-provider-newrelic` |

Exemplo:
```bash
OBSERVABILITY_VENDOR=datadog node dist/index.js
```

## Como Usar

As importações agora devem ser feitas a partir do `@multivendor/obs-core`:

```typescript
import { getTracer, getMetrics, getLogger } from '@multivendor/obs-core';

const tracer = getTracer('my-service');
// ... resto do uso permanece igual
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
- **Release (`release.yml`)**: Executado ao criar uma tag (ex: `v1.0.0`). Realiza o build e publica todos os pacotes no **NPM** e no **GitHub Packages**.
  - Requisito NPM: Segredo `NPM_TOKEN` configurado no repositório.
  - Requisito GitHub: Utiliza o `GITHUB_TOKEN` automático para a publicação.

### Instalando via GitHub Packages

Para instalar os pacotes via GitHub Packages, você precisa configurar o seu arquivo `.npmrc` para apontar o escopo `@multivendor` para o registro do GitHub:

```text
@multivendor:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=SEU_GITHUB_TOKEN
```

## Licença

ISC
