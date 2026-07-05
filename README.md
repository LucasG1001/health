# Health

PWA pessoal (usuário único, sem auth, mobile-first) de saúde e treino de musculação, com duas áreas que compartilham o mesmo design:

- **Medidas** — peso e medidas corporais com gráficos de evolução, metas (peso / % de gordura), fotos de progresso com comparador e perfil de saúde (IMC/TMB/gasto calculados).
- **Treino** — divisões (A, B, C…) montadas a partir de um catálogo importável de exercícios, e **execução guiada** da sessão: série a série, com timer de descanso (aviso sonoro/vibração aos 10s e liberação automática), carga anterior, recordes pessoais (PRs), conquistas (badges) e sequência de dias (streak).

A navegação é feita por uma Sidebar (vira barra inferior no mobile). A tela de execução da sessão é tela cheia, mantém o display ligado (Wake Lock) e sobrevive a refresh — o descanso continua de onde parou.

## Treino — como funciona

- **Catálogo próprio**: você cadastra cada exercício (acessível pelo header do Treino) com imagem (upload), link de vídeo do YouTube e instruções de execução, além de grupo muscular, equipamento e ajuste do aparelho.
- **Treinos (divisões)**: cada treino tem dias da semana e exercícios ordenados; por exercício define-se número de séries, faixa de reps e **carga (kg)** — editados na tela de detalhe do exercício dentro do treino.
- **Sessão**: abrir um treino leva à tela de gerenciar; "Começar treino" pré-materializa as séries (peso pré-preenchido pela carga) — cada "FEITO" grava peso/reps e dispara o descanso. Só existe **uma sessão em andamento** por vez; uma barra fixa permite voltar para ela.
- **Finalização**: transação calcula volume total e duração e marca o treino como concluído; o resumo aceita anotações e o treino entra no Histórico.

## Arquitetura

```
Browser → Caddy (proxy central, TLS) → Express (server :3333, serve SPA + API + /uploads) → PostgreSQL
```

- Em produção não há nginx: o Express serve o build do frontend (`backend/public`, copiado na imagem) com fallback de SPA, a API em `/api` e as imagens em `/uploads` (volume `uploads_data`) na mesma porta 3333.
- O `migrate()` roda no startup (DDL idempotente). O catálogo de exercícios é próprio (cadastrado pelo usuário); não há mais sincronização com base externa.
- Backend em camadas: `types → models (pg puro, queries parametrizadas) → schemas (Zod) → controllers → routes`. Sessão finalizada em transação (`services/sessionFinishService.ts`).
- Frontend React 19 + Vite; a sessão ativa vive num reducer (`utils/sessionMachine.ts`, testado) com persistência tripla: backend + snapshot em `localStorage` + reconciliação no boot.

## Endpoints principais

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET/PUT` | `/api/profile` · `/api/settings` | perfil de saúde / preferências |
| `GET/POST/PUT/DELETE` | `/api/measurements` | medições corporais (+ `/api/stats/body`) |
| `GET/POST/PATCH/DELETE` | `/api/goals` | metas (1 ativa por vez) |
| `GET/POST/DELETE` | `/api/photos` | fotos de progresso (multer) |
| `CRUD` | `/api/exercises` | catálogo próprio (+ `/:id/image`, `/:id/last-performance`, `/:id/history`) |
| `CRUD` | `/api/splits` | treinos (+ `/:id/exercises` replace atômico, `/:id/exercises/:sxId` séries/reps/carga, `/reorder`) |
| `GET/POST` | `/api/sessions` (+ `/active`, `/:id/finish`) | sessões de treino |
| `PUT/DELETE` | `/api/session-sets/:id` · `/api/session-exercises/:id` | séries e exercícios da sessão |
| `GET` | `/api/stats/{body,volume}` | gráficos |

## Rodando local

Pré-requisito: PostgreSQL com banco `health` (as tabelas são criadas no boot).

```bash
# backend (hot-reload)
cd backend && cp .env.example .env && npm install && npm run dev   # http://localhost:3333

# frontend (Vite, proxy /api e /uploads → :3333)
cd frontend && npm install && npm run dev                          # http://localhost:5173
```

Testes e verificação:

```bash
cd backend && npm test && npm run build
cd frontend && npm test && npm run build && npm run lint
```

## Deploy (VPS)

Padrão da VPS: container único (SPA+API) atrás do proxy central Caddy, com Postgres dedicado.

```bash
cp .env.example .env   # defina POSTGRES_PASSWORD e HEALTH_DOMAIN
docker network create proxy-net   # uma vez na VPS (compartilhada com o Caddy)
docker network create health-net  # uma vez
docker compose up -d --build
```

O Caddy (caddy-docker-proxy) descobre o container pelas labels e termina o TLS para `HEALTH_DOMAIN`. Uploads persistem no volume `uploads_data`; o banco em `postgres_data`.
