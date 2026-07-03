# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Visão geral

**Health** é um PWA pessoal full-stack (usuário único, sem auth, online-only, mobile-first) de saúde e treino de musculação, com duas áreas:

- **Medidas** — medições corporais com gráficos, metas, fotos de progresso com comparador e perfil de saúde (IMC/TMB/TDEE derivados em `lib/calculations.ts`).
- **Treino** — catálogo de exercícios (importável da free-exercise-db + cadastro manual), divisões com protocolo de séries e **execução guiada de sessão** (timer de descanso com cues sonoros/vibração, wake lock, PRs, badges, streak).

## Comandos de desenvolvimento

```bash
# backend (hot-reload via tsx)
cd backend && npm run dev        # http://localhost:3333
cd backend && npm run build      # tsc → dist/
cd backend && npm test           # vitest (calculations, prDetection, streakService)

# frontend (Vite)
cd frontend && npm run dev       # http://localhost:5173 (proxy /api e /uploads → :3333)
cd frontend && npm run build     # tsc -b + vite build
cd frontend && npm test          # vitest (sessionMachine)
cd frontend && npm run lint      # ESLint (regras react-hooks v7 — ver Convenções)
```

Pré-requisito local: PostgreSQL acessível (banco `health`). `migrate()` + seed de badges rodam no boot.

## Arquitetura

```
Browser → Caddy (proxy central, TLS) → Express (server :3333, serve SPA + API + /uploads) → PostgreSQL
                                                  └──(catalogSyncService, lazy)──▶ free-exercise-db (GitHub raw)
```

Em produção o Express serve o build do frontend (`backend/public`, copiado na imagem) com fallback de SPA, a API em `/api` e uploads em `/uploads` (volume) na porta 3333. Em dev o Vite serve o frontend com proxy.

### Backend (`backend/src/`)

Padrão em camadas por domínio: `types/` → `models/` (pg puro, mapper snake→camel, queries parametrizadas) → `schemas/` (Zod) → `controllers/` (asyncHandler + Zod, erros `{ error: "msg PT" }`) → `routes/`.

- **`database/`** — `connection.ts` (pool + type parsers de NUMERIC/DATE→number/string), `migrate.ts` (DDL idempotente), `seedBadges.ts`.
- **Domínios**: profile, settings, measurement, goal (1 ativa — índice único parcial), photo (multer), exercise, split, session, catalog, stats.
- **Sessão**: pré-materializada no start (`session_sets` copiados dos `planned_sets` com targets/descanso/peso sugerido). "Feito" = `PUT /api/session-sets/:id {completed:true, weightKg, reps, rpe?, rir?}`. Só 1 sessão `in_progress` (índice único parcial).
- **`services/sessionFinishService.ts`** — finalização em **transação**: volume, PRs, badges, streak. **`prDetection.ts`** — PRs append-only com baseline (previous_value NULL não conta como PR). **`streakService.ts`** — streak on-demand (dias não programados não quebram). Todos testados.
- **`services/catalogSyncService.ts`** — sincroniza o JSON completo da free-exercise-db para `catalog_exercises` (lazy, na primeira busca); importar baixa a 1ª imagem para uploads (`lib/upload.ts`).

### Frontend (`frontend/src/`)

- **`App.tsx`** — rotas; `SessionPage` (`/treino/sessao/ativa`) fica **fora** do Layout (tela cheia, sem sidebar). Modais são rotas filhas (`<Outlet context>`).
- **`utils/sessionMachine.ts`** — reducer puro da sessão (fases `overview/exercising/resting/exerciseDone`), **testado**. Não adicionar lógica de fase fora dele.
- **`context/WorkoutSessionContext.tsx`** — provider com persistência tripla: backend + snapshot `localStorage` (`health.activeSession.v1`) + reconciliação no boot (refresh no meio do descanso retoma o countdown, pois `restEndsAt` é timestamp absoluto).
- **Hooks de sessão**: `useRestTimer` (deriva o restante de um estado `now`; dispara `onPrepare` aos 10s e `onEnd` por detecção de borda), `useAudioCue` (WebAudio, requer `unlock()` num gesto do usuário), `useWakeLock`, `useNow` (relógio compartilhado — nunca chame `Date.now()` em render).
- **Componentes de treino**: `RestTimerRing`, `StepperInput` (segurar para repetir), `RpeSelector`, `ActiveSessionBar` (barra fixa de sessão ativa), `Sidebar` (bottom-nav com FAB contextual no mobile).
- **Gráficos**: recharts encapsulado em `components/MetricLineChart` — não usar recharts direto nas páginas.

### Schema do banco (principais)

`profile` (linha única) · `settings` (linha única) · `measurements` · `goals` (índice único parcial p/ ativa) · `progress_photos` · `exercises` (catálogo local) · `catalog_exercises` (espelho da base externa) · `splits` + `split_exercises` + `planned_sets` · `workout_sessions` (índice único parcial p/ in_progress) + `session_exercises` + `session_sets` · `personal_records` (append-only) · `badges` + `awarded_badges`.

## Convenções

- **Idioma**: código em inglês; UI e erros de API em português.
- **TypeScript strict** nos dois lados. Backend `module: NodeNext` → **imports com extensão `.js`**. Frontend `moduleResolution: bundler` → sem extensão.
- **Estilo**: CSS Modules por componente; usar sempre os tokens `--color-*`/`--spacing-*` do `styles/global.css` (tema violeta dark, `#8b5cf6`), **nunca** hardcode. Breakpoints: 768px (layout) e 480px (fino).
- **Sem comentários no código**, exceto quando registram uma restrição não óbvia.
- **ESLint react-hooks v7 (regras do React Compiler)**: nada de `Date.now()`/impureza em render (use `useNow`), nada de escrever ref durante render (atualize em effect), nada de `setState` síncrono no corpo de effect (inicialize estado por props em componente filho — ver `ProfileForm`/`SettingsForm` — ou setState só em callbacks assíncronos).
- Uploads via multer para `UPLOAD_DIR` (default `./uploads`; `/app/uploads` no container).
