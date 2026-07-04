import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { WorkoutSessionProvider } from "./context/WorkoutSessionContext";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ActiveSessionBar } from "./components/ActiveSessionBar/ActiveSessionBar";
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
import { ExerciseFormModal } from "./pages/ExercisesPage/ExerciseFormModal";
import { CatalogSearchPage } from "./pages/CatalogSearchPage/CatalogSearchPage";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage/ExerciseDetailPage";
import { SessionPage } from "./pages/SessionPage/SessionPage";
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

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
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
          <Route path="/treino/exercicios" element={<ExercisesPage />}>
            <Route path="novo" element={<ExerciseFormModal />} />
          </Route>
          <Route path="/treino/exercicios/buscar" element={<CatalogSearchPage />} />
          <Route path="/treino/exercicios/:id" element={<ExerciseDetailPage />} />
          <Route path="/treino/sessao/:id/resumo" element={<SessionSummaryPage />} />
          <Route path="/treino/historico" element={<HistoryPage />} />
          <Route path="/treino/historico/:id" element={<SessionDetailPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
        </Routes>
      </main>
      <ActiveSessionBar />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <WorkoutSessionProvider>
        <Routes>
          <Route path="/treino/sessao/ativa" element={<SessionPage />} />
          <Route path="*" element={<Layout />} />
        </Routes>
      </WorkoutSessionProvider>
    </BrowserRouter>
  );
}

export default App;
