import { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../hooks';
import api from '../services/api';
import toast from 'react-hot-toast';

function QueueDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const hospitalId = user?.hospitalId?._id || user?.hospitalId;

  useEffect(() => {
    if (hospitalId) {
      fetchQueueData();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchQueueData, 30000);
      return () => clearInterval(interval);
    }
  }, [hospitalId]);

  const fetchQueueData = async () => {
    try {
      const [summaryRes, queuesRes] = await Promise.all([
        api.get(`/queue/hospital/${hospitalId}/summary`),
        api.get(`/queue/hospital/${hospitalId}/all-queues`)
      ]);

      setSummary(summaryRes.data.summary);
      setQueues(queuesRes.data.queues || []);
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueueData();
  };

  const initializeQueues = async () => {
    try {
      const res = await api.post(`/queue/hospital/${hospitalId}/initialize`);
      toast.success(res.data.message);
      fetchQueueData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initialize queues');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'paused': return 'status-paused';
      case 'closed': return 'status-closed';
      default: return 'status-not-started';
    }
  };

  const getPatientStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'patient-waiting';
      case 'in_consultation': return 'patient-in-progress';
      case 'completed': return 'patient-completed';
      case 'no_show': return 'patient-no-show';
      case 'skipped': return 'patient-skipped';
      default: return '';
    }
  };

  if (loading) {
    return (
      <AppLayout title="Queue Dashboard" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading queue data...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Queue Dashboard"
      subtitle={`Hospital-wide queue management | ${new Date().toLocaleDateString()}`}
    >
      <main className="queue-dashboard-page">
        {/* Summary Stats */}
        <section className="queue-summary-stats">
          <div className="stat-card stat-total">
            <div className="stat-value">{summary?.totalPatients || 0}</div>
            <div className="stat-label">Total Patients</div>
          </div>
          <div className="stat-card stat-waiting">
            <div className="stat-value">{summary?.totalWaiting || 0}</div>
            <div className="stat-label">Waiting</div>
          </div>
          <div className="stat-card stat-progress">
            <div className="stat-value">{summary?.totalInProgress || 0}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-value">{summary?.totalCompleted || 0}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card stat-noshow">
            <div className="stat-value">{summary?.totalNoShow || 0}</div>
            <div className="stat-label">No Show</div>
          </div>
        </section>

        {/* Actions */}
        <section className="queue-actions-bar">
          <button
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            className="btn-primary"
            onClick={initializeQueues}
          >
            Initialize Today's Queues
          </button>
        </section>

        {/* Doctor Queues Grid */}
        <section className="doctor-queues-grid">
          {queues.length > 0 ? (
            queues.map(queue => (
              <div
                key={queue._id}
                className={`doctor-queue-card ${selectedDoctor === queue._id ? 'selected' : ''}`}
                onClick={() => setSelectedDoctor(selectedDoctor === queue._id ? null : queue._id)}
              >
                <div className="queue-card-header">
                  <div className="doctor-info">
                    <h3>{queue.doctorName}</h3>
                    <span className="specialty">{queue.specialty}</span>
                  </div>
                  <span className={`queue-status ${getStatusColor(queue.status)}`}>
                    {queue.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="queue-card-stats">
                  <div className="mini-stat">
                    <span className="mini-stat-value">{queue.summary?.waiting || 0}</span>
                    <span className="mini-stat-label">Waiting</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-value">{queue.summary?.inConsultation || 0}</span>
                    <span className="mini-stat-label">In Progress</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-value">{queue.summary?.completed || 0}</span>
                    <span className="mini-stat-label">Done</span>
                  </div>
                </div>

                {queue.currentDelay > 0 && (
                  <div className="queue-delay-banner">
                    Delay: {queue.currentDelay} min
                  </div>
                )}

                {/* Expanded Patient List */}
                {selectedDoctor === queue._id && (
                  <div className="queue-patient-list">
                    <h4>Patient Queue</h4>
                    {queue.entries.length > 0 ? (
                      <div className="patient-entries">
                        {queue.entries.map(entry => (
                          <div
                            key={entry._id}
                            className={`patient-entry ${getPatientStatusColor(entry.status)}`}
                          >
                            <div className="entry-number">#{entry.queueNumber}</div>
                            <div className="entry-info">
                              <span className="patient-name">{entry.patientName}</span>
                              <span className="slot-time">{entry.slotTime}</span>
                            </div>
                            <div className="entry-status">{entry.status.replace('_', ' ')}</div>
                            {entry.urgencyScore && entry.urgencyScore !== 3 && (
                              <div className={`urgency-indicator urgency-${entry.urgencyScore}`}>
                                U{entry.urgencyScore}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-patients">No patients in queue</p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-queues">
              <p>No queues found for today.</p>
              <p>Click "Initialize Today's Queues" to set up queues for all doctors.</p>
            </div>
          )}
        </section>

        {/* Live Activity Feed */}
        <section className="panel queue-activity-panel">
          <h3>Queue Activity</h3>
          <div className="activity-feed">
            {queues.flatMap(q =>
              q.entries
                .filter(e => e.status === 'in_consultation' || e.status === 'completed')
                .slice(-5)
                .map(entry => ({
                  ...entry,
                  doctorName: q.doctorName
                }))
            )
              .sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime))
              .slice(0, 10)
              .map((entry, idx) => (
                <div key={idx} className="activity-item">
                  <span className={`activity-status ${entry.status}`}>
                    {entry.status === 'in_consultation' ? 'In Progress' : 'Completed'}
                  </span>
                  <span className="activity-patient">{entry.patientName}</span>
                  <span className="activity-doctor">with Dr. {entry.doctorName}</span>
                </div>
              ))
            }
            {queues.every(q => q.entries.length === 0) && (
              <p className="no-activity">No recent activity</p>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default QueueDashboardPage;
