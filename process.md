# process.md — Status da construção do Health

> Documento de retomada. Última atualização: 2026-07-03 (noite).
> Plano completo aprovado em: `C:\Users\lucas.gomes\.claude\plans\voc-vai-construir-o-spicy-mango.md`

## O que é o projeto

**Health** — PWA pessoal de saúde e treino de musculação (single-user, sem auth, online-only, Android/Chrome, mobile-first). Duas áreas: **Medidas** e **Treino**. Ver `README.md` e `CLAUDE.md` (agora existem e são a fonte canônica de arquitetura/convenções).

## Status por tarefa

| # | Tarefa | Status |
|---|---|---|
| 1 | Scaffold (backend + frontend + PWA base) | ✅ concluída (ícones PNG gerados) |
| 2 | Migrate + seeds | ✅ concluída |
| 3 | Área Medidas (backend + frontend) | ✅ concluída |
| 4 | Upload + fotos de progresso | ✅ concluída |
| 5 | Catálogo de exercícios + divisões | ✅ concluída |
| 6 | Sessão de treino (máquina de estados + execução) | ✅ concluída (SessionPage, StartSessionModal) |
| 7 | Finish + gamificação + histórico + configurações | ✅ concluída (SessionSummaryPage, HistoryPage, SessionDetailPage, SettingsPage) |
| 8 | Docker, docs | ✅ concluída (Dockerfile, docker-compose.yml, .env.example, README.md, CLAUDE.md) |
| 9 | Verificação end-to-end no navegador | ✅ concluída (Playwright mobile viewport, 2026-07-03) |

## Verificação (concluída)

- Backend: build ✅, 23 testes ✅. Frontend: build ✅, 9 testes ✅, lint ✅.
- API de ponta a ponta via curl: medição → meta → busca no catálogo (sync lazy ok) → import (imagem baixada p/ uploads, servida com 200) → divisão (exercícios via `PUT /:id/exercises`) → sessão pré-materializada → 409 na 2ª sessão → séries completadas → finish (volume correto sem warmup, badge `first_session`, streak 1; 2ª sessão detectou PR max_weight 70>62.5 + badge `first_pr`) → last-performance/stats ok.
- Navegador (Playwright, Pixel 7): home → modal iniciar → overview → execução → FEITO → descanso com ring → **refresh no meio do descanso retoma o countdown** → +15s/Pular → exercício concluído → finalizar → resumo → anotações salvas → histórico com gráfico → detalhe → medidas → configurações. Zero erros de console. Screenshots no scratchpad da sessão.
- **2 bugs achados e corrigidos na verificação** (commit `a41227a`): snapshot do descanso era apagado no boot antes da hidratação (refresh caía em overview); subtítulo/destaque do descanso apontavam para a série recém-concluída em vez da próxima.
- Falta opcional: testar `docker compose up --build` (Docker Desktop não estava rodando na máquina).
- Dev local: Postgres em localhost:5432 (credenciais no `backend/.env`, não versionado; relógio do Postgres/WSL ~18s adiantado — por isso o cronômetro total mostra 0:00 nos primeiros segundos em dev; em produção banco e servidor compartilham relógio).

## Notas para quem retomar

- Lint usa as regras novas do react-hooks v7 (React Compiler): sem `Date.now()` em render (usar `hooks/useNow.ts`), sem escrever ref em render, sem `setState` síncrono em corpo de effect (padrões corrigidos em ProfilePage/SettingsPage — form como componente filho inicializado por props; CatalogSearchPage — setState dentro do callback do debounce; useRestTimer — remaining derivado de estado `now` + detecção de borda em effect).
- `POSE_LABELS` migrou de `PhotosPage.tsx` para `utils/format.ts`.
- Fonte do catálogo: free-exercise-db (a instância gratuita `oss.exercisedb.dev` estava quebrada). Trocar/adicionar ExerciseDB RapidAPI depois = outro service alimentando a mesma `catalog_exercises`.
