import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../hooks';
import api from '../services/api';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';

function QueueDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const hasJoinedHospital = useRef(false);

  const hospitalId = user?.hospitalId?._id || user?.hospitalId;

  // Initialize socket connection
  useEffect(() => {
    console.log('Initializing socket connection to:', SOCKET_URL);

    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('QueueDashboard socket connected:', socket.id);
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('QueueDashboard socket disconnected');
      setSocketConnected(false);
      hasJoinedHospital.current = false;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      console.log('Cleaning up socket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Navigate to patient details
  const handlePatientClick = (entry, e) => {
    e.stopPropagation();
    // patientId can be a string ID or an object with _id
    const patientId = typeof entry.patientId === 'string'
      ? entry.patientId
      : entry.patientId?._id;

    if (patientId) {
      navigate(`/patients/${patientId}`);
    } else {
      console.log('No patient ID found:', entry);
    }
  };

  // Fetch queue data
  const fetchQueueDataCallback = useCallback(async () => {
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
  }, [hospitalId]);

  useEffect(() => {
    if (hospitalId) {
      fetchQueueDataCallback();
    }
  }, [hospitalId, fetchQueueDataCallback]);

  // Join hospital room when connected
  useEffect(() => {
    if (socketConnected && hospitalId && socketRef.current && !hasJoinedHospital.current) {
      console.log('Socket connected, joining hospital room:', hospitalId);
      socketRef.current.emit('join:hospital', hospitalId);
      hasJoinedHospital.current = true;
    }
  }, [socketConnected, hospitalId]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socketConnected) return;

    console.log('Setting up socket listeners, connected:', socketConnected);

    // Listen for queue updates
    const handleQueueUpdate = (data) => {
      console.log('Queue update received:', data);
      fetchQueueDataCallback();

      // Show specific message based on action
      if (data.action === 'completed') {
        toast.success(
          `Dr. ${data.doctorName || 'Doctor'} completed consultation with ${data.patientName || 'patient'}`,
          { duration: 3000, icon: '✅' }
        );
      } else if (data.action === 'no_show') {
        toast(`${data.patientName || 'Patient'} marked as no-show by Dr. ${data.doctorName || 'Doctor'}`,
          { duration: 3000, icon: '❌' }
        );
      } else if (data.action === 'skipped') {
        toast(`${data.patientName || 'Patient'} skipped by Dr. ${data.doctorName || 'Doctor'}`,
          { duration: 3000, icon: '⏭️' }
        );
      } else if (data.action === 'patient_checked_in') {
        toast.success(`${data.patientName || 'Patient'} checked in`,
          { duration: 3000, icon: '👋' }
        );
      } else {
        toast.success('Queue updated', { duration: 2000, icon: '🔄' });
      }
    };

    const handlePatientCalled = (data) => {
      console.log('Patient called:', data);
      fetchQueueDataCallback();
      toast.success(
        `Patient #${data.queueNumber} (${data.patientName || 'Patient'}) called by Dr. ${data.doctorName || 'Doctor'}`,
        { duration: 4000, icon: '📢' }
      );
    };

    const handleQueueStarted = (data) => {
      console.log('Queue started:', data);
      fetchQueueDataCallback();
      toast.success(`Dr. ${data.doctorName || 'Doctor'} started their queue`, { duration: 3000, icon: '▶️' });
    };

    const handleQueuePaused = () => {
      fetchQueueDataCallback();
      toast('Queue paused', { duration: 2000, icon: '⏸️' });
    };

    const handleQueueResumed = () => {
      fetchQueueDataCallback();
      toast.success('Queue resumed', { duration: 2000, icon: '▶️' });
    };

    const handleDelay = (data) => {
      fetchQueueDataCallback();
      toast(`Delay: ${data.delay} minutes`, { duration: 3000, icon: '⏰' });
    };

    // Register event listeners
    socket.on('queue:update', handleQueueUpdate);
    socket.on('queue:patient-called', handlePatientCalled);
    socket.on('queue:started', handleQueueStarted);
    socket.on('queue:paused', handleQueuePaused);
    socket.on('queue:resumed', handleQueueResumed);
    socket.on('queue:delay', handleDelay);
    socket.on('queue:your-turn', handlePatientCalled);
    socket.on('queue:closed', handleQueueUpdate);

    // Cleanup listeners on unmount
    return () => {
      socket.off('queue:update', handleQueueUpdate);
      socket.off('queue:patient-called', handlePatientCalled);
      socket.off('queue:started', handleQueueStarted);
      socket.off('queue:paused', handleQueuePaused);
      socket.off('queue:resumed', handleQueueResumed);
      socket.off('queue:delay', handleDelay);
      socket.off('queue:your-turn', handlePatientCalled);
      socket.off('queue:closed', handleQueueUpdate);
    };
  }, [socketConnected, fetchQueueDataCallback]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueueDataCallback();
  };

  const initializeQueues = async () => {
    try {
      const res = await api.post(`/queue/hospital/${hospitalId}/initialize`);
      toast.success(res.data.message);
      fetchQueueDataCallback();
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
      <AppLayout title="Queue Dashboard">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading queue data...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Queue Dashboard">
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
                            className={`patient-entry ${getPatientStatusColor(entry.status)} clickable`}
                            onClick={(e) => handlePatientClick(entry, e)}
                            style={{ cursor: 'pointer' }}
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
                <div
                  key={idx}
                  className="activity-item clickable"
                  onClick={(e) => handlePatientClick(entry, e)}
                  style={{ cursor: 'pointer' }}
                >
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
