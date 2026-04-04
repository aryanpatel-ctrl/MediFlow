import { Bell, Search, Settings, Menu } from "lucide-react";
import { useAuth } from "../hooks";

const formatRole = (role) =>
  (role || "Admin")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

function Topbar({ title, subtitle, onMenuClick }) {
  const { user } = useAuth();
  
  const userName = user?.name || "City Hospital Admin";
  // Fallback to ui-avatars if the backend hasn't provided a user.avatar URL
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=2A9D8F&color=fff`;

  return (
    <header className="topbar">
      <div className="topbar-title" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="icon-button topbar-hamburger" type="button" onClick={onMenuClick} style={{ marginRight: '12px', background: 'transparent', border: 'none' }}>
          <Menu size={18} strokeWidth={2} />
        </button>
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        <label className="searchbar">
          <span className="searchbar-icon" aria-hidden="true">
            <Search size={16} strokeWidth={2} />
          </span>
          <input type="search" placeholder="Search anything" />
        </label>

        <button className="icon-button" type="button" aria-label="Notifications">
          <Bell size={15} strokeWidth={2} />
        </button>
        <button className="icon-button" type="button" aria-label="Settings">
          <Settings size={15} strokeWidth={2} />
        </button>

        <div className="profile-chip">
          <div className="avatar" style={{ padding: 0, overflow: 'hidden' }}>
            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <strong>{userName}</strong>
            <p>{formatRole(user?.role)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
