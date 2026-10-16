# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Visão geral

**Health** é um PWA pessoal full-stack (usuário único, sem auth, online-only, mobile-first) de saúde e treino de musculação, com duas áreas:

- **Medidas** — medições corporais com gráficos, metas, fotos de progresso com comparador e perfil de saúde (IMC/TMB/TDEE derivados em `lib/calculations.ts`).
- **Treino** — catálogo **próprio** de exercícios (cadastro com imagem, vídeo do YouTube e instruções de execução) e treinos (divisões) como **painel visual de consulta**: cada card mostra carga, séries e reps, editáveis inline, e um **check por exercício válido no dia** (`exercise_checks`). Não há sessão, cronômetro, descanso cronometrado, volume, histórico, PRs nem conquistas.

## Comandos de desenvolvimento

```bash
# backend (hot-reload via tsx)
cd backend && npm run dev        # http://localhost:3333
cd backend && npm run build      # tsc → dist/
cd backend && npm test           # vitest unitário (src/**/*.test.ts, sem banco)
cd backend && npm run test:integration  # vitest contra health_test (test/*.int.test.ts, trunca as tabelas)
cd backend && npm run db:up      # Postgres de dev em Docker (docker-compose.dev.yml), porta 5433

# frontend (Vite)
cd frontend && npm run dev       # http://localhost:5173 (proxy /api e /uploads → :3333)
cd frontend && npm run build     # tsc -b + vite build
cd frontend && npm test          # vitest (utils puros: planForm, reorder, splitMerge, measurements, loadLog, load)
cd frontend && npm run lint      # ESLint (regras react-hooks v7 — ver Convenções)
```

Pré-requisito local: o Postgres do `docker-compose.dev.yml` (porta **5433**, user/senha/banco `health`,
mais o banco `health_test` dos testes de integração — o setup recusa URL que não termine em `_test`).
`migrate()` roda no boot (DDL idempotente, sem tabela de versão): DDL nova entra como
`CREATE/ALTER ... IF [NOT] EXISTS` no fim do arquivo. As linhas únicas de `profile`/`settings` também
são criadas ali, não nos models.

## Arquitetura

```
Browser → Caddy (proxy central, TLS) → Express (server :3333, serve SPA + API + /uploads) → PostgreSQL
```

Em produção o Express serve o build do frontend (`backend/public`, copiado na imagem) com fallback de SPA, a API em `/api` e uploads em `/uploads` (volume) na porta 3333. Em dev o Vite serve o frontend com proxy.

### Backend (`backend/src/`)

Padrão em camadas por domínio: `types/` → `models/` (pg puro, mapper snake→camel, queries parametrizadas) → `schemas/` (Zod) → `controllers/` (asyncHandler + Zod, erros `{ error: "msg PT" }`) → `routes/`.

- **`database/`** — `connection.ts` (pool com timeouts, `pool.on("error")`, `rollback()` que não mascara o erro original, type parsers de NUMERIC/DATE→number/string) e `migrate.ts` (DDL idempotente).
- **Domínios**: profile, settings, measurement, goal (1 ativa — índice único parcial), photo (multer), exercise (catálogo próprio, com `video_url`), split, check, load-log, stats (só `body`, da área de Medidas).
- **Log de carga**: toda mudança de `working_weight_kg`/`additional_weight_kg` passa por `exerciseModel.create`/`update`, que grava em `exercise_load_logs` na **mesma transação** (`loadChanges` em `lib/loadLog.ts` decide o que mudou: campo ausente não conta, null ≠ 0). Não altere a carga por outro caminho, senão o log fica furado. Uma linha por campo; os dois campos de um save têm o mesmo `changed_at` (truncado em ms, que é o cursor `before`). `GET /api/load-log?limit&before` nunca corta um instante entre páginas, então pode devolver uma linha a mais que `limit`.
- **Check do dia**: `PUT /api/splits/:id/exercises/:sxId/check {checked}` → 204 (`checkModel.setCheck`, INSERT idempotente / DELETE do dia). A linha é chaveada por **(split_id, exercise_id)**, nunca por `split_exercises.id`: `replaceExercises` apaga e reinsere essas linhas a cada reordenação, e a cascata levaria o check embora. A leitura vem embutida no DTO da divisão (`SplitExercise.checkedToday`, um `EXISTS` no `EXERCISES_SQL` de `splitModel`), então a tela do treino não faz um GET a mais.
- **Plano**: `splitModel.updateExercisePlan` grava numa transação e checa o `split_exercise` dentro dela com `FOR UPDATE` (um reordenar concorrente recria as linhas); ausente, lança `NotFoundError` (404). `series` é opcional no corpo — ausente, só os alvos mudam e as `planned_sets` (com seus ids) são preservadas; o frontend só manda `series` quando a quantidade mudou (`planPatch`).
- **Erros**: `lib/asyncHandler.ts` loga o inesperado e responde 500; `DomainError`/`NotFoundError` (`models/errors.ts`) lançados do model viram 4xx; `lib/pgError.ts` traduz códigos do Postgres (FK, CHECK, UUID/data inválidos) em 4xx, com mensagem por nome de constraint (`BY_CONSTRAINT`); `middleware/requireUuid.ts` barra `:id` malformado antes do SQL. Não deixe erro de banco virar 500 sem log.
- **Datas**: qualquer corte por dia usa `(… AT TIME ZONE $tz)::date` com `APP_TIMEZONE` (`lib/dateUtils.ts`, lido de `process.env.TZ`, default `America/Sao_Paulo`), nunca `::date` direto; no Node, "hoje" é `todayLocalIso()`, nunca `toISOString().slice(0, 10)` — é assim que `exercise_checks.checked_on` é gravado e comparado (senão o treino da noite cai no dia seguinte, com o container em UTC). Idade/TMB/TDEE de medição passada usam a idade **da data da medição** (`deriveBodyMetrics({ onIso })`).
- **Catálogo próprio** — exercícios cadastrados pelo usuário (`exercises`), cada um com imagem (upload via `lib/upload.ts`), `video_url` (link YouTube) e `notes` (instruções de execução). Não há mais integração com base externa (free-exercise-db removida).

### Frontend (`frontend/src/`)

- **`App.tsx`** — rotas (com catch-all `*` e `ErrorBoundary` na raiz). Não há provider global: cada tela carrega o que precisa.
- **Área de Treino** — `components/WorkoutHeader` (ícones + abas "Treinos | Log", cada aba uma rota) no topo de `WorkoutHomePage` (`/treino`) e `WorkoutLogPage` (`/treino/log`). O log é paginado (`useLoadLog`) e agrupado por save e por dia local em `utils/loadLog.ts` (testado).
- **`SplitEditorPage`** (`/treino/divisoes/:id` → `SplitEditor` com `key={id}`; `/nova` → `NewSplit`) — a tela do treino: lista de `ExerciseCard`, contador `feitos hoje` no topo, reordenar arrastando pela **alça** do card (`touch-action: none` fixo nela; pointermove/up/cancel ouvidos no `window`; só persiste se a ordem mudou e reverte se falhar — `utils/reorder.ts`), seletor do catálogo (`fetchExercises` só quando aberto e em cache depois, senão a tela puxaria as imagens do acervo todo) e edição de nome/dias em `Modal`. Toda divisão vinda do servidor passa por `applyServerSplit` (`utils/splitMerge.ts`) para não desfazer checks em voo; ao voltar ao primeiro plano num dia novo, a divisão é recarregada.
- **`SplitEditorPage/ExerciseCard.tsx`** — o card: carga total (pilha + adicional), séries e reps em tiles **editáveis inline** (toque → input, salva no blur; um save por vez) e o check do dia com toggle otimista. Salvar manda só o que mudou (`planPatch`): `updateExercise` (carga, no catálogo) e/ou `updateExercisePlan` (séries/reps); se a carga gravou e o plano falhou, recarrega a divisão. O estado do formulário é semeado por props e a **key do card inclui os valores do plano**, para o card ser remontado quando o servidor devolve a divisão salva — é o que evita `setState` em effect.
- **`utils/planForm.ts`** — parse/validação dos campos de plano (séries, reps mín/máx, carga, adicional) em cima de `numberMask`, **testado**, compartilhado pelo card e pela `WorkoutExerciseDetailPage`. Valor inválido devolve mensagem: descartar em silêncio deixava o campo com texto errado. O campo de carga tem 1 casa e o banco 2, então `loadChanged` compara na precisão do campo.
- `Sidebar` é bottom-nav com FAB de "adicionar" no mobile.
- **Compartilhados**: `hooks/useResource` (fetch + loading + erro + `remove` que devolve boolean) é a base dos hooks de coleção; `useConfirmDelete` para o fluxo de exclusão; `ErrorBanner`/`Loading`/`EmptyState`/`ExerciseThumb`/`SegmentedControl`/`Modal` (com `useFocusTrap`) para a UI. Formulário só renderiza com os dados carregados — sem isso, salvar gravaria defaults por cima do servidor.
- **Gráficos**: recharts encapsulado em `components/MetricLineChart` — não usar recharts direto nas páginas. As cores vêm do CSS Module via seletores `:global(.recharts-*)`, porque recharts escreve `stroke`/`fill` como atributo e qualquer regra CSS vence.

### Schema do banco (principais)

`profile` (linha única) · `settings` (linha única) · `body_measurements` · `goals` (índice único parcial p/ ativa) · `progress_photos` · `exercises` (catálogo próprio; `working_weight_kg` + `additional_weight_kg`, `video_url`, `notes`=execução) · `workout_splits` + `split_exercises` + `planned_sets` (só posição e reps alvo) · `exercise_checks` (`UNIQUE (split_id, exercise_id, checked_on)`) · `exercise_load_logs` (log de carga; `exercise_id` ON DELETE SET NULL + `exercise_name` copiado, para o log sobreviver à exclusão).

A carga vive **só** no catálogo, em duas parcelas: `working_weight_kg` (pilha do aparelho) e `additional_weight_kg` (peso extra da rodinha/anilha). A **carga levantada é a soma** — `totalLoadKg()` existe nos dois lados e é o número grande do card. `null` nas duas parcelas significa "sem carga registrada" e é diferente de `0`.

As tabelas de ExerciseDB, PRs, gamificação e de sessão (`workout_sessions`/`session_exercises`/`session_sets`), além de `split_exercises.rest_seconds` e das configurações de som/vibração/wake lock/descanso, foram dropadas — os DROPs ficam no fim do `migrate.ts`.

## Convenções

- **Idioma**: código em inglês; UI e erros de API em português.
- **TypeScript strict** nos dois lados. Backend `module: NodeNext` → **imports com extensão `.js`**. Frontend `moduleResolution: bundler` → sem extensão.
- **Estilo**: CSS Modules por componente; usar sempre os tokens `--color-*`/`--spacing-*` do `styles/global.css` (tema violeta dark, `#8b5cf6`), **nunca** hardcode — texto sobre superfície de destaque é `--color-on-accent`. Breakpoints: 768px (layout) e 480px (fino).
- **Sem comentários no código**, exceto quando registram uma restrição não óbvia.
- **ESLint react-hooks v7 (regras do React Compiler)**: nada de `Date.now()`/impureza em render, nada de escrever ref durante render (atualize em effect), nada de `setState` síncrono no corpo de effect (inicialize estado por props em componente filho — ver `ProfileForm`/`SettingsForm` — ou setState só em callbacks assíncronos).
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

Sempre que adicionar uma nova funcionalidade ou corrigir um bug:

Escreva novos testes automatizados cobrindo a mudança (para bugs, crie primeiro um teste que reproduza a falha).

Execute a suíte de testes relevante para garantir que a mudança funciona e nenhuma funcionalidade existente quebrou (sem regressões).
