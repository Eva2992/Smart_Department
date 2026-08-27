import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { VerifyEmailPage } from "./pages/VerifyEmailPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { useAuth } from "./context/useAuth.js";

function HomeRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col antialiased">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
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
