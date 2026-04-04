import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointments, useAuth } from '../hooks';
import toast from 'react-hot-toast';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';

function MyAppointmentsPage() {
  const { user } = useAuth();
  const { appointments, loading, getAppointments, cancel } = useAppointments();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [queueStatus, setQueueStatus] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    getAppointments();
  }, [getAppointments]);

  const fetchAppointments = async () => {
    try {
      await getAppointments();
    } catch (error) {
      toast.error('Failed to load appointments');
    }
  };

  useEffect(() => {
    const todayAppt = appointments.find(appt => {
      const apptDate = new Date(appt.date).toDateString();
      const today = new Date().toDateString();
      return apptDate === today && ['booked', 'confirmed', 'checked_in', 'in_consultation'].includes(appt.status);
    });

    if (todayAppt?.doctorId?._id) {
      fetchQueueStatus(todayAppt.doctorId._id);
    } else {
      setQueueStatus(null);
    }
  }, [appointments]);

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
      const result = await cancel(appointmentId, 'Cancelled by patient');

      if (result.error) {
        toast.error(result.payload || 'Failed to cancel');
        return;
      }

      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to cancel');
    }
  };

  const openRescheduleModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  const canReschedule = (appointment) => {
    if (!['booked', 'confirmed'].includes(appointment.status)) {
      return false;
    }

    if (appointment.rescheduleRequest?.status === 'pending') {
      return false;
    }

    const appointmentDateTime = new Date(`${appointment.date}T${appointment.slotTime || '00:00'}`);
    return appointmentDateTime >= new Date() && (appointment.rescheduleCount || 0) < 2;
  };

  const canCancel = (appointment) => {
    return !['cancelled', 'completed', 'no_show', 'rescheduled', 'checked_in', 'in_consultation'].includes(appointment.status);
  };

  const getDisplayStatus = (appointment) => {
    if (appointment.rescheduleRequest?.status === 'pending') {
      return 'reschedule requested';
    }

    if (appointment.rescheduleRequest?.status === 'rejected') {
      return 'reschedule rejected';
    }

    return appointment.status.replace('_', ' ');
  };

  const filteredAppointments = appointments.filter(appt => {
    const apptDate = new Date(appt.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'upcoming') {
      return apptDate >= today && !['cancelled', 'completed', 'no_show', 'rescheduled'].includes(appt.status);
    } else {
      return apptDate < today || ['completed', 'no_show', 'cancelled', 'rescheduled'].includes(appt.status);
    }
  });

  const todaysAppointment = appointments.find(appt => {
    const apptDate = new Date(appt.date).toDateString();
    const today = new Date().toDateString();
    return apptDate === today && ['booked', 'confirmed', 'checked_in', 'in_consultation'].includes(appt.status);
  });

  if (loading) {
    return (
      <AppLayout title="My Appointments" subtitle="Loading...">
        <div className="my-appointments loading">
          <div className="loading-spinner"></div>
          <p>Loading appointments...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Appointments" subtitle={`Welcome, ${user?.name || "Patient"}`}>
      <div className="my-appointments">
        <header className="page-header">
          <div className="header-content">
            <h1>My Appointments</h1>
            <p>Welcome, {user?.name}</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/book')}>
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
                    {getDisplayStatus(appt)}
                  </span>

                  {activeTab === 'upcoming' ? (
                    <div className="appointment-actions">
                      {canReschedule(appt) && (
                        <button
                          className="btn-reschedule"
                          onClick={() => openRescheduleModal(appt)}
                        >
                          Reschedule
                        </button>
                      )}
                      {canCancel(appt) && (
                        <button
                          className="btn-cancel"
                          onClick={() => cancelAppointment(appt._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No {activeTab} appointments</p>
              {activeTab === 'upcoming' && (
                <button className="btn-primary" onClick={() => navigate('/book')}>
                  Book an Appointment
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      <RescheduleAppointmentModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setSelectedAppointment(null);
        }}
        onSuccess={() => {
          fetchAppointments();
          setShowRescheduleModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        requestApproval={true}
      />
    </AppLayout>
  );
}

export default MyAppointmentsPage;
