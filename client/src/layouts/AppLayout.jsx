import { useEffect, useState } from "react";
import DashboardFooter from "../components/DashboardFooter";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function AppLayout({ children, title, subtitle }) {
  const getCompactLayout = () =>
    typeof window !== "undefined" ? window.innerWidth <= 1024 : false;

  const [isCompactLayout, setIsCompactLayout] = useState(getCompactLayout);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !getCompactLayout());

  useEffect(() => {
    const handleResize = () => {
      const compact = getCompactLayout();
      setIsCompactLayout((previousCompact) => {
        if (previousCompact !== compact) {
          setIsSidebarOpen(!compact);
        }

        return compact;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isCompactLayout) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = isSidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isCompactLayout, isSidebarOpen]);

  return (
    <div className={`dashboard-shell ${isSidebarOpen ? "sidebar-open" : ""} ${isCompactLayout ? "is-compact" : ""}`}>
      <Sidebar
        isCompactLayout={isCompactLayout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      {isCompactLayout ? (
        <button
          className={`sidebar-overlay ${isSidebarOpen ? "is-visible" : ""}`}
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
      <div className="dashboard-main">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="dashboard-main__content">{children}</div>
        <DashboardFooter />
      </div>
    </div>
  );
}

export default AppLayout;
