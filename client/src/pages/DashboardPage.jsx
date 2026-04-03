import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    noShow: 0
  });
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);

  useEffect(() => {
    // Only redirect super_admin and doctor - they have dedicated dashboards
    if (user?.role === 'super_admin') {
      navigate('/super-admin');
      return;
    }
    if (user?.role === 'doctor') {
      navigate('/doctor/dashboard');
      return;
    }

    // For hospital_admin and patient, fetch appropriate data
    if (user?.role === 'hospital_admin') {
      fetchHospitalAdminData();
    } else if (user?.role === 'patient') {
      fetchPatientData();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  const fetchHospitalAdminData = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
        return;
      }

      const [statsRes, doctorsRes, hospitalRes] = await Promise.all([
        api.get(`/hospitals/${hospitalId}/stats`),
        api.get(`/hospitals/${hospitalId}/doctors`),
        api.get(`/hospitals/${hospitalId}`)
      ]);

      if (statsRes.data.stats) {
        const apptStats = statsRes.data.stats.appointments || {};
        setStats({
          totalAppointments: apptStats.total || 0,
          completed: apptStats.completed || 0,
          pending: (apptStats.booked || 0) + (apptStats.checked_in || 0),
          cancelled: apptStats.cancelled || 0,
          noShow: apptStats.no_show || 0,
          totalDoctors: statsRes.data.stats.doctors || 0
        });
      }

      if (doctorsRes.data.doctors) {
        const doctorsWithStatus = doctorsRes.data.doctors.map(doc => ({
          ...doc,
          name: doc.userId?.name || 'Doctor',
          status: doc.currentQueueStatus === 'active' ? 'Available' :
                  doc.currentQueueStatus === 'paused' ? 'Busy' : 'Offline'
        }));
        setDoctors(doctorsWithStatus);
      }

      if (hospitalRes.data.hospital) {
        setHospitalInfo(hospitalRes.data.hospital);
      }

      // Fetch today's appointments
      try {
        const today = new Date().toISOString().split('T')[0];
        const allAppointments = [];
        for (const doc of doctorsRes.data.doctors?.slice(0, 5) || []) {
          const apptRes = await api.get(`/doctors/${doc._id}/appointments`, {
            params: { date: today }
          });
          if (apptRes.data.appointments) {
            allAppointments.push(...apptRes.data.appointments.map(a => ({
              ...a,
              doctorName: doc.userId?.name,
              doctorSpecialty: doc.specialty
            })));
          }
        }
        setAppointments(allAppointments.slice(0, 10));
      } catch (err) {
        console.log('Could not fetch appointments');
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      // Fetch patient's appointments
      const res = await api.get('/appointments/my');
      setPatientAppointments(res.data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'completed';
      case 'booked':
      case 'confirmed': return 'scheduled';
      case 'checked_in': return 'ongoing';
      case 'cancelled': return 'canceled';
      case 'no_show': return 'canceled';
      default: return 'scheduled';
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  // Patient Dashboard
  if (user?.role === 'patient') {
    const upcomingAppointments = patientAppointments.filter(a =>
      a.status === 'booked' || a.status === 'confirmed' || a.status === 'checked_in'
    );
    const completedAppointments = patientAppointments.filter(a => a.status === 'completed');

    return (
      <AppLayout title="Dashboard" subtitle={`Welcome back, ${user?.name || 'Patient'}`}>
        <main className="patient-dashboard">
          {/* Quick Stats */}
          <div className="patient-stats-grid">
            <div className="patient-stat-card">
              <div className="patient-stat-icon upcoming">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="patient-stat-info">
                <span className="patient-stat-value">{upcomingAppointments.length}</span>
                <span className="patient-stat-label">Upcoming Appointments</span>
              </div>
            </div>

            <div className="patient-stat-card">
              <div className="patient-stat-icon completed">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <div className="patient-stat-info">
                <span className="patient-stat-value">{completedAppointments.length}</span>
                <span className="patient-stat-label">Completed Visits</span>
              </div>
            </div>

            <div className="patient-stat-card">
              <div className="patient-stat-icon total">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div className="patient-stat-info">
                <span className="patient-stat-value">{patientAppointments.length}</span>
                <span className="patient-stat-label">Total Appointments</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="patient-actions-section">
            <h2>Quick Actions</h2>
            <div className="patient-actions-grid">
              <Link to="/chat" className="patient-action-card primary">
                <div className="patient-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <div className="patient-action-content">
                  <h3>Book Appointment</h3>
                  <p>Chat with AI to describe symptoms and book with the right doctor</p>
                </div>
                <svg className="patient-action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12,5 19,12 12,19"/>
                </svg>
              </Link>

              <Link to="/my-appointments" className="patient-action-card">
                <div className="patient-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="patient-action-content">
                  <h3>My Appointments</h3>
                  <p>View and manage all your scheduled appointments</p>
                </div>
                <svg className="patient-action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12,5 19,12 12,19"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="patient-appointments-section">
            <div className="section-header">
              <h2>Upcoming Appointments</h2>
              <Link to="/my-appointments" className="view-all-link">View All</Link>
            </div>

            {upcomingAppointments.length > 0 ? (
              <div className="patient-appointments-list">
                {upcomingAppointments.slice(0, 3).map(appt => (
                  <div key={appt._id} className="patient-appointment-card">
                    <div className="appt-date-badge">
                      <span className="appt-day">{new Date(appt.date).getDate()}</span>
                      <span className="appt-month">{new Date(appt.date).toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div className="appt-details">
                      <h4>{appt.doctorId?.userId?.name || 'Doctor'}</h4>
                      <p>{appt.doctorId?.specialty || 'Specialist'}</p>
                      <span className="appt-time">{appt.slotTime}</span>
                    </div>
                    <span className={`status-pill status-${getStatusClass(appt.status)}`}>
                      {appt.status?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="patient-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <h3>No Upcoming Appointments</h3>
                <p>Book your first appointment with our AI assistant</p>
                <Link to="/chat" className="btn-primary">
                  Book Now
                </Link>
              </div>
            )}
          </div>
        </main>
      </AppLayout>
    );
  }

  // Hospital Admin Dashboard
  const statCards = [
    {
      label: "Today's Appointments",
      value: stats.totalAppointments.toString(),
      delta: `${stats.completed} completed`,
      icon: "AP",
    },
    {
      label: "Total Doctors",
      value: stats.totalDoctors?.toString() || doctors.length.toString(),
      delta: `${doctors.filter(d => d.status === 'Available').length} available`,
      icon: "DR",
    },
    {
      label: "Pending",
      value: stats.pending.toString(),
      delta: "Awaiting consultation",
      icon: "PN",
    },
  ];

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`Welcome ${user?.name || 'Admin'}, ${hospitalInfo?.name || 'MedQueue AI'}`}
    >
      <main className="dashboard-content">
        <section className="dashboard-grid">
          {/* Stats Cards */}
          <section className="metric-grid dashboard-section dashboard-section--metrics" aria-label="Overview statistics">
            {statCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </section>

          {/* Quick Actions */}
          <section className="panel dashboard-section dashboard-section--actions">
            <div className="panel-header panel-header--tight">
              <h2>Quick Actions</h2>
            </div>
            <div className="quick-actions">
              <button className="action-btn" onClick={() => navigate('/doctors/add')}>
                + Add Doctor
              </button>
              <button className="action-btn" onClick={() => navigate('/doctors')}>
                View Doctors
              </button>
              <button className="action-btn" onClick={() => navigate('/appointments')}>
                Appointments
              </button>
            </div>
          </section>

          {/* Appointments Table */}
          <section className="panel panel-table dashboard-section dashboard-section--table">
            <div className="panel-header">
              <div>
                <h2>Today's Appointments</h2>
              </div>
              <button type="button" onClick={() => navigate('/appointments')}>View All</button>
            </div>

            <div className="table-wrap">
              {appointments.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor / Specialty</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => (
                      <tr key={appt._id}>
                        <td>
                          <div className="table-person">
                            <span className="table-avatar">
                              {(appt.patientId?.name || 'P').split(" ").map((part) => part[0]).join("").slice(0, 2)}
                            </span>
                            <div>
                              <strong>{appt.patientId?.name || 'Patient'}</strong>
                              <p>{appt.patientId?.phone || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="table-meta">
                            <strong>{appt.doctorName || 'Doctor'}</strong>
                            <p>{appt.doctorSpecialty || ''}</p>
                          </div>
                        </td>
                        <td>{appt.slotTime || '--'}</td>
                        <td>
                          <span className={`status-pill status-${getStatusClass(appt.status)}`}>
                            {appt.status?.replace('_', ' ') || 'Booked'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <p>No appointments for today</p>
                </div>
              )}
            </div>
          </section>

          {/* Doctors Schedule */}
          <section className="panel dashboard-section dashboard-section--doctors">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>Doctors' Status</h2>
              </div>
            </div>
            <div className="doctor-stats">
              <div>
                <strong>{doctors.length}</strong>
                <span>All Doctors</span>
              </div>
              <div>
                <strong>{doctors.filter(d => d.status === 'Available').length}</strong>
                <span>Available</span>
              </div>
              <div>
                <strong>{doctors.filter(d => d.status !== 'Available').length}</strong>
                <span>Offline</span>
              </div>
            </div>
            <div className="doctor-list">
              {doctors.slice(0, 5).map((doctor) => (
                <article className="doctor-row" key={doctor._id}>
                  <div className="avatar avatar--small">
                    {(doctor.name || 'DR')
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p>{doctor.name}</p>
                    <span>{doctor.specialty}</span>
                  </div>
                  <span className={`status-pill status-${doctor.status?.toLowerCase()}`}>
                    {doctor.status}
                  </span>
                </article>
              ))}
              {doctors.length === 0 && (
                <p className="empty-text">No doctors added yet</p>
              )}
            </div>
          </section>

          {/* Hospital Info */}
          <section className="panel dashboard-section dashboard-section--info">
            <div className="panel-header panel-header--tight">
              <h2>Hospital Info</h2>
            </div>
            {hospitalInfo ? (
              <div className="hospital-info">
                <p><strong>Name:</strong> {hospitalInfo.name}</p>
                <p><strong>Type:</strong> {hospitalInfo.type}</p>
                <p><strong>Phone:</strong> {hospitalInfo.phone}</p>
                <p><strong>Email:</strong> {hospitalInfo.email}</p>
                {hospitalInfo.address && (
                  <p><strong>Address:</strong> {hospitalInfo.address.city}, {hospitalInfo.address.state}</p>
                )}
              </div>
            ) : (
              <p>Hospital information not available</p>
            )}
          </section>
        </section>
      </main>
    </AppLayout>
  );
}

export default DashboardPage;
