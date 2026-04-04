import { useState, useEffect } from "react";
import { AlertTriangle, Phone, Mail, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import api from "../services/api";

function NoShowRiskCard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [interventionLoading, setInterventionLoading] = useState({});

  useEffect(() => {
    fetchNoShowRisk();
  }, []);

  const fetchNoShowRisk = async () => {
    try {
      setLoading(true);
      const response = await api.get("/dashboard/no-show-risk");
      setData(response.data.dashboard);
      setError(null);
    } catch (err) {
      setError("Failed to load no-show risk data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIntervention = async (appointmentId, interventionType) => {
    try {
      setInterventionLoading(prev => ({ ...prev, [appointmentId]: true }));
      await api.post(`/dashboard/no-show-risk/${appointmentId}/intervene`, {
        intervention: interventionType,
        notes: `${interventionType} sent from dashboard`
      });
      // Refresh data
      fetchNoShowRisk();
    } catch (err) {
      console.error("Intervention failed:", err);
    } finally {
      setInterventionLoading(prev => ({ ...prev, [appointmentId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="dashboard-card no-show-risk-card">
        <div className="card-header">
          <AlertTriangle size={20} />
          <h3>No-Show Risk Alerts</h3>
        </div>
        <div className="card-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-card no-show-risk-card">
        <div className="card-header">
          <AlertTriangle size={20} />
          <h3>No-Show Risk Alerts</h3>
        </div>
        <div className="card-error">{error}</div>
      </div>
    );
  }

  const hasAlerts = data?.highRisk?.length > 0 || data?.mediumRisk?.length > 0;

  return (
    <div className="dashboard-card no-show-risk-card">
      <div className="card-header">
        <div className="header-left">
          <AlertTriangle size={20} className="warning-icon" />
          <h3>No-Show Risk Alerts</h3>
        </div>
        <div className="risk-summary">
          <span className="risk-badge high">{data?.summary?.high || 0} High</span>
          <span className="risk-badge medium">{data?.summary?.medium || 0} Medium</span>
        </div>
      </div>

      {!hasAlerts ? (
        <div className="no-alerts">
          <CheckCircle size={32} className="success-icon" />
          <p>No high-risk appointments for today</p>
        </div>
      ) : (
        <div className="risk-list">
          {data?.highRisk?.slice(0, 3).map((patient) => (
            <div key={patient.appointmentId} className="risk-item high">
              <div className="patient-info">
                <div className="patient-header">
                  <span className="patient-name">{patient.patientName}</span>
                  <span className="risk-percent">{patient.noShowProbability}% risk</span>
                </div>
                <div className="patient-details">
                  <Clock size={12} />
                  <span>{patient.slotTime}</span>
                  <span className="separator">|</span>
                  <span>History: {patient.historicalNoShows}/{patient.totalAppointments} no-shows</span>
                </div>
              </div>
              <div className="intervention-buttons">
                {patient.interventions?.includes("Send SMS reminder") && (
                  <button
                    className="intervention-btn sms"
                    onClick={() => handleIntervention(patient.appointmentId, "sms_reminder")}
                    disabled={interventionLoading[patient.appointmentId]}
                    title="Send SMS Reminder"
                  >
                    <MessageSquare size={14} />
                  </button>
                )}
                {patient.interventions?.includes("Make phone call") && (
                  <button
                    className="intervention-btn phone"
                    onClick={() => handleIntervention(patient.appointmentId, "phone_call")}
                    disabled={interventionLoading[patient.appointmentId]}
                    title="Log Phone Call"
                  >
                    <Phone size={14} />
                  </button>
                )}
                <button
                  className="intervention-btn email"
                  onClick={() => handleIntervention(patient.appointmentId, "email_reminder")}
                  disabled={interventionLoading[patient.appointmentId]}
                  title="Send Email"
                >
                  <Mail size={14} />
                </button>
              </div>
            </div>
          ))}

          {data?.mediumRisk?.slice(0, 2).map((patient) => (
            <div key={patient.appointmentId} className="risk-item medium">
              <div className="patient-info">
                <div className="patient-header">
                  <span className="patient-name">{patient.patientName}</span>
                  <span className="risk-percent">{patient.noShowProbability}% risk</span>
                </div>
                <div className="patient-details">
                  <Clock size={12} />
                  <span>{patient.slotTime}</span>
                </div>
              </div>
              <div className="intervention-buttons">
                <button
                  className="intervention-btn sms"
                  onClick={() => handleIntervention(patient.appointmentId, "sms_reminder")}
                  disabled={interventionLoading[patient.appointmentId]}
                  title="Send SMS Reminder"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasAlerts && (
        <div className="card-footer">
          <button className="view-all-btn" onClick={fetchNoShowRisk}>
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}

export default NoShowRiskCard;
