import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    // Redirect based on user role
    if (user?.role === 'super_admin') {
      navigate('/super-admin');
      return;
    }
    if (user?.role === 'doctor') {
      navigate('/doctor/dashboard');
      return;
    }
    if (user?.role === 'patient') {
      navigate('/chat');
      return;
    }

    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
        return;
      }

      // Fetch hospital stats, doctors, and appointments in parallel
      const [statsRes, doctorsRes, hospitalRes] = await Promise.all([
        api.get(`/hospitals/${hospitalId}/stats`),
        api.get(`/hospitals/${hospitalId}/doctors`),
        api.get(`/hospitals/${hospitalId}`)
      ]);

      // Set stats
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

      // Set doctors with status
      if (doctorsRes.data.doctors) {
        const doctorsWithStatus = doctorsRes.data.doctors.map(doc => ({
          ...doc,
          name: doc.userId?.name || 'Doctor',
          status: doc.currentQueueStatus === 'active' ? 'Available' :
                  doc.currentQueueStatus === 'paused' ? 'Busy' : 'Offline'
        }));
        setDoctors(doctorsWithStatus);
      }

      // Set hospital info
      if (hospitalRes.data.hospital) {
        setHospitalInfo(hospitalRes.data.hospital);
      }

      // Fetch today's appointments for the table
      try {
        const today = new Date().toISOString().split('T')[0];
        // Get appointments from all doctors
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
