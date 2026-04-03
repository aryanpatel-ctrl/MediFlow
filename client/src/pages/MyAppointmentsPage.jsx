import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import toast from 'react-hot-toast';
import api from '../services/api';

function MyAppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [queueStatus, setQueueStatus] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data.appointments || []);

      // Check queue status for today's confirmed appointment
      const todayAppt = res.data.appointments?.find(appt => {
        const apptDate = new Date(appt.date).toDateString();
        const today = new Date().toDateString();
        return apptDate === today && appt.status === 'confirmed';
      });

      if (todayAppt) {
        fetchQueueStatus(todayAppt.doctorId._id);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStatus = async (doctorId) => {
    try {
      const res = await api.get(`/queue/${doctorId}/patient-status`);
      setQueueStatus(res.data);
    } catch (error) {
      // Patient might not be in queue yet
      console.log('Queue status not available');
    }
  };

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await api.put(`/appointments/${appointmentId}/cancel`);
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel');
    }
  };

  const filteredAppointments = appointments.filter(appt => {
    const apptDate = new Date(appt.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'upcoming') {
      return apptDate >= today && !['cancelled', 'completed', 'no_show'].includes(appt.status);
    } else {
      return apptDate < today || ['completed', 'no_show'].includes(appt.status);
    }
  });

  const todaysAppointment = appointments.find(appt => {
    const apptDate = new Date(appt.date).toDateString();
    const today = new Date().toDateString();
    return apptDate === today && appt.status === 'confirmed';
  });

  if (loading) {
    return (
      <div className="my-appointments loading">
        <div className="loading-spinner"></div>
        <p>Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="my-appointments">
      <header className="page-header">
        <div className="header-content">
          <h1>My Appointments</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/chat')}>
          Book New
        </button>
      </header>

      {/* Today's Queue Status */}
      {todaysAppointment && (
        <section className="queue-status-card">
          <div className="queue-header">
            <h2>Today's Appointment</h2>
            <span className={`status-badge status-${todaysAppointment.status}`}>
              {todaysAppointment.status.replace('_', ' ')}
            </span>
          </div>

          <div className="queue-info">
            <div className="doctor-info">
              <h3>{todaysAppointment.doctorId?.userId?.name || 'Doctor'}</h3>
              <p>{todaysAppointment.doctorId?.specialty}</p>
              <p className="time">Scheduled: {todaysAppointment.slotTime}</p>
            </div>

            {queueStatus ? (
              <div className="queue-position">
                <div className="token">
                  <span className="label">Token</span>
                  <span className="number">#{queueStatus.queueNumber}</span>
                </div>
                <div className="position">
                  <span className="label">Position</span>
                  <span className="number">{queueStatus.position}</span>
                </div>
                <div className="wait-time">
                  <span className="label">Est. Wait</span>
                  <span className="number">{queueStatus.estimatedWaitTime || 0} min</span>
                </div>
                {queueStatus.status === 'in_consultation' && (
                  <div className="your-turn">It's your turn!</div>
                )}
              </div>
            ) : (
              <div className="queue-pending">
                <p>Queue not started yet</p>
                <small>You'll see your position when the doctor starts the queue</small>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
      </div>

      {/* Appointments List */}
      <section className="appointments-list">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map(appt => (
            <div key={appt._id} className={`appointment-card status-${appt.status}`}>
              <div className="appointment-date">
                <span className="day">{new Date(appt.date).getDate()}</span>
                <span className="month">{new Date(appt.date).toLocaleString('default', { month: 'short' })}</span>
              </div>

              <div className="appointment-details">
                <h3>{appt.doctorId?.userId?.name || 'Doctor'}</h3>
                <p className="specialty">{appt.doctorId?.specialty}</p>
                <p className="time">{appt.slotTime}</p>
              </div>

              <div className="appointment-status">
                <span className={`status-badge status-${appt.status}`}>
                  {appt.status.replace('_', ' ')}
                </span>

                {activeTab === 'upcoming' && appt.status !== 'cancelled' && (
                  <button
                    className="btn-cancel"
                    onClick={() => cancelAppointment(appt._id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No {activeTab} appointments</p>
            {activeTab === 'upcoming' && (
              <button className="btn-primary" onClick={() => navigate('/chat')}>
                Book an Appointment
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default MyAppointmentsPage;
