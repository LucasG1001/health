# process.md — Status da construção do Health

> Documento de retomada. Última atualização: 2026-07-03.
> Plano completo aprovado em: `C:\Users\lucas.gomes\.claude\plans\voc-vai-construir-o-spicy-mango.md`

## O que é o projeto

**Health** — PWA pessoal de saúde e treino de musculação (single-user, sem auth, online-only, Android/Chrome, mobile-first). Duas áreas: **Medidas** e **Treino** (execução guiada com timer de descanso, som/vibração, wake lock). Segue à risca os padrões dos projetos irmãos em `C:\workspace\On` — referência principal: **remindMe** (Express 5 + pg puro + Zod no backend; React 19 + Vite + CSS Modules + tema violeta `#8b5cf6` dark no frontend; Docker container único servindo SPA+API na porta 3333 atrás do proxy Caddy central).

## Decisões tomadas (confirmadas com o usuário)

1. **Exercícios vêm de API externa** (pedido do usuário no meio da execução): fluxo buscar → selecionar → importar para catálogo local → montar treino.
   - A instância gratuita `oss.exercisedb.dev` do ExerciseDB foi **testada e está quebrada** (busca dá erro 1102; host dos GIFs `static.exercisedb.dev` nem resolve DNS).
   - **Fonte adotada: free-exercise-db** (github.com/yuhonas/free-exercise-db, ~870 exercícios, fotos JPG estáticas, sem chave, testado funcionando). Backend sincroniza o JSON inteiro para a tabela `catalog_exercises` (lazy, na primeira busca) e busca via SQL ILIKE; importar baixa a 1ª imagem para o volume de uploads.
   - Usuário estava ausente quando perguntei RapidAPI (com GIFs, requer chave) vs free-exercise-db — segui com free-exercise-db por funcionar sem bloqueio. **Trocar/adicionar ExerciseDB RapidAPI depois é fácil**: basta outro service que alimente a mesma `catalog_exercises`.
   - Seed local de exercícios foi **removido** (substituído pelo catálogo importável). Cadastro manual continua como fallback.
2. Lembrete de pesagem: apenas aviso visual no app (sem notify-api/Telegram).
3. Imagens de exercício: upload OU URL externa; fotos de progresso: sempre upload (multer, volume `uploads_data:/app/uploads`).
4. Deploy: padrão da VPS (`HEALTH_DOMAIN` no .env, redes externas `proxy-net`/`health-net`, labels Caddy).
5. Gráficos: **recharts** (precedente no projeto carteira), encapsulado no componente `MetricLineChart`.

## Status por tarefa

| # | Tarefa | Status |
|---|---|---|
| 1 | Scaffold (backend + frontend + PWA base) | ~90% — falta gerar `icon-192.png`/`icon-512.png`/`apple-touch-icon.png` em `frontend/public/` (favicon.svg já existe; gerar PNGs a partir dele com script sharp) |
| 2 | Migrate + seeds | ✅ concluída (badges seedados; catálogo `catalog_exercises` via sync) |
| 3 | Área Medidas (backend + frontend) | ✅ concluída |
| 4 | Upload + fotos de progresso | ✅ concluída |
| 5 | Catálogo de exercícios + divisões | ✅ concluída |
| 6 | Sessão de treino (máquina de estados + execução) | 🔶 EM ANDAMENTO — ver "Próximos passos" |
| 7 | Finish + gamificação + histórico + configurações | 🔶 backend pronto; faltam páginas |
| 8 | Docker, docs, verificação final | ⬜ pendente |

## BACKEND — ✅ 100% escrito, compila (`npm run build`) e 23 testes Vitest passam (`npm test`)

`backend/src/`: server.ts, database/ (connection com type parsers de NUMERIC/DATE, migrate idempotente completo, seedBadges), lib/ (asyncHandler, sqlUpdate, validation, calculations + testes, dateUtils, upload com multer+downloadToUploads), middleware/ (errorHandler, uploadErrorHandler), models/ (errors, profile, settings, measurement, goal, photo, exercise, split, session, catalog, stats), services/ (streakService + testes, prDetection + testes, sessionFinishService — transação com volume/PRs/badges/streak, catalogSyncService), schemas/ + controllers/ + routes/ de tudo.

Rotas: `/api/profile`, `/api/settings`, `/api/measurements`, `/api/goals`, `/api/photos`, `/api/exercises` (+`/import`, `/:id/image`, `/:id/last-performance`, `/:id/history`), `/api/catalog/exercises` + `/api/catalog/sync`, `/api/splits` (+`/:id/exercises` replace atômico, `/reorder`), `/api/sessions` (+`/active`, `/:id/finish`, `/:id/exercises`), `/api/session-exercises/:id` (+`/sets`), `/api/session-sets/:id`, `/api/stats/{body,volume,gamification}`, `/uploads/*` estático.

Detalhes importantes:
- Sessão é **pré-materializada** no start (session_sets copiados dos planned_sets com targets/rest/peso sugerido); "Feito" = `PUT /api/session-sets/:id {completed:true, weightKg, reps, rpe?, rir?}`.
- Só 1 sessão in_progress e 1 meta ativa (índices únicos parciais). PRs append-only com baseline (previous_value NULL não conta como PR). Streak computado on-demand (dias não programados não quebram).
- `.env.example` do backend: DATABASE_URL, PORT, UPLOAD_DIR.

## FRONTEND — ~75% escrito. AINDA NÃO COMPILADO/TESTADO (npm install nem rodou no frontend!)

Pronto: configs (package.json com recharts+vitest, tsconfigs, vite.config com proxy /api e /uploads, eslint, index.html, manifest.webmanifest, favicon.svg, .env.example), styles/global.css (tema copiado do remindMe sem bloco legado), types/ (todos), services/ (todos, incl. catalogService), utils/ (format, dateUtils, chartUtils, apiError, sessionMachine + testes), context/ (workoutSessionStore + WorkoutSessionProvider com persistência tripla: backend + snapshot localStorage `health.activeSession.v1` + reconciliação no boot), hooks/ (useRestTimer timestamp-based, useAudioCue WebAudio, useWakeLock, useDismiss, e todos os hooks de dados), components/ (SvgIcon+icons, Sidebar bottom-nav com FAB contextual, Modal bottom-sheet, PageHeader, EmptyState, ConfirmDialog, StatCard, PeriodFilter, MetricLineChart, StepperInput, RestTimerRing, RpeSelector, DayOfWeekPicker, GoalProgressBar, BadgeGrid, ActiveSessionBar), App.tsx (rotas completas; SessionPage fora do layout).

Páginas prontas: MeasuresPage (+MeasurementFormModal), MeasurementHistoryPage, ProfilePage, GoalsPage (+GoalFormModal), PhotosPage (+PhotoUploadModal), PhotoComparePage (lado a lado + sobrepor com clip-path), ExercisesPage (+ExerciseFormModal), CatalogSearchPage (busca ExerciseDB/free-exercise-db + importação), ExerciseDetailPage, SplitsPage, SplitEditorPage, WorkoutHomePage (recém-escrita, **falta o .module.css dela**).

## PRÓXIMOS PASSOS (retomar aqui, em ordem)

1. `frontend/src/pages/WorkoutHomePage/WorkoutHomePage.module.css` — o .tsx já existe e importa este arquivo.
2. `WorkoutHomePage/StartSessionModal.tsx` + `.module.css` — modal (rota `/treino/iniciar`) que lista as divisões (destaca as de hoje; recebe `location.state.splitId` opcional para pré-seleção), chama `useWorkoutSession().start(splitId)` e navega para `/treino/sessao/ativa`. Usa `useOutletContext<{ reloadSplits }>`. Tratar 409 (treino já em andamento) e 400 (divisão sem exercícios) com `apiErrorMessage`.
3. **`SessionPage/SessionPage.tsx` + css — A TELA PRINCIPAL** (tela cheia 100dvh, sem sidebar; rota já registrada no App):
   - Se `hydrating` → loading; se sem sessão → redirect `/treino`.
   - Fases do reducer (`utils/sessionMachine.ts`): overview (lista exercícios com Play), exercising (header: encerrar/cronômetro total/dots de progresso; card do exercício: imagem, nome, grupo, ajuste do aparelho editável via `updateMachineSetting`, alvo, **carga anterior** via `fetchLastPerformance(exerciseId)`; lista de SetRows; série atual com StepperInput peso/reps + RpeSelector; botão FEITO gigante → `completeSet({setId, weightKg, reps, rpe, restMs})`), resting (RestTimerRing + useRestTimer com `onPrepare`→`cuePrepare` (guard `state.prepareCued`/`prepareCued()`) e `onEnd`→`cueGo`+`restEnded()`; botões +15s/Pular), exerciseDone (resumo do exercício, Próximo exercício → `nextExercise()`, + série extra → `addExtraSet`), tudo feito → botão Finalizar.
   - restMs: `set.restSeconds ?? (setType==='warmup' ? settings.restWarmupSeconds : settings.restWorkingSeconds)` × 1000 (useSettings).
   - `useWakeLock(settings.wakeLockEnabled && sessão ativa)`; `useAudioCue({soundEnabled, vibrationEnabled})` com `unlock()` no primeiro Play.
   - Encerrar → ConfirmDialog com opções Finalizar (`finish()` → navega `/treino/sessao/:id/resumo` passando `{state: {summary}}`) e Descartar (`discard()` → `/treino`).
4. `SessionSummaryPage` — lê `location.state.summary` (FinishSummary) ou busca `fetchSession(id)`; mostra volume, duração, séries feitas×planejadas, PRs, badges novas, streak; campo de anotações (`updateSessionNotes`).
5. `HistoryPage` (lista sessões via useSessionHistory + gráfico volume opcional via fetchVolumeStats) e `SessionDetailPage` (fetchSession por :id, exercícios+séries).
6. `SettingsPage` — useSettings: weighInFrequency, waterGoalMl, calorieGoalKcal, soundEnabled, vibrationEnabled, wakeLockEnabled, restWarmupSeconds, restWorkingSeconds.
7. **`cd frontend && npm install`** e depois `npm run build`, `npm test` (testes do sessionMachine), `npm run lint` — corrigir erros de TS que aparecerem (nada do frontend foi compilado ainda).
8. Ícones PWA: gerar icon-192.png, icon-512.png, apple-touch-icon.png a partir do favicon.svg (script one-off com sharp no scratchpad).
9. Docker: `backend/Dockerfile` (copiar do remindMe + `RUN mkdir -p /app/uploads && chown node:node /app/uploads` + `ENV UPLOAD_DIR=/app/uploads` antes de USER node), `docker-compose.yml` raiz (name: health; postgres:16-alpine + server com volume uploads_data, labels caddy `${HEALTH_DOMAIN}`, redes externas proxy-net/health-net, TZ America/Sao_Paulo), `.env.example` raiz.
10. `README.md` + `CLAUDE.md` no padrão dos irmãos (ver remindMe/CLAUDE.md como molde); `git init` + commit.
11. Verificação end-to-end (plano tem seção "Verificação"): subir Postgres local (banco `health`), backend `npm run dev`, frontend `npm run dev`, testar no navegador mobile viewport: perfil → medição → gráficos → meta → foto+comparador → buscar/importar exercício do catálogo → divisão → **sessão completa com timer/aviso 10s/liberação automática → refresh no meio do descanso (countdown deve retomar) → finalizar → resumo com PRs/streak**.

## Observações para quem retomar

- Convenções: código EN, UI/erros PT-BR, TS strict, CSS Modules com tokens `--color-*` (NUNCA hardcode), imports backend com extensão `.js` (NodeNext), sem comentários no código.
- Backend PowerShell: `Set-Location C:\workspace\On\Health\backend; npm run dev` (precisa de Postgres local com banco `health`; migrate roda no boot).
- O usuário selecionou `asyncHandler` no exerciseController ao pausar — possivelmente só inspecionando; nenhuma pendência conhecida ali.
- `POSE_LABELS` é exportado de `PhotosPage.tsx` e usado pelo PhotoComparePage/PhotoUploadModal (eslint react-refresh pode reclamar de export não-componente — se reclamar, mover para `utils/format.ts`).
