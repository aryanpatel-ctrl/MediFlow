import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../hooks';
import toast from 'react-hot-toast';
import api from '../services/api';

function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [queue, setQueue] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch doctor profile and queue
  useEffect(() => {
    fetchDoctorData();
  }, []);

  const fetchDoctorData = async () => {
    try {
      // Get doctor profile by user ID
      const doctorsRes = await api.get('/doctors', { params: { userId: user?._id } });
      const doctorData = doctorsRes.data.doctors?.find(d => d.userId?._id === user?._id || d.userId === user?._id);

      if (doctorData) {
        setDoctor(doctorData);

        // Get queue and appointments
        const [queueRes, apptRes] = await Promise.all([
          api.get(`/doctors/${doctorData._id}/queue`),
          api.get(`/doctors/${doctorData._id}/appointments`, {
            params: { date: new Date().toISOString().split('T')[0] }
          })
        ]);

        setQueue(queueRes.data.queue);
        setAppointments(apptRes.data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch doctor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQueue = async () => {
    if (!doctor) return;
    setActionLoading(true);
    try {
      await api.put(`/doctors/${doctor._id}/queue/start`);
      toast.success('Queue started!');
      fetchDoctorData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start queue');
    } finally {
      setActionLoading(false);
    }
  };

  const callNextPatient = async () => {
    if (!doctor) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/doctors/${doctor._id}/queue/next`);
      toast.success(res.data.message || 'Called next patient');
      fetchDoctorData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to call next');
    } finally {
      setActionLoading(false);
    }
  };

  const markComplete = async () => {
    if (!doctor) return;
    setActionLoading(true);
    try {
      await api.put(`/queue/${doctor._id}/complete-current`);
      toast.success('Consultation completed');
      fetchDoctorData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark complete');
    } finally {
      setActionLoading(false);
    }
  };

  const markNoShow = async () => {
    if (!doctor) return;
    setActionLoading(true);
    try {
      await api.put(`/queue/${doctor._id}/skip-patient`, { markAsNoShow: true });
      toast.success('Marked as no-show');
      fetchDoctorData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark no-show');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Doctor Dashboard" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  if (!doctor) {
    return (
      <AppLayout title="Doctor Dashboard" subtitle="Setup Required">
        <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Doctor Profile Not Found</h2>
          <p style={{ color: '#6b7280', marginTop: '10px' }}>Please contact admin to set up your profile.</p>
        </div>
      </AppLayout>
    );
  }

  const currentPatient = queue?.entries?.find(e => e.status === 'in_consultation');
  const waitingPatients = queue?.entries?.filter(e => e.status === 'waiting') || [];
  const completedCount = queue?.entries?.filter(e => e.status === 'completed')?.length || 0;

  return (
    <AppLayout
      title={`Welcome, Dr. ${user?.name?.split(' ').pop() || user?.name}`}
      subtitle={`${doctor.specialty} | Today: ${new Date().toLocaleDateString()}`}
    >
      <main className="doctor-dashboard">
        {/* Stats Header */}
        <div className="doctor-stats-row">
          <div className="doctor-stat-card">
            <span className="stat-value">{appointments.length}</span>
            <span className="stat-label">Appointments</span>
          </div>
          <div className="doctor-stat-card">
            <span className="stat-value">{completedCount}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="doctor-stat-card">
            <span className="stat-value">{waitingPatients.length}</span>
            <span className="stat-label">Waiting</span>
          </div>
        </div>

        <div className="dashboard-content">
        {/* Current Patient */}
        <div className="current-patient-section">
          <div className="section-header">
            <h2>Current Patient</h2>
            {queue?.status !== 'active' && (
              <button
                className="btn-primary"
                onClick={startQueue}
                disabled={actionLoading}
              >
                Start Queue
              </button>
            )}
          </div>

          {currentPatient ? (
            <div className="current-patient-card">
              <div className="patient-info">
                <h3>{currentPatient.patientId?.name || 'Patient'}</h3>
                <p>Token #{currentPatient.queueNumber} | {currentPatient.appointmentId?.slotTime}</p>
                <p className="phone">{currentPatient.patientId?.phone}</p>
              </div>

              {/* AI Pre-Visit Summary */}
              {currentPatient.appointmentId?.triageData && (
                <div className="ai-summary">
                  <h4>AI Pre-Visit Summary</h4>
                  <div className="summary-content">
                    <div className="summary-row">
                      <strong>Symptoms:</strong>
                      <span>{currentPatient.appointmentId.triageData.symptoms?.join(', ') || 'N/A'}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Duration:</strong>
                      <span>{currentPatient.appointmentId.triageData.symptomDuration || 'N/A'}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Urgency:</strong>
                      <span className={`urgency urgency-${currentPatient.appointmentId.triageData.urgencyScore}`}>
                        Level {currentPatient.appointmentId.triageData.urgencyScore || 'N/A'}
                      </span>
                    </div>
                    {currentPatient.appointmentId.triageData.preVisitSummary && (
                      <div className="summary-row full">
                        <strong>Summary:</strong>
                        <p>{currentPatient.appointmentId.triageData.preVisitSummary}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="patient-actions">
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/prescription?patientId=${currentPatient.patientId?._id || currentPatient.patientId}&appointmentId=${currentPatient.appointmentId?._id || currentPatient.appointmentId}`)}
                >
                  Write Prescription
                </button>
                <button
                  className="btn-success"
                  onClick={markComplete}
                  disabled={actionLoading}
                >
                  Complete
                </button>
                <button
                  className="btn-danger"
                  onClick={markNoShow}
                  disabled={actionLoading}
                >
                  No Show
                </button>
              </div>
            </div>
          ) : (
            <div className="no-patient">
              {queue?.status === 'active' ? (
                <>
                  <p>No patient currently in consultation</p>
                  {waitingPatients.length > 0 && (
                    <button
                      className="btn-primary"
                      onClick={callNextPatient}
                      disabled={actionLoading}
                    >
                      Call Next Patient
                    </button>
                  )}
                </>
              ) : (
                <p>Start the queue to begin consultations</p>
              )}
            </div>
          )}
        </div>

        {/* Waiting Queue */}
        <div className="waiting-queue-section">
          <h2>Waiting Queue ({waitingPatients.length})</h2>

          {waitingPatients.length > 0 ? (
            <div className="queue-list">
              {waitingPatients.map((entry, index) => (
                <div key={entry._id || index} className="queue-item">
                  <div className="queue-number">#{entry.queueNumber}</div>
                  <div className="queue-info">
                    <span className="patient-name">{entry.patientId?.name || 'Patient'}</span>
                    <span className="slot-time">{entry.appointmentId?.slotTime}</span>
                  </div>
                  <div className={`urgency-badge urgency-${entry.urgencyScore || 3}`}>
                    U{entry.urgencyScore || 3}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-queue">
              <p>No patients waiting</p>
            </div>
          )}
        </div>

        {/* Today's Appointments */}
        <div className="appointments-section">
          <h2>Today's Appointments</h2>

          {appointments.length > 0 ? (
            <div className="appointments-list">
              {appointments.map(appt => (
                <div key={appt._id} className={`appointment-item status-${appt.status}`}>
                  <div className="appt-time">{appt.slotTime}</div>
                  <div className="appt-info">
                    <span className="patient-name">{appt.patientId?.name || 'Patient'}</span>
                    <span className="appt-status">{appt.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-appointments">
              <p>No appointments for today</p>
            </div>
          )}
        </div>
        </div>
      </main>
    </AppLayout>
  );
}

export default DoctorDashboard;
