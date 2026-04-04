import { useEffect } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks";

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Pages
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

import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import DoctorOnboarding from "./pages/DoctorOnboarding";
import DoctorDashboard from "./pages/DoctorDashboard";
import MyAppointmentsPage from "./pages/MyAppointmentsPage";
import HospitalSettings from "./pages/HospitalSettings";
import PrescriptionPage from "./pages/PrescriptionPage";
import QueueDashboardPage from "./pages/QueueDashboardPage";
import LandingPage from "./components/landing/VoiceflowLandingPage";

// Protected Route Component - redirects to home if not logged in
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading MediFlow...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

// Public Route Component - redirects to dashboard if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading MediFlow...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Landing Page - Public (redirects to dashboard if logged in) */}
        <Route path="/home" element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        } />

        {/* Auth Routes - Public (redirects to dashboard if logged in) */}
        <Route path="/signup" element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />

      {/* Hospital Admin Settings */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <HospitalSettings />
          </ProtectedRoute>
        }
      />

      {/* Doctor Dashboard */}
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
        path="/patients/:id"
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

      {/* Prescription Page - Doctor */}
      <Route
        path="/prescription"
        element={
          <ProtectedRoute>
            <PrescriptionPage />
          </ProtectedRoute>
        }
      />

      {/* Queue Dashboard - Hospital Admin */}
      <Route
        path="/queue-dashboard"
        element={
          <ProtectedRoute>
            <QueueDashboardPage />
          </ProtectedRoute>
        }
      />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
