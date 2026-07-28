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
cd backend && npm test           # vitest (calculations, pgError, schemas/common)

# frontend (Vite)
cd frontend && npm run dev       # http://localhost:5173 (proxy /api e /uploads → :3333)
cd frontend && npm run build     # tsc -b + vite build
cd frontend && npm test          # vitest (sessionMachine, restTimerCues)
cd frontend && npm run lint      # ESLint (regras react-hooks v7 — ver Convenções)
```

Pré-requisito local: PostgreSQL acessível (banco `health`). `migrate()` roda no boot (DDL idempotente,
sem tabela de versão): DDL nova entra como `CREATE/ALTER ... IF [NOT] EXISTS` no fim do arquivo.

## Arquitetura

```
Browser → Caddy (proxy central, TLS) → Express (server :3333, serve SPA + API + /uploads) → PostgreSQL
```

Em produção o Express serve o build do frontend (`backend/public`, copiado na imagem) com fallback de SPA, a API em `/api` e uploads em `/uploads` (volume) na porta 3333. Em dev o Vite serve o frontend com proxy.

### Backend (`backend/src/`)

Padrão em camadas por domínio: `types/` → `models/` (pg puro, mapper snake→camel, queries parametrizadas) → `schemas/` (Zod) → `controllers/` (asyncHandler + Zod, erros `{ error: "msg PT" }`) → `routes/`.

- **`database/`** — `connection.ts` (pool com timeouts, `pool.on("error")`, `rollback()` que não mascara o erro original, type parsers de NUMERIC/DATE→number/string) e `migrate.ts` (DDL idempotente).
- **Domínios**: profile, settings, measurement, goal (1 ativa — índice único parcial), photo (multer), exercise (catálogo próprio, com `video_url`), split, session, stats.
- **Sessão**: pré-materializada no start (`session_sets` a partir dos `planned_sets`, com targets, descanso do exercício e carga do catálogo). "Feito" = `PUT /api/session-sets/:id {completed:true, weightKg, reps, rpe?, rir?}` — sempre com peso e reps, senão a série soma zero no volume. Só 1 sessão `in_progress` (índice único parcial), e séries de sessão **concluída** não podem mais ser alteradas (o volume é congelado no finish).
- **`services/sessionFinishService.ts`** — finalização em **transação**: calcula volume, séries e duração. Não há PRs, badges nem streak.
- **Erros**: `lib/asyncHandler.ts` loga o inesperado e responde 500; `lib/pgError.ts` traduz códigos do Postgres (FK, CHECK, UUID/data inválidos) em 4xx; `middleware/requireUuid.ts` barra `:id` malformado antes do SQL. Não deixe erro de banco virar 500 sem log.
- **Datas**: `started_at` é TIMESTAMPTZ — sempre `(started_at AT TIME ZONE $tz)::date` com `APP_TIMEZONE` (`lib/dateUtils.ts`), nunca `::date` direto. Idade/TMB/TDEE de medição passada usam a idade **da data da medição** (`deriveBodyMetrics({ onIso })`).
- **Catálogo próprio** — exercícios cadastrados pelo usuário (`exercises`), cada um com imagem (upload via `lib/upload.ts`), `video_url` (link YouTube) e `notes` (instruções de execução). Não há mais integração com base externa (free-exercise-db removida).

### Frontend (`frontend/src/`)

- **`App.tsx`** — rotas (com catch-all `*` e `ErrorBoundary` na raiz). Treino e execução moram na mesma tela: `SplitEditorPage` (`/treino/divisoes/:id`) é gerenciar **e** executar (idle → 1º Play cria a sessão e começa o cronômetro; tudo inline). Não há mais `SessionPage`/`/treino/sessao/ativa`.
- **`utils/sessionMachine.ts`** — reducer puro da sessão (fases `overview/exercising/resting/interRest/exerciseDone`), **testado**. Não adicionar lógica de fase fora dele; `withSession()` reconcilia a fase quando séries mudam fora do fluxo Play→Feito. Os helpers exportados (`firstPendingSetIndex`, `hasPendingSets`, `completedSetsOf`, …) existem para não recalcular isso nas páginas.
- **`context/WorkoutSessionContext.tsx`** — provider com backend + snapshot `localStorage` (`health.activeSession.v2`, validado na leitura) + reconciliação no boot. **O timer de descanso, os cues de áudio e o wake lock vivem aqui**, não na tela: sair da `SplitEditorPage` no meio do descanso não pode parar a contagem. Falha no boot expõe `bootError` e **não** apaga o snapshot.
- **Hooks de sessão**: `useRestTimer` (deriva de `useNow`; a borda de fim é identificada pelo próprio `restEndsAt` via `utils/restTimerCues.ts`, **testado**, para que um descanso já expirado no mount dispare `onEnd`), `useAudioCue` (WebAudio, requer `unlock()` num gesto do usuário), `useWakeLock`, `useNow` (relógio compartilhado — nunca chame `Date.now()` em render).
- **Componentes de treino**: `ActiveSessionBar` (barra fixa de sessão ativa → volta para `/treino/divisoes/:splitId`), `Sidebar` (bottom-nav com FAB contextual no mobile). A execução é inline na `SplitEditorPage` (linha Play→Feito + contagem de descanso), sem digitar peso/reps por série (usa a carga do exercício).
- **Compartilhados**: `hooks/useResource` (fetch + loading + erro + `remove` que devolve boolean) é a base dos hooks de coleção; `useConfirmDelete` para o fluxo de exclusão; `ErrorBanner`/`Loading`/`EmptyState`/`ExerciseThumb`/`SegmentedControl`/`Modal` (com `useFocusTrap`) para a UI. Formulário só renderiza com os dados carregados — sem isso, salvar gravaria defaults por cima do servidor.
- **Gráficos**: recharts encapsulado em `components/MetricLineChart` — não usar recharts direto nas páginas. As cores vêm do CSS Module via seletores `:global(.recharts-*)`, porque recharts escreve `stroke`/`fill` como atributo e qualquer regra CSS vence.

### Schema do banco (principais)

`profile` (linha única) · `settings` (linha única) · `body_measurements` · `goals` (índice único parcial p/ ativa) · `progress_photos` · `exercises` (catálogo próprio; `working_weight_kg` = carga, `video_url`, `notes`=execução) · `workout_splits` + `split_exercises` + `planned_sets` (só posição e reps alvo) · `workout_sessions` (índice único parcial p/ in_progress) + `session_exercises` + `session_sets`.

A carga vive **só** em `exercises.working_weight_kg`. Não existe aquecimento planejado: `planned_sets` não tem `set_type`, e toda série materializada é `working`. As tabelas de ExerciseDB, PRs e gamificação foram dropadas.

## Convenções

- **Idioma**: código em inglês; UI e erros de API em português.
- **TypeScript strict** nos dois lados. Backend `module: NodeNext` → **imports com extensão `.js`**. Frontend `moduleResolution: bundler` → sem extensão.
- **Estilo**: CSS Modules por componente; usar sempre os tokens `--color-*`/`--spacing-*` do `styles/global.css` (tema violeta dark, `#8b5cf6`), **nunca** hardcode — texto sobre superfície de destaque é `--color-on-accent`. Breakpoints: 768px (layout) e 480px (fino).
- **Sem comentários no código**, exceto quando registram uma restrição não óbvia.
- **ESLint react-hooks v7 (regras do React Compiler)**: nada de `Date.now()`/impureza em render (use `useNow`), nada de escrever ref durante render (atualize em effect), nada de `setState` síncrono no corpo de effect (inicialize estado por props em componente filho — ver `ProfileForm`/`SettingsForm` — ou setState só em callbacks assíncronos).
- Uploads via multer para `UPLOAD_DIR` (default `./uploads`; `/app/uploads` no container).

## Fluxo de trabalho

- Para tarefas que envolvam mais de um arquivo, apresente um plano e aguarde aprovação antes de editar.
- Tarefas simples (1 arquivo, mudança pequena) pode executar direto.

## Manutenção deste arquivo

- Quando uma mudança tornar algo aqui factualmente incorreto (módulo/arquivo renomeado ou
  removido, comando alterado, nova integração, novo invariante ou gotcha), atualize a linha
  afetada na mesma tarefa.
- Edite no lugar e remova o que ficou obsoleto — este arquivo não cresce sem contrapartida.
  Prefira descrever padrões/invariantes estáveis a listar arquivos.
- Documente fatos, não preferências. Não adicione convenções ou "boas práticas" novas por conta
  própria: proponha e deixe a decisão de estilo comigo.
- Mantenha conciso e em português.
