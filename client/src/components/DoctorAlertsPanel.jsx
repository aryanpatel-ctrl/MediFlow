import { useState, useEffect } from "react";
import {
  AlertCircle,
  Clock,
  UserX,
  PlayCircle,
  TrendingDown,
  CheckCircle,
  Bell,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import api from "../services/api";

const alertIcons = {
  high_wait_time: Clock,
  high_no_show_rate: UserX,
  queue_delay: Clock,
  queue_not_started: PlayCircle,
  low_utilization: TrendingDown
};

const alertColors = {
  critical: "#dc2626",
  warning: "#f59e0b",
  info: "#3b82f6"
};

function DoctorAlertsPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedDoctor, setExpandedDoctor] = useState(null);

  useEffect(() => {
    fetchDoctorAlerts();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDoctorAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDoctorAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/dashboard/doctor-alerts");
      setData(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load doctor alerts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (doctorId, alertType) => {
    try {
      await api.post(`/dashboard/doctor-alerts/${doctorId}/acknowledge`, {
        alertType,
        notes: "Acknowledged from dashboard"
      });
      fetchDoctorAlerts();
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const toggleExpand = (doctorId) => {
    setExpandedDoctor(expandedDoctor === doctorId ? null : doctorId);
  };

  if (loading) {
    return (
      <div className="dashboard-card doctor-alerts-panel">
        <div className="card-header">
          <Bell size={20} />
          <h3>Doctor Performance Alerts</h3>
        </div>
        <div className="card-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-card doctor-alerts-panel">
        <div className="card-header">
          <Bell size={20} />
          <h3>Doctor Performance Alerts</h3>
        </div>
        <div className="card-error">{error}</div>
      </div>
    );
  }

  const hasAlerts = data?.alerts?.length > 0;

  return (
    <div className="dashboard-card doctor-alerts-panel">
      <div className="card-header">
        <div className="header-left">
          <Bell size={20} className="alert-icon" />
          <h3>Doctor Performance Alerts</h3>
        </div>
        <div className="alert-summary">
          {data?.summary?.criticalAlerts > 0 && (
            <span className="alert-badge critical">
              {data.summary.criticalAlerts} Critical
            </span>
          )}
          <span className="alert-badge total">
            {data?.summary?.totalAlerts || 0} Total
          </span>
        </div>
      </div>

      {!hasAlerts ? (
        <div className="no-alerts">
          <CheckCircle size={32} className="success-icon" />
          <p>All doctors performing within targets</p>
          <span className="sub-text">{data?.summary?.totalDoctors} doctors monitored</span>
        </div>
      ) : (
        <div className="alerts-list">
          {data.alerts.map((doctor) => (
            <div key={doctor.doctorId} className="doctor-alert-item">
              <div
                className="doctor-header"
                onClick={() => toggleExpand(doctor.doctorId)}
              >
                <div className="doctor-info">
                  <span className="doctor-name">{doctor.doctorName}</span>
                  <span className="doctor-specialty">{doctor.specialty}</span>
                </div>
                <div className="alert-indicators">
                  {doctor.criticalCount > 0 && (
                    <span className="indicator critical">{doctor.criticalCount}</span>
                  )}
                  <span className="indicator warning">{doctor.alertCount - doctor.criticalCount}</span>
                  {expandedDoctor === doctor.doctorId ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </div>

              {expandedDoctor === doctor.doctorId && (
                <div className="alert-details">
                  {doctor.alerts.map((alert, index) => {
                    const AlertIcon = alertIcons[alert.type] || AlertCircle;
                    return (
                      <div
                        key={index}
                        className={`alert-row ${alert.severity}`}
                      >
                        <div className="alert-content">
                          <div className="alert-icon-wrapper" style={{ color: alertColors[alert.severity] }}>
                            <AlertIcon size={16} />
                          </div>
                          <div className="alert-text">
                            <p className="alert-message">{alert.message}</p>
                            <p className="alert-recommendation">{alert.recommendation}</p>
                          </div>
                        </div>
                        <button
                          className="acknowledge-btn"
                          onClick={() => handleAcknowledge(doctor.doctorId, alert.type)}
                          title="Acknowledge & Notify Doctor"
                        >
                          Notify
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card-footer">
        <span className="last-updated">
          Updated: {new Date().toLocaleTimeString()}
        </span>
        <button className="refresh-btn" onClick={fetchDoctorAlerts}>
          Refresh
        </button>
      </div>
    </div>
  );
}

export default DoctorAlertsPanel;
