import { useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { WorkoutSessionProvider } from "./context/WorkoutSessionContext";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ActiveSessionBar } from "./components/ActiveSessionBar/ActiveSessionBar";
import { InterRestModal } from "./components/InterRestModal/InterRestModal";
import { EmptyState } from "./components/EmptyState/EmptyState";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { DumbbellIcon } from "./components/Icon/icons";
import { MeasuresPage } from "./pages/MeasuresPage/MeasuresPage";
import { MeasurementFormModal } from "./pages/MeasuresPage/MeasurementFormModal";
import { MeasurementHistoryPage } from "./pages/MeasurementHistoryPage/MeasurementHistoryPage";
import { ProfilePage } from "./pages/ProfilePage/ProfilePage";
import { GoalsPage } from "./pages/GoalsPage/GoalsPage";
import { GoalFormModal } from "./pages/GoalsPage/GoalFormModal";
import { PhotosPage } from "./pages/PhotosPage/PhotosPage";
import { PhotoUploadModal } from "./pages/PhotosPage/PhotoUploadModal";
import { PhotoComparePage } from "./pages/PhotoComparePage/PhotoComparePage";
import { WorkoutHomePage } from "./pages/WorkoutHomePage/WorkoutHomePage";
import { SplitEditorPage } from "./pages/SplitEditorPage/SplitEditorPage";
import { WorkoutExerciseDetailPage } from "./pages/WorkoutExerciseDetailPage/WorkoutExerciseDetailPage";
import { ExercisesPage } from "./pages/ExercisesPage/ExercisesPage";
import { ExerciseFormPage } from "./pages/ExerciseFormPage/ExerciseFormPage";
import { SessionSummaryPage } from "./pages/SessionSummaryPage/SessionSummaryPage";
import { HistoryPage } from "./pages/HistoryPage/HistoryPage";
import { SessionDetailPage } from "./pages/SessionDetailPage/SessionDetailPage";
import { SettingsPage } from "./pages/SettingsPage/SettingsPage";
import styles from "./App.module.css";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

function Layout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"
  );

  // O localStorage.setItem ficava dentro do updater, que precisa ser puro (pode ser
  // reexecutado pelo React).
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  };

  return (
    <div className={styles.layout}>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className={`${styles.content} ${collapsed ? styles.contentCollapsed : ""}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/treino" replace />} />
          <Route path="/medidas" element={<MeasuresPage />}>
            <Route path="nova" element={<MeasurementFormModal />} />
            <Route path="m/:id" element={<MeasurementFormModal />} />
          </Route>
          <Route path="/medidas/historico" element={<MeasurementHistoryPage />} />
          <Route path="/medidas/perfil" element={<ProfilePage />} />
          <Route path="/medidas/metas" element={<GoalsPage />}>
            <Route path="nova" element={<GoalFormModal />} />
          </Route>
          <Route path="/medidas/fotos" element={<PhotosPage />}>
            <Route path="nova" element={<PhotoUploadModal />} />
          </Route>
          <Route path="/medidas/fotos/comparar" element={<PhotoComparePage />} />
          <Route path="/treino" element={<WorkoutHomePage />} />
          <Route path="/treino/divisoes/nova" element={<SplitEditorPage />} />
          <Route path="/treino/divisoes/:id" element={<SplitEditorPage />} />
          <Route path="/treino/divisoes/:id/ex/:sxId" element={<WorkoutExerciseDetailPage />} />
          <Route path="/treino/exercicios" element={<ExercisesPage />} />
          <Route path="/treino/exercicios/novo" element={<ExerciseFormPage />} />
          <Route path="/treino/exercicios/:id/editar" element={<ExerciseFormPage />} />
          <Route path="/treino/sessao/:id/resumo" element={<SessionSummaryPage />} />
          <Route path="/treino/historico" element={<HistoryPage />} />
          <Route path="/treino/historico/:id" element={<SessionDetailPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <ActiveSessionBar />
      <InterRestModal />
    </div>
  );
}

function NotFoundPage() {
  return (
    <EmptyState
      icon={<DumbbellIcon />}
      title="Página não encontrada"
      description="O endereço acessado não existe."
      action={
        <Link to="/treino" className={styles.notFoundLink}>
          Ir para o treino
        </Link>
      }
    />
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <WorkoutSessionProvider>
          <Routes>
            <Route path="*" element={<Layout />} />
          </Routes>
        </WorkoutSessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
