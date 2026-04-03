import {
  ActivitySquare,
  CalendarDays,
  Grid2x2,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Stethoscope,
  Users,
  Package,
  Menu,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks";

const navIcons = {
  Appointments: ActivitySquare,
  "Book Appointment": MessageSquare,
  Calendar: CalendarDays,
  Dashboard: Grid2x2,
  Departments: LayoutGrid,
  Doctors: Stethoscope,
  "My Appointments": CalendarDays,
  "My Dashboard": Grid2x2,
  Patients: Users,
  Queue: CalendarDays,
  Inventory: Package,
};

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
      { label: "Inventory", shortLabel: "IN", path: "/inventory" },
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

function Sidebar({ isCompactLayout, isSidebarOpen, setIsSidebarOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userName = user?.name || "City Hospital Admin";
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=2A9D8F&color=fff`;

  const navigationItems = getNavigationItems(user?.role);

  const handleSignOut = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <aside className={`sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
      <div className="brand" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="brand-mark" aria-hidden="true">
            <Stethoscope size={18} strokeWidth={2.2} />
          </span>
          <div className="brand-text">
            <strong>MedQueue AI</strong>
            <p>{user?.role === "patient" ? "Patient workspace" : "Hospital workspace"}</p>
          </div>
        </div>
        <button
          className="hamburger-menu" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          type="button"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          style={{ background: 'transparent', color: 'var(--text-soft)', padding: '4px' }}
        >
          {isCompactLayout ? (isSidebarOpen ? <X size={20} /> : <Menu size={20} />) : <X size={20} />}
        </button>
      </div>

      <nav aria-label="Primary" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", margin: "0 -12px", padding: "0 12px" }}>
        <ul className="nav-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {navigationItems.map((item) => (
            <li key={item.label}>
              <NavLink
                className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}
                to={item.path}
                end={item.path === "/" || item.path === "/doctor/dashboard"}
              >
                <span className="nav-icon" aria-hidden="true">
                  {(() => {
                    const Icon = navIcons[item.label];
                    return Icon ? <Icon size={16} strokeWidth={2} /> : item.shortLabel;
                  })()}
                </span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
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



      {/* Doctor Info */}
      {user?.role === 'doctor' && (
        <div className="sidebar-upgrade">
          <div className="upgrade-illustration">
            <span>Care</span>
          </div>
          <h3>Queue Management</h3>
          <p>Manage your patient queue and consultations.</p>
        </div>
      )}

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <span className="sidebar-user-avatar" style={{ padding: 0, overflow: 'hidden' }}>
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </span>
              <div>
                <strong>{userName}</strong>
                <p>{user?.role?.replace("_", " ") || "Admin"}</p>
              </div>
            </div>
          </div>
        )}

        <button className="sign-out" type="button" onClick={handleSignOut} style={{ width: '100%' }}>
          <LogOut size={15} strokeWidth={2} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
