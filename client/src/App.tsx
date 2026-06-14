import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

// Public Pages
import { LandingPage } from "./pages/LandingPage";
import { TrackingPage } from "./pages/TrackingPage";
import { LoginPage } from "./pages/LoginPage";

// Protected Pages
import { DashboardPage } from "./pages/DashboardPage";
import { ComplaintsListPage } from "./pages/ComplaintsListPage";
import { ComplaintDetailPage } from "./pages/ComplaintDetailPage";
import { CreateComplaintPage } from "./pages/CreateComplaintPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AuditLogsPage } from "./pages/AuditLogsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
              <Routes>
                {/* ── Public routes ─────────────────────────── */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/track" element={<TrackingPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* ── Protected routes (require auth) ─────────── */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    {/* Dashboard — requires view_dashboard */}
                    <Route element={<ProtectedRoute requiredPermissions={["view_dashboard"]} />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                    </Route>

                    {/* Complaints */}
                    <Route path="/complaints" element={<ComplaintsListPage />} />
                    <Route path="/complaints/new" element={<CreateComplaintPage />} />
                    <Route path="/complaints/:id" element={<ComplaintDetailPage />} />

                    {/* User Management — requires manage_users */}
                    <Route element={<ProtectedRoute requiredPermissions={["manage_users"]} />}>
                      <Route path="/users" element={<UserManagementPage />} />
                    </Route>

                    {/* Audit Logs — super_admin / state_admin only */}
                    <Route element={<ProtectedRoute requiredRoles={["super_admin", "state_admin"]} />}>
                      <Route path="/audit-logs" element={<AuditLogsPage />} />
                    </Route>

                    {/* Notifications & Profile */}
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Fallback redirect */}
                    <Route path="*" element={<Navigate to="/complaints" replace />} />
                  </Route>
                </Route>
              </Routes>
            </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
