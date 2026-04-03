import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";
import AddAppointmentModal from "../components/AddAppointmentModal";
import CancelAppointmentModal from "../components/CancelAppointmentModal";
import RescheduleAppointmentModal from "../components/RescheduleAppointmentModal";

const TEST_HOSPITAL_ADMIN_EMAIL = "cityhospital@medqueue.ai";
const APPOINTMENT_TYPES = ["Consultation", "Follow-up", "Surgery", "Telemedicine"];

const startOfDay = (dateValue) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getWeekBounds = (dateValue = new Date()) => {
  const reference = startOfDay(dateValue);
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(reference);
  start.setDate(reference.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
};

const isSameDay = (left, right) => startOfDay(left).getTime() === startOfDay(right).getTime();

const isWithinWeek = (dateValue, weekStart, weekEnd) => {
  const date = startOfDay(dateValue);
  return date >= weekStart && date < weekEnd;
};

const formatAppointmentType = (appointment) => {
  if (appointment.appointmentType) {
    return appointment.appointmentType;
  }

  switch (appointment.bookingSource) {
    case "voice_call":
      return "Telemedicine";
    case "reschedule":
      return "Follow-up";
    default:
      return "Consultation";
  }
};

const formatAppointmentNotes = (appointment) => {
  if (appointment.notes) {
    return appointment.notes;
  }

  if (appointment.triageData?.preVisitSummary) {
    return appointment.triageData.preVisitSummary;
  }

  if (appointment.triageData?.symptoms?.length) {
    return appointment.triageData.symptoms.join(", ");
  }

  return "--";
};

const formatAppointmentStatus = (status) => {
  switch (status) {
    case "in_progress":
    case "in_consultation":
      return "Ongoing";
    case "no_show":
      return "No Show";
    case "confirmed":
      return "Scheduled";
    default:
      return (status || "Booked")
        .replace("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
};

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "completed";
    case "booked":
    case "confirmed":
      return "scheduled";
    case "checked_in":
    case "in_progress":
    case "in_consultation":
      return "ongoing";
    case "cancelled":
    case "no_show":
      return "canceled";
    default:
      return "scheduled";
  }
};

const buildMockAppointments = () => {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);
  const thirdDay = new Date(today);
  thirdDay.setDate(today.getDate() + 3);

  return [
    {
      _id: "mock-appt-001",
      patientId: { name: "Rahul Verma", phone: "+911111111111" },
      patientCode: "#PT-2035-001",
      doctorName: "Dr. Rajesh Sharma",
      doctorSpecialty: "General Medicine",
      appointmentType: "Consultation",
      notes: "Chest pain check",
      date: today.toISOString(),
      slotTime: "08:30",
      slotEndTime: "09:00",
      status: "completed",
    },
    {
      _id: "mock-appt-002",
      patientId: { name: "Priya Singh", phone: "+912222222222" },
      patientCode: "#PT-2035-024",
      doctorName: "Dr. Priya Patel",
      doctorSpecialty: "Cardiology",
      appointmentType: "Follow-up",
      notes: "Post flu review",
      date: today.toISOString(),
      slotTime: "09:00",
      slotEndTime: "09:20",
      status: "completed",
    },
    {
      _id: "mock-appt-003",
      patientId: { name: "Amit Patel", phone: "+913333333333" },
      patientCode: "#PT-2035-053",
      doctorName: "Dr. Sneha Reddy",
      doctorSpecialty: "Pediatrics",
      appointmentType: "Consultation",
      notes: "Fever and cough",
      date: today.toISOString(),
      slotTime: "09:30",
      slotEndTime: "10:00",
      status: "in_progress",
    },
    {
      _id: "mock-appt-004",
      patientId: { name: "Neha Joshi", phone: "+914444444444" },
      patientCode: "#PT-2035-079",
      doctorName: "Dr. Amit Kumar",
      doctorSpecialty: "Orthopedics",
      appointmentType: "Surgery",
      notes: "Knee review and imaging",
      date: tomorrow.toISOString(),
      slotTime: "10:00",
      slotEndTime: "11:00",
      status: "booked",
    },
    {
      _id: "mock-appt-005",
      patientId: { name: "Karan Mehra", phone: "+915555555555" },
      patientCode: "#PT-2035-091",
      doctorName: "Dr. Kiran Mehta",
      doctorSpecialty: "Dermatology",
      appointmentType: "Telemedicine",
      notes: "Skin rash follow-up",
      date: dayAfterTomorrow.toISOString(),
      slotTime: "11:15",
      slotEndTime: "11:45",
      status: "confirmed",
    },
    {
      _id: "mock-appt-006",
      patientId: { name: "Sara Khan", phone: "+916666666666" },
      patientCode: "#PT-2035-129",
      doctorName: "Dr. Priya Patel",
      doctorSpecialty: "Cardiology",
      appointmentType: "Follow-up",
      notes: "ECG result discussion",
      date: thirdDay.toISOString(),
      slotTime: "13:00",
      slotEndTime: "13:20",
      status: "cancelled",
    },
  ];
};

const countAppointmentStats = (appointments) => {
  return appointments.reduce((accumulator, appointment) => {
    accumulator.total += 1;

    if (appointment.status === "completed") {
      accumulator.completed += 1;
    } else if (["checked_in", "in_consultation", "in_progress"].includes(appointment.status)) {
      accumulator.ongoing += 1;
    } else if (["cancelled", "no_show"].includes(appointment.status)) {
      accumulator.cancelled += 1;
    } else {
      accumulator.booked += 1;
    }

    return accumulator;
  }, {
    total: 0,
    completed: 0,
    ongoing: 0,
    cancelled: 0,
    booked: 0,
  });
};

const buildTypeBars = (typeSummary) => {
  const tones = ["dark", "teal", "soft", ""];
  const totalBars = 42;
  const totalAppointments = typeSummary.reduce((sum, item) => sum + item.count, 0);

  if (totalAppointments === 0) {
    return Array.from({ length: totalBars }, (_, index) => ({
      id: `empty-${index}`,
      tone: tones[index < 10 ? 0 : index < 20 ? 1 : index < 28 ? 2 : 3],
    }));
  }

  const rawCounts = typeSummary.map((item) => (item.count / totalAppointments) * totalBars);
  const baseCounts = rawCounts.map((value) => Math.floor(value));
  let remainder = totalBars - baseCounts.reduce((sum, value) => sum + value, 0);

  const remainders = rawCounts
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder);

  for (let pointer = 0; pointer < remainders.length && remainder > 0; pointer += 1) {
    baseCounts[remainders[pointer].index] += 1;
    remainder -= 1;
  }

  return baseCounts.flatMap((count, index) =>
    Array.from({ length: count }, (_, toneIndex) => ({
      id: `${typeSummary[index].label}-${toneIndex}`,
      tone: tones[index],
    }))
  );
};

function AppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("upcoming");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    fetchAppointments(true); // Show loading only on initial load
  }, [user]);

  const fetchAppointments = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        if (showLoading) setLoading(false);
        return;
      }

      const doctorsRes = await api.get(`/hospitals/${hospitalId}/doctors`);
      const doctors = doctorsRes.data.doctors || [];

      const appointmentGroups = await Promise.all(doctors.map(async (doc) => {
        try {
          const apptRes = await api.get(`/doctors/${doc._id}/appointments`);

          return (apptRes.data.appointments || []).map((appointment) => ({
            ...appointment,
            doctorName: doc.userId?.name || "Doctor",
            doctorSpecialty: doc.specialty,
            appointmentType: formatAppointmentType(appointment),
            notes: formatAppointmentNotes(appointment),
            patientCode: `#PT-${String(appointment._id?.slice(-6) || "000000").toUpperCase()}`,
          }));
        } catch (err) {
          console.log(`Could not fetch appointments for doctor ${doc._id}`);
          return [];
        }
      }));

      let allAppointments = appointmentGroups.flat();

      if (user?.email === TEST_HOSPITAL_ADMIN_EMAIL && allAppointments.length === 0) {
        allAppointments = buildMockAppointments();
      }

      allAppointments.sort((left, right) => {
        const dateDiff = new Date(left.date) - new Date(right.date);
        if (dateDiff !== 0) return dateDiff;
        return (left.slotTime || "").localeCompare(right.slotTime || "");
      });

      setAppointments(allAppointments);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const today = startOfDay(new Date());
  const { start: weekStart, end: weekEnd } = getWeekBounds(today);

  // Calculate month bounds
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const todayAppointments = appointments.filter((appointment) => isSameDay(appointment.date, today));
  const weeklyAppointments = appointments.filter((appointment) => isWithinWeek(appointment.date, weekStart, weekEnd));
  const monthlyAppointments = appointments.filter((appointment) => {
    const aptDate = new Date(appointment.date);
    return aptDate >= monthStart && aptDate <= monthEnd;
  });
  const upcomingAppointments = appointments.filter((appointment) => new Date(appointment.date) >= today);

  // Get filtered appointments based on global filter
  const getFilteredAppointments = () => {
    switch (dateFilter) {
      case "today":
        return todayAppointments;
      case "week":
        return weeklyAppointments;
      case "month":
        return monthlyAppointments;
      case "upcoming":
        return upcomingAppointments;
      case "all":
        return appointments;
      default:
        return upcomingAppointments;
    }
  };
  const filteredAppointments = getFilteredAppointments();

  // Stats based on filtered data
  const filteredStats = countAppointmentStats(filteredAppointments);

  // Build trend data based on filter
  const buildTrendData = () => {
    if (dateFilter === "today") {
      // For today, show hourly breakdown
      const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8 AM to 5 PM
      return hours.map((hour) => {
        const count = filteredAppointments.filter((apt) => {
          const slotHour = parseInt(apt.slotTime?.split(":")[0] || "0");
          return slotHour === hour;
        }).length;
        return {
          day: `${hour}:00`,
          label: `${hour}:00`,
          count,
        };
      });
    } else {
      // For other filters, show daily breakdown (last 7 days of data)
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const count = filteredAppointments.filter((appointment) => isSameDay(appointment.date, date)).length;
        return {
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          label: date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
          count,
          date,
        };
      });
    }
  };

  const trendData = buildTrendData();
  const maxTrendCount = Math.max(...trendData.map((item) => item.count), 1);
  const highlightedTrendIndex = trendData.findIndex((item) => item.count === maxTrendCount && item.count > 0);

  const typeSummary = APPOINTMENT_TYPES.map((label) => {
    const count = filteredAppointments.filter((appointment) => appointment.appointmentType === label).length;
    const percent = filteredStats.total > 0 ? Math.round((count / filteredStats.total) * 100) : 0;

    return {
      label,
      count,
      percent,
      note: `${count} Total Patients`,
    };
  });

  const typeBars = buildTypeBars(typeSummary);

  // Get filter label for display
  const getFilterLabel = () => {
    switch (dateFilter) {
      case "today": return "Today";
      case "week": return "This Week";
      case "month": return "This Month";
      case "upcoming": return "All Upcoming";
      case "all": return "All Time";
      default: return "All Upcoming";
    }
  };

  const overviewCards = [
    {
      label: "Total Appointments",
      value: String(filteredStats.total),
      delta: filteredStats.total > 0 ? `${filteredStats.booked} pending` : "0",
      note: `Showing ${getFilterLabel().toLowerCase()}`,
      icon: "TA",
      tone: "teal",
    },
    {
      label: "Completed",
      value: String(filteredStats.completed),
      delta: `${filteredStats.total > 0 ? `${((filteredStats.completed / filteredStats.total) * 100).toFixed(0)}%` : "0%"}`,
      note: `${Math.max(filteredStats.total - filteredStats.completed, 0)} remaining`,
      icon: "CP",
      tone: "green",
    },
    {
      label: "Ongoing",
      value: String(filteredStats.ongoing),
      delta: filteredStats.ongoing > 0 ? "In progress" : "None",
      note: `Active consultations`,
      icon: "OG",
      tone: "teal",
    },
    {
      label: "Canceled",
      value: String(filteredStats.cancelled),
      delta: `${filteredStats.total > 0 ? `${((filteredStats.cancelled / filteredStats.total) * 100).toFixed(0)}%` : "0%"}`,
      note: `Includes no-shows`,
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

  const handleAppointmentAdded = (newAppointment) => {
    if (newAppointment) {
      // Optimistic update - add new appointment to state directly
      const formattedAppointment = {
        ...newAppointment,
        doctorName: newAppointment.doctorId?.userId?.name || newAppointment.doctorName || "Doctor",
        doctorSpecialty: newAppointment.doctorId?.specialty || newAppointment.doctorSpecialty || "",
        appointmentType: formatAppointmentType(newAppointment),
        notes: formatAppointmentNotes(newAppointment),
        patientCode: `#PT-${String(newAppointment._id?.slice(-6) || "000000").toUpperCase()}`,
      };

      setAppointments(prev => {
        const updated = [...prev, formattedAppointment];
        // Sort by date and time
        updated.sort((left, right) => {
          const dateDiff = new Date(left.date) - new Date(right.date);
          if (dateDiff !== 0) return dateDiff;
          return (left.slotTime || "").localeCompare(right.slotTime || "");
        });
        return updated;
      });
    }
    // Also refresh in background to ensure data consistency
    fetchAppointments(false);
  };

  const handleCancelClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleRescheduleClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  const handleCancelSuccess = () => {
    // Optimistic update - mark appointment as cancelled in state
    if (selectedAppointment) {
      setAppointments(prev =>
        prev.map(apt =>
          apt._id === selectedAppointment._id
            ? { ...apt, status: "cancelled" }
            : apt
        )
      );
    }
    // Refresh in background
    fetchAppointments(false);
  };

  const handleRescheduleSuccess = () => {
    // Optimistic update - mark old appointment as rescheduled
    if (selectedAppointment) {
      setAppointments(prev =>
        prev.map(apt =>
          apt._id === selectedAppointment._id
            ? { ...apt, status: "rescheduled" }
            : apt
        )
      );
    }
    // Refresh in background to get the new appointment
    fetchAppointments(false);
  };

  // Check if appointment can be cancelled/rescheduled
  const canModifyAppointment = (appointment) => {
    const status = appointment.status?.toLowerCase();
    return !["completed", "cancelled", "no_show", "rescheduled"].includes(status);
  };

  return (
    <AppLayout title="Appointments" subtitle="Manage clinical schedules">
      <main className="appointments-page">
        {/* Page Header with Filter and Add Button */}
        <div className="page-actions">
          <div className="page-filter">
            <label>Show:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="global-filter-select"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="upcoming">All Upcoming</option>
              <option value="all">All Appointments</option>
            </select>
          </div>
          <button
            className="btn-add-appointment"
            onClick={() => setShowAddModal(true)}
          >
            <span>+</span> Add Appointment
          </button>
        </div>
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
                <button className="panel-more" type="button" aria-label={`${card.label} options`}>
                  ...
                </button>
              </div>
              <div className="appointment-card__body">
                <strong>{card.value}</strong>
                <span className="appointment-card__delta">{card.delta}</span>
              </div>
              <p>{card.note}</p>
            </article>
          ))}
        </section>

        <section className="appointments-grid">
          <article className="panel appointment-trends-card">
            <div className="panel-header">
              <div>
                <h2>Appointment Trends</h2>
                <p>{getFilterLabel()}</p>
              </div>
              <span className="trend-badge">{filteredStats.total} Total</span>
            </div>

            <div className="appointment-trends-summary">
              <strong className="appointment-trends-total">{filteredStats.total}</strong>
            </div>

            <div className="appointment-trends-chart">
              <div className="appointment-axis">
                {[maxTrendCount, Math.round(maxTrendCount * 0.75), Math.round(maxTrendCount * 0.5), Math.round(maxTrendCount * 0.25), 0].map((value, index) => (
                  <span key={`${value}-${index}`}>{value}</span>
                ))}
              </div>

              {trendData.map((item) => (
                <div className="appointment-trends-bar" key={item.label}>
                  <div className="appointment-tooltip">
                    <strong>{item.label}</strong>
                    <span>{item.count} Appointment{item.count !== 1 ? 's' : ''}</span>
                  </div>
                  <span
                    className="appointment-trends-bar__fill"
                    style={{ height: `${Math.max(22, Math.round((item.count / maxTrendCount) * 106))}px` }}
                  />
                  <small>{item.day}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="panel appointment-type-card">
            <div className="panel-header">
              <div>
                <h2>Appointment Type</h2>
              </div>
              <span className="appointment-card__icon" aria-hidden="true">●</span>
            </div>

            <div className="appointment-type-summary">
              {typeSummary.map((item, index) => (
                <article
                  className={`appointment-type-item appointment-type-item--${['dark', 'teal', 'soft', 'light'][index]}`}
                  key={item.label}
                >
                  <div className="appointment-type-item__indicator" />
                  <strong>{item.label}</strong>
                  <span className="appointment-type-item__percent">{item.percent}%</span>
                  <small>{item.note}</small>
                </article>
              ))}
            </div>

            <div className="appointment-type-bars">
              {typeBars.map((bar) => {
                const typeName = bar.id.split('-')[0];
                return (
                  <div
                    key={bar.id}
                    className={`appointment-type-bar${bar.tone ? ` appointment-type-bar--${bar.tone}` : ""}`}
                  >
                    <span className="appointment-type-bar__tooltip">{typeName}</span>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="panel appointment-table-card">
          <div className="appointment-table-header">
            <div>
              <h2>Appointments</h2>
              <p>{filteredAppointments.length} appointments - {getFilterLabel()}</p>
            </div>
          </div>

          <div className="table-wrap">
            {filteredAppointments.length > 0 ? (
              <table className="appointment-table">
                <thead>
                  <tr>
                    <th />
                    <th>Name</th>
                    <th>Phone Number</th>
                    <th>Doctor</th>
                    <th>Appointment Type</th>
                    <th>Notes</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment._id}>
                      <td>
                        <span className="table-check" aria-hidden="true" />
                      </td>
                      <td>
                        <div
                          className="table-person table-person-clickable"
                          onClick={() => {
                            const patientId = appointment.patientId?._id || appointment.patientId;
                            if (patientId) {
                              navigate(`/patients/${patientId}`);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <span className="table-avatar">
                            {(appointment.patientId?.name || "P").split(" ").map((part) => part[0]).join("").slice(0, 2)}
                          </span>
                          <div>
                            <strong style={{ color: "#0d9488" }}>{appointment.patientId?.name || "Patient"}</strong>
                            <p>{appointment.patientCode || "#PT-000000"}</p>
                          </div>
                        </div>
                      </td>
                      <td>{appointment.patientId?.phone || "--"}</td>
                      <td>
                        <div className="table-meta">
                          <strong>{appointment.doctorName}</strong>
                          <p>{appointment.doctorSpecialty}</p>
                        </div>
                      </td>
                      <td>{appointment.appointmentType}</td>
                      <td>{appointment.notes}</td>
                      <td>
                        <div className="table-meta">
                          <strong>{new Date(appointment.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}</strong>
                          <p>{appointment.slotEndTime ? `${appointment.slotTime} - ${appointment.slotEndTime}` : appointment.slotTime}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-${getStatusClass(appointment.status)}`}>
                          {formatAppointmentStatus(appointment.status)}
                        </span>
                      </td>
                      <td>
                        {canModifyAppointment(appointment) ? (
                          <div className="action-buttons">
                            <button
                              className="btn-action btn-action-reschedule"
                              onClick={() => handleRescheduleClick(appointment)}
                              title="Reschedule"
                            >
                              Reschedule
                            </button>
                            <button
                              className="btn-action btn-action-cancel"
                              onClick={() => handleCancelClick(appointment)}
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="action-disabled">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No appointments found for {getFilterLabel().toLowerCase()}</p>
                <button
                  className="btn-add-appointment"
                  onClick={() => setShowAddModal(true)}
                  style={{ marginTop: '1rem' }}
                >
                  <span>+</span> Add Appointment
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Add Appointment Modal */}
        <AddAppointmentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAppointmentAdded}
          hospitalId={user?.hospitalId?._id || user?.hospitalId}
        />

        {/* Cancel Appointment Modal */}
        <CancelAppointmentModal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleCancelSuccess}
          appointment={selectedAppointment}
        />

        {/* Reschedule Appointment Modal */}
        <RescheduleAppointmentModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleRescheduleSuccess}
          appointment={selectedAppointment}
        />
      </main>
    </AppLayout>
  );
}

export default AppointmentsPage;
