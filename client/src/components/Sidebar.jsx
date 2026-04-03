import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks";

// Navigation items by role
// Roles: hospital_admin, doctor, patient
const getNavigationItems = (role) => {
  if (role === 'hospital_admin') {
    return [
      { label: "Dashboard", shortLabel: "DB", path: "/" },
      { label: "Appointments", shortLabel: "AP", path: "/appointments" },
      { label: "Patients", shortLabel: "PT", path: "/patients" },
      { label: "Doctors", shortLabel: "DR", path: "/doctors" },
      { label: "Departments", shortLabel: "DP", path: "/departments" },
      { label: "Calendar", shortLabel: "CL", path: "/calendar" },
    ];
  }

  if (role === 'doctor') {
    return [
      { label: "My Dashboard", shortLabel: "DB", path: "/doctor/dashboard" },
    ];
  }

  // Default: patient role (all signups are patients)
  return [
    { label: "Book Appointment", shortLabel: "AI", path: "/chat" },
    { label: "My Appointments", shortLabel: "MA", path: "/my-appointments" },
  ];
};

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navigationItems = getNavigationItems(user?.role);

  const handleSignOut = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">MQ</span>
        <div>
          <strong>MedQueue AI</strong>
          <p>Smart Healthcare</p>
        </div>
      </div>

      <nav className="nav-list" aria-label="Primary">
        {navigationItems.map((item) => (
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}
            to={item.path}
            key={item.label}
            end={item.path === "/" || item.path === "/doctor/dashboard"}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.shortLabel}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* AI Triage Card - Show for patients */}
      {user?.role === 'patient' && (
        <div className="sidebar-upgrade">
          <div className="upgrade-illustration">
            <span>AI</span>
          </div>
          <h3>AI Triage</h3>
          <p>Smart symptom analysis with GPT-4o powered chatbot.</p>
          <NavLink to="/chat" style={{ textDecoration: "none" }}>
            <button type="button">Book Now</button>
          </NavLink>
        </div>
      )}

      {/* Hospital Info - Show for hospital admin */}
      {user?.role === 'hospital_admin' && (
        <div className="sidebar-upgrade">
          <div className="upgrade-illustration">
            <span>H</span>
          </div>
          <h3>Hospital Admin</h3>
          <p>Manage appointments, patients, doctors, departments, and queue.</p>
          <NavLink to="/settings" style={{ textDecoration: "none" }}>
            <button type="button">Settings</button>
          </NavLink>
        </div>
      )}

      {/* Doctor Info */}
      {user?.role === 'doctor' && (
        <div className="sidebar-upgrade">
          <div className="upgrade-illustration">
            <span>Q</span>
          </div>
          <h3>Queue Management</h3>
          <p>Manage your patient queue and consultations.</p>
        </div>
      )}

      {user && (
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <span className="sidebar-user-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <p>{user.role?.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      )}

      <button className="sign-out" type="button" onClick={handleSignOut}>
        Sign Out
      </button>
    </aside>
  );
}

export default Sidebar;
