import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.js";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { AdminBatchManagementPage } from "./pages/AdminBatchManagementPage.js";
import { ScheduleManagementPage } from "./pages/ScheduleManagementPage.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { AssessmentsPage } from "./pages/AssessmentsPage.js";

import { ResultsPage } from "./pages/ResultsPage.js";
import { ResourcesPage } from "./pages/ResourcesPage.js";
import { HomePage } from "./pages/HomePage.js";

export function App() {
  return (
    <div className="min-h-screen bg-[#FFFBFA] text-[#1F2937] flex flex-col antialiased">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedules"
            element={
              <ProtectedRoute>
                <ScheduleManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routine"
            element={
              <ProtectedRoute>
                <ScheduleManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <ScheduleManagementPage defaultTab="rooms" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batches"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminBatchManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/semesters"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminBatchManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/holidays"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <ScheduleManagementPage defaultTab="holidays" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "CR", "STUDENT"]}>
                <AssessmentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
