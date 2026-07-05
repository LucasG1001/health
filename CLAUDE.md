# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Visão geral

**Health** é um PWA pessoal full-stack (usuário único, sem auth, online-only, mobile-first) de saúde e treino de musculação, com duas áreas:

- **Medidas** — medições corporais com gráficos, metas, fotos de progresso com comparador e perfil de saúde (IMC/TMB/TDEE derivados em `lib/calculations.ts`).
- **Treino** — catálogo **próprio** de exercícios (cadastro com imagem, vídeo do YouTube e instruções de execução), treinos (divisões) com séries/reps e **carga por exercício**, e **execução guiada de sessão** (timer de descanso com cues sonoros/vibração, wake lock). Sem PRs/streak/conquistas.

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
```

Em produção o Express serve o build do frontend (`backend/public`, copiado na imagem) com fallback de SPA, a API em `/api` e uploads em `/uploads` (volume) na porta 3333. Em dev o Vite serve o frontend com proxy.

### Backend (`backend/src/`)

Padrão em camadas por domínio: `types/` → `models/` (pg puro, mapper snake→camel, queries parametrizadas) → `schemas/` (Zod) → `controllers/` (asyncHandler + Zod, erros `{ error: "msg PT" }`) → `routes/`.

- **`database/`** — `connection.ts` (pool + type parsers de NUMERIC/DATE→number/string), `migrate.ts` (DDL idempotente), `seedBadges.ts`.
- **Domínios**: profile, settings, measurement, goal (1 ativa — índice único parcial), photo (multer), exercise (catálogo próprio, com `video_url`), split, session, stats.
- **Sessão**: pré-materializada no start (`session_sets` copiados dos `planned_sets` com targets/descanso/peso sugerido). "Feito" = `PUT /api/session-sets/:id {completed:true, weightKg, reps, rpe?, rir?}`. Só 1 sessão `in_progress` (índice único parcial).
- **`services/sessionFinishService.ts`** — finalização em **transação**: volume, PRs, badges, streak. **`prDetection.ts`** — PRs append-only com baseline (previous_value NULL não conta como PR). **`streakService.ts`** — streak on-demand (dias não programados não quebram). Todos testados.
- **Catálogo próprio** — exercícios cadastrados pelo usuário (`exercises`), cada um com imagem (upload via `lib/upload.ts`), `video_url` (link YouTube) e `notes` (instruções de execução). Não há mais integração com base externa (free-exercise-db removida).

### Frontend (`frontend/src/`)

- **`App.tsx`** — rotas. Treino e execução moram na mesma tela: `SplitEditorPage` (`/treino/divisoes/:id`) é gerenciar **e** executar (idle → "Começar treino" → armado → 1º Play cria a sessão e começa o cronômetro; tudo inline). Não há mais `SessionPage`/`/treino/sessao/ativa`.
- **`utils/sessionMachine.ts`** — reducer puro da sessão (fases `overview/exercising/resting/exerciseDone`), **testado**. Não adicionar lógica de fase fora dele.
- **`context/WorkoutSessionContext.tsx`** — provider com persistência tripla: backend + snapshot `localStorage` (`health.activeSession.v1`) + reconciliação no boot (refresh no meio do descanso retoma o countdown, pois `restEndsAt` é timestamp absoluto).
- **Hooks de sessão**: `useRestTimer` (deriva o restante de um estado `now`; dispara `onPrepare` aos 10s e `onEnd` por detecção de borda), `useAudioCue` (WebAudio, requer `unlock()` num gesto do usuário), `useWakeLock`, `useNow` (relógio compartilhado — nunca chame `Date.now()` em render).
- **Componentes de treino**: `ActiveSessionBar` (barra fixa de sessão ativa → volta para `/treino/divisoes/:splitId`), `Sidebar` (bottom-nav com FAB contextual no mobile). A execução é inline na `SplitEditorPage` (linha Play→Feito + contagem de descanso), sem digitar peso/reps por série (usa a carga do exercício).
- **Gráficos**: recharts encapsulado em `components/MetricLineChart` — não usar recharts direto nas páginas.

### Schema do banco (principais)

`profile` (linha única) · `settings` (linha única) · `measurements` · `goals` (índice único parcial p/ ativa) · `progress_photos` · `exercises` (catálogo próprio; `video_url`, `notes`=execução) · `splits` + `split_exercises` (`working_weight_kg` = carga por exercício) + `planned_sets` · `workout_sessions` (índice único parcial p/ in_progress) + `session_exercises` + `session_sets`. Tabelas `catalog_exercises`, `personal_records`, `badges`/`awarded_badges` permanecem no schema mas estão **inativas** (integração ExerciseDB e gamificação removidas).

## Convenções

- **Idioma**: código em inglês; UI e erros de API em português.
- **TypeScript strict** nos dois lados. Backend `module: NodeNext` → **imports com extensão `.js`**. Frontend `moduleResolution: bundler` → sem extensão.
- **Estilo**: CSS Modules por componente; usar sempre os tokens `--color-*`/`--spacing-*` do `styles/global.css` (tema violeta dark, `#8b5cf6`), **nunca** hardcode. Breakpoints: 768px (layout) e 480px (fino).
- **Sem comentários no código**, exceto quando registram uma restrição não óbvia.
- **ESLint react-hooks v7 (regras do React Compiler)**: nada de `Date.now()`/impureza em render (use `useNow`), nada de escrever ref durante render (atualize em effect), nada de `setState` síncrono no corpo de effect (inicialize estado por props em componente filho — ver `ProfileForm`/`SettingsForm` — ou setState só em callbacks assíncronos).
- Uploads via multer para `UPLOAD_DIR` (default `./uploads`; `/app/uploads` no container).
