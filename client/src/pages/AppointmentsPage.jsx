import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";

function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    ongoing: 0,
    cancelled: 0
  });
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    fetchAppointments();
  }, [user, dateFilter]);

  const fetchAppointments = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
        return;
      }

      // Get doctors first
      const doctorsRes = await api.get(`/hospitals/${hospitalId}/doctors`);
      const doctors = doctorsRes.data.doctors || [];

      // Calculate date range
      let dateParam = new Date().toISOString().split('T')[0];
      if (dateFilter === 'week') {
        // For week, we'd need different logic, keeping today for simplicity
      }

      // Fetch appointments from all doctors
      const allAppointments = [];
      const statsCount = { total: 0, completed: 0, ongoing: 0, cancelled: 0, booked: 0 };

      for (const doc of doctors) {
        try {
          const apptRes = await api.get(`/doctors/${doc._id}/appointments`, {
            params: { date: dateParam }
          });

          if (apptRes.data.appointments) {
            const docAppointments = apptRes.data.appointments.map(a => ({
              ...a,
              doctorName: doc.userId?.name || 'Doctor',
              doctorSpecialty: doc.specialty
            }));
            allAppointments.push(...docAppointments);

            // Count stats
            docAppointments.forEach(a => {
              statsCount.total++;
              if (a.status === 'completed') statsCount.completed++;
              else if (a.status === 'checked_in' || a.status === 'in_consultation') statsCount.ongoing++;
              else if (a.status === 'cancelled') statsCount.cancelled++;
              else statsCount.booked++;
            });
          }
        } catch (err) {
          console.log(`Could not fetch appointments for doctor ${doc._id}`);
        }
      }

      // Sort by time
      allAppointments.sort((a, b) => {
        if (a.slotTime < b.slotTime) return -1;
        if (a.slotTime > b.slotTime) return 1;
        return 0;
      });

      setAppointments(allAppointments);
      setStats(statsCount);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'completed';
      case 'booked':
      case 'confirmed': return 'scheduled';
      case 'checked_in':
      case 'in_consultation': return 'ongoing';
      case 'cancelled':
      case 'no_show': return 'canceled';
      default: return 'scheduled';
    }
  };

  const overviewCards = [
    {
      label: "Today's Appointments",
      value: stats.total.toString(),
      delta: `+${stats.booked || 0} new`,
      note: `${stats.completed} consultations done`,
      icon: "TA",
      tone: "teal",
    },
    {
      label: "Completed",
      value: stats.completed.toString(),
      delta: stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : "0%",
      note: "Of today's appointments",
      icon: "CP",
      tone: "green",
    },
    {
      label: "Ongoing",
      value: stats.ongoing.toString(),
      delta: "In progress",
      note: "Currently in consultation",
      icon: "OG",
      tone: "teal",
    },
    {
      label: "Cancelled",
      value: stats.cancelled.toString(),
      delta: stats.total > 0 ? `${Math.round((stats.cancelled / stats.total) * 100)}%` : "0%",
      note: "Cancelled appointments",
      icon: "CN",
      tone: "rose",
    },
  ];

  if (loading) {
    return (
      <AppLayout title="Appointments" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading appointments...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Appointments" subtitle="Manage today's clinical schedules">
      <main className="appointments-page">
        {/* Overview Cards */}
        <section className="appointments-overview" aria-label="Appointment overview">
          {overviewCards.map((card) => (
            <article className={`appointment-card appointment-card--${card.tone}`} key={card.label}>
              <div className="appointment-card__top">
                <div className="appointment-card__label">
                  <div className="appointment-card__icon" aria-hidden="true">
                    {card.icon}
                  </div>
                  <span>{card.label}</span>
                </div>
              </div>
              <div className="appointment-card__body">
                <strong>{card.value}</strong>
                <span className="appointment-card__delta">{card.delta}</span>
              </div>
              <p>{card.note}</p>
            </article>
          ))}
        </section>

        {/* Filter */}
        <section className="appointments-filter">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
          </select>
        </section>

        {/* Appointments Table */}
        <section className="panel appointment-table-card">
          <div className="panel-header">
            <div>
              <h2>Appointments</h2>
              <p>{appointments.length} appointments found</p>
            </div>
          </div>

          <div className="table-wrap">
            {appointments.length > 0 ? (
              <table className="appointment-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Doctor</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <div className="table-person">
                          <span className="table-avatar">
                            {(row.patientId?.name || 'P').split(" ").map((part) => part[0]).join("").slice(0, 2)}
                          </span>
                          <div>
                            <strong>{row.patientId?.name || 'Patient'}</strong>
                            <p>#{row._id?.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td>{row.patientId?.phone || '--'}</td>
                      <td>
                        <div className="table-meta">
                          <strong>{row.doctorName}</strong>
                          <p>{row.doctorSpecialty}</p>
                        </div>
                      </td>
                      <td>
                        <div className="table-meta">
                          <strong>{new Date(row.date).toLocaleDateString()}</strong>
                          <p>{row.slotTime}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-${getStatusClass(row.status)}`}>
                          {row.status?.replace('_', ' ') || 'Booked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No appointments found for {dateFilter === 'today' ? 'today' : 'this week'}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default AppointmentsPage;
