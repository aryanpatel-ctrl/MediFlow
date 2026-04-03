import { useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "./hooks";

// Medlink Pages
import AppointmentsPage from "./pages/AppointmentsPage";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import PatientDetailsPage from "./pages/PatientDetailsPage";
import DoctorsPage from "./pages/DoctorsPage";
import DoctorDetailsPage from "./pages/DoctorDetailsPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import DepartmentDetailsPage from "./pages/DepartmentDetailsPage";
import CalendarPage from "./pages/CalendarPage";
import InventoryPage from "./pages/InventoryPage";
import MessagesPage from "./pages/MessagesPage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import HospitalOnboarding from "./pages/HospitalOnboarding";
import DoctorOnboarding from "./pages/DoctorOnboarding";
import DoctorDashboard from "./pages/DoctorDashboard";
import MyAppointmentsPage from "./pages/MyAppointmentsPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import HospitalsListPage from "./pages/HospitalsListPage";
import HospitalOnboardingPage from "./pages/HospitalOnboardingPage";
import HospitalDetailPage from "./pages/HospitalDetailPage";
import SuperAdminAnalyticsPage from "./pages/SuperAdminAnalyticsPage";
import HospitalSettings from "./pages/HospitalSettings";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading === 'checkAuth') {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading MedQueue AI...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/hospital/register" element={<HospitalOnboarding />} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/hospitals"
        element={
          <ProtectedRoute>
            <HospitalsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/hospitals/:id"
        element={
          <ProtectedRoute>
            <HospitalDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/onboard"
        element={
          <ProtectedRoute>
            <HospitalOnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/analytics"
        element={
          <ProtectedRoute>
            <SuperAdminAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <HospitalSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors/add"
        element={
          <ProtectedRoute>
            <DoctorOnboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-appointments"
        element={
          <ProtectedRoute>
            <MyAppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <PatientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/details"
        element={
          <ProtectedRoute>
            <PatientDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors"
        element={
          <ProtectedRoute>
            <DoctorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors/details"
        element={
          <ProtectedRoute>
            <DoctorDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments/details"
        element={
          <ProtectedRoute>
            <DepartmentDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
