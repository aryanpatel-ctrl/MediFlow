function Topbar({ title, subtitle }) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <label className="searchbar">
          <input type="search" placeholder="Search anything" />
        </label>

        <button className="icon-button" type="button" aria-label="Notifications">
          N
        </button>
        <button className="icon-button" type="button" aria-label="Settings">
          S
        </button>

        <div className="profile-chip">
          <div className="avatar">JC</div>
          <div>
            <strong>James Cartis</strong>
            <p>Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
