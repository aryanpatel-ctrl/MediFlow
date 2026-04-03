import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function AppLayout({ children, title, subtitle }) {
  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-main">
        <Topbar title={title} subtitle={subtitle} />
        {children}
      </div>
    </div>
  );
}

export default AppLayout;
