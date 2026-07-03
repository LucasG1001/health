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
| 9 | Verificação end-to-end no navegador | ⬜ PENDENTE — único passo restante |

## Verificação (backend + frontend compilam; falta rodar de ponta a ponta)

- Backend: `npm run build` ✅, `npm test` ✅ (23 testes). Frontend: `npm run build` ✅, `npm test` ✅ (9), `npm run lint` ✅ (0 erros).
- **Falta**: subir Postgres local (banco `health`), `cd backend && npm run dev`, `cd frontend && npm run dev`, e testar no viewport mobile:
  perfil → medição → gráficos → meta → foto+comparador → buscar/importar exercício do catálogo → divisão → **sessão completa com timer/aviso 10s/liberação automática → refresh no meio do descanso (countdown deve retomar) → finalizar → resumo com PRs/streak**.
- Depois da verificação: testar `docker compose up --build` se possível.

## Notas para quem retomar

- Lint usa as regras novas do react-hooks v7 (React Compiler): sem `Date.now()` em render (usar `hooks/useNow.ts`), sem escrever ref em render, sem `setState` síncrono em corpo de effect (padrões corrigidos em ProfilePage/SettingsPage — form como componente filho inicializado por props; CatalogSearchPage — setState dentro do callback do debounce; useRestTimer — remaining derivado de estado `now` + detecção de borda em effect).
- `POSE_LABELS` migrou de `PhotosPage.tsx` para `utils/format.ts`.
- Fonte do catálogo: free-exercise-db (a instância gratuita `oss.exercisedb.dev` estava quebrada). Trocar/adicionar ExerciseDB RapidAPI depois = outro service alimentando a mesma `catalog_exercises`.
