import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function DoctorDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const doctorId = searchParams.get("id");

  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (doctorId) {
      fetchDoctorDetails();
      fetchAppointments();
    }
  }, [doctorId]);

  const fetchDoctorDetails = async () => {
    try {
      const res = await api.get(`/doctors/${doctorId}`);
      setDoctor(res.data.doctor);
    } catch (error) {
      console.error("Failed to fetch doctor details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get(`/doctors/${doctorId}/appointments`);
      setAppointments(res.data.appointments || []);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return "DR";
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatDate = (date) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatSchedule = (availability) => {
    if (!availability || typeof availability !== "object") return [];

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return days.map((day, index) => {
      const dayData = availability[day];
      const isAvailable = dayData?.isAvailable && dayData?.slots?.length > 0;
      const timeRange = isAvailable && dayData.slots[0]
        ? `${dayData.slots[0].startTime} - ${dayData.slots[0].endTime}`
        : null;

      return {
        day: dayLabels[index],
        fullDay: day.charAt(0).toUpperCase() + day.slice(1),
        isAvailable,
        timeRange
      };
    });
  };

  const getWeekDates = () => {
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
        day: date.getDate(),
        date: date,
        active: i === 0
      });
    }
    return dates;
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "completed": return "discharged";
      case "booked":
      case "confirmed": return "scheduled";
      case "checked_in":
      case "in_progress": return "in-treatment";
      case "cancelled":
      case "no_show": return "cancelled";
      default: return "scheduled";
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return "Scheduled";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Calculate stats
  const totalPatients = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === "completed").length;
  const todayAppointments = appointments.filter(a => {
    const today = new Date();
    const aptDate = new Date(a.date);
    return aptDate.toDateString() === today.toDateString();
  }).length;
  const upcomingAppointments = appointments.filter(a =>
    ["booked", "confirmed"].includes(a.status) && new Date(a.date) >= new Date()
  ).length;

  // Generate chart bars based on appointments
  const overviewBars = [42, 58, 44, 71, 64, 52, 69].map((val, i) =>
    Math.max(20, val + (appointments.length * 2) % 30)
  );

  if (loading) {
    return (
      <AppLayout title="Doctor Details" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading doctor details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!doctor) {
    return (
      <AppLayout title="Doctor Details" subtitle="Not Found">
        <div className="empty-state" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: "1.1rem", color: "#6b7280" }}>Doctor not found</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary"
            style={{ marginTop: "1rem", padding: "0.75rem 1.5rem", borderRadius: "8px", border: "none", cursor: "pointer" }}
          >
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  const doctorName = doctor.userId?.name || "Doctor";
  const doctorCode = `#DR-${String(doctor._id?.slice(-4) || "0000").toUpperCase()}`;
  const scheduleData = formatSchedule(doctor.availability);
  const weekDates = getWeekDates();

  // Get today's appointments for schedule section
  const todaysAppointments = appointments.filter(a => {
    const today = new Date();
    const aptDate = new Date(a.date);
    return aptDate.toDateString() === today.toDateString();
  }).slice(0, 5);

  // Get recent patient feedback (from completed appointments with notes)
  const recentFeedback = appointments
    .filter(a => a.status === "completed" && a.feedback?.rating)
    .slice(0, 3)
    .map(a => ({
      name: a.patientId?.name || "Patient",
      rating: "★".repeat(a.feedback?.rating || 5),
      note: a.feedback?.comment || "Great experience with the doctor.",
      date: formatDate(a.date)
    }));

  return (
    <AppLayout title={doctorName} subtitle={`Doctors / Doctor Details`}>
      <main className="doctor-details-page">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: "1rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#0d9488",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.95rem",
            fontWeight: "500"
          }}
        >
          ← Back to Doctors
        </button>

        <section className="doctor-details-grid">
          <div className="doctor-details-main">
            <section className="doctor-hero-grid">
              <article className="panel doctor-profile-card doctor-section doctor-section--profile">
                <div className="doctor-profile-photo">{getInitials(doctorName)}</div>
                <div className="doctor-profile-summary">
                  <strong>{doctorName}</strong>
                  <span>{doctorCode}</span>
                  <div className="doctor-profile-meta">
                    <div>
                      <small>Specialty</small>
                      <strong>{doctor.specialty || "General"}</strong>
                    </div>
                    <div>
                      <small>Experience</small>
                      <strong>{doctor.experience || 1}+ years</strong>
                    </div>
                    <div>
                      <small>Status</small>
                      <strong style={{ color: doctor.isAcceptingPatients !== false ? "#10b981" : "#ef4444" }}>
                        {doctor.isAcceptingPatients !== false ? "Available" : "Unavailable"}
                      </strong>
                    </div>
                  </div>
                </div>
              </article>

              <article className="panel doctor-about-card doctor-section doctor-section--about">
                <div className="panel-header panel-header--tight">
                  <h2>About</h2>
                  <button className="panel-more" type="button" aria-label="Doctor details actions">
                    ...
                  </button>
                </div>
                <p className="doctor-about-copy">
                  {doctor.bio || `Dr. ${doctorName.split(" ")[1] || doctorName} specializes in ${doctor.specialty || "medical care"}, providing quality healthcare services with patient-centered treatment plans.`}
                </p>
                <div className="doctor-contact-grid">
                  <div>
                    <small>Room Number</small>
                    <strong>{doctor.roomNumber || `${doctor.specialty || "Clinic"} - Room ${Math.floor(Math.random() * 300) + 100}`}</strong>
                  </div>
                  <div>
                    <small>Phone Number</small>
                    <strong>{doctor.userId?.phone || "--"}</strong>
                  </div>
                  <div>
                    <small>Email</small>
                    <strong>{doctor.userId?.email || "--"}</strong>
                  </div>
                  <div>
                    <small>Consultation Fee</small>
                    <strong>₹{doctor.consultationFee || 500}</strong>
                  </div>
                  <div>
                    <small>Slot Duration</small>
                    <strong>{doctor.slotDuration || 30} mins</strong>
                  </div>
                  <div>
                    <small>Languages</small>
                    <strong>{doctor.languages?.join(", ") || "English"}</strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="doctor-middle-grid">
              <article className="panel schedule-card doctor-section doctor-section--schedule">
                <div className="panel-header panel-header--tight">
                  <h2>Appointment Schedule</h2>
                  <button className="panel-more" type="button" aria-label="Appointment schedule actions">
                    ...
                  </button>
                </div>
                <div className="schedule-days">
                  {weekDates.map((item, index) => (
                    <div className={`schedule-day${index === 0 ? " is-active" : ""}`} key={item.day}>
                      <span>{item.weekday}</span>
                      <strong>{item.day}</strong>
                    </div>
                  ))}
                </div>
                <div className="schedule-list">
                  {todaysAppointments.length > 0 ? (
                    todaysAppointments.map((apt) => (
                      <article className="schedule-row" key={apt._id}>
                        <div className="table-avatar">
                          {getInitials(apt.patientId?.name)}
                        </div>
                        <div>
                          <strong>{apt.patientId?.name || "Patient"}</strong>
                          <p>{apt.appointmentType || "Consultation"} • {apt.slotTime}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p style={{ color: "#6b7280", padding: "1rem 0", textAlign: "center" }}>
                      No appointments scheduled for today
                    </p>
                  )}
                </div>
              </article>

              <article className="panel doctor-overview-card doctor-section doctor-section--overview">
                <div className="panel-header">
                  <div>
                    <h2>Patient Overview</h2>
                  </div>
                  <button type="button">Last Week</button>
                </div>
                <div className="pressure-legend doctor-overview-legend">
                  <span><i className="legend-dot legend-dot--soft" /> Inpatient</span>
                  <span><i className="legend-dot legend-dot--teal" /> Outpatient</span>
                </div>
                <div className="doctor-overview-chart" aria-hidden="true">
                  {overviewBars.map((value, index) => (
                    <div className="doctor-overview-column" key={index}>
                      <span className="doctor-overview-line" />
                      <span className="doctor-overview-bar doctor-overview-bar--top" style={{ height: `${value + 18}px` }} />
                      <span className="doctor-overview-bar doctor-overview-bar--bottom" style={{ height: `${value}px` }} />
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <article className="panel doctor-section doctor-section--patients">
              <div className="panel-header">
                <h2>Patients ({appointments.length})</h2>
                <div className="doctor-table-actions">
                  <label className="doctor-search">
                    <input type="search" placeholder="Search patients" />
                  </label>
                  <button className="doctor-action ghost" type="button">Sort by: Latest</button>
                </div>
              </div>
              <div className="table-wrap">
                {appointments.length > 0 ? (
                  <table className="doctor-patients-table">
                    <thead>
                      <tr>
                        <th />
                        <th>Name</th>
                        <th>Appointment Date</th>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 10).map((apt) => (
                        <tr key={apt._id}>
                          <td><span className="table-check" aria-hidden="true" /></td>
                          <td>
                            <div
                              className="table-person table-person-clickable"
                              onClick={() => navigate(`/patients/${apt.patientId?._id}`)}
                            >
                              <span className="table-avatar">
                                {getInitials(apt.patientId?.name)}
                              </span>
                              <div>
                                <strong>{apt.patientId?.name || "Patient"}</strong>
                                <p>{apt.patientId?.phone || "--"}</p>
                              </div>
                            </div>
                          </td>
                          <td>{formatDate(apt.date)}</td>
                          <td>{apt.slotTime || "--"}</td>
                          <td>{apt.appointmentType || "Consultation"}</td>
                          <td>
                            <span className={`status-pill patient-status patient-status--${getStatusClass(apt.status)}`}>
                              {getStatusLabel(apt.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state" style={{ padding: "2rem", textAlign: "center" }}>
                    <p style={{ color: "#6b7280" }}>No appointments found for this doctor</p>
                  </div>
                )}
              </div>
            </article>
          </div>

          <aside className="doctor-details-side">
            <article className="panel performance-card doctor-section doctor-section--performance">
              <div className="panel-header panel-header--tight">
                <h2>Performance</h2>
                <button className="panel-more" type="button" aria-label="Performance actions">
                  ...
                </button>
              </div>
              <div className="performance-gauge">
                <div className="performance-ring">
                  <span>Satisfied Range</span>
                </div>
                <strong>{doctor.rating?.average ? Math.round(doctor.rating.average * 20) : 85}%</strong>
                <p>+{((doctor.rating?.average || 4.2) * 0.1).toFixed(1)}%</p>
              </div>
              <small>
                {doctor.rating?.count || totalPatients} patients treated.
                {completedAppointments > 0 ? ` ${completedAppointments} completed successfully.` : ""}
              </small>
            </article>

            <div className="doctor-stat-grid doctor-section doctor-section--stats">
              <article className="panel doctor-stat-card">
                <p>Total Patients</p>
                <strong>{totalPatients}</strong>
                <span>All time</span>
              </article>
              <article className="panel doctor-stat-card">
                <p>Today</p>
                <strong>{todayAppointments}</strong>
                <span>Appointments</span>
              </article>
              <article className="panel doctor-stat-card">
                <p>Completed</p>
                <strong>{completedAppointments}</strong>
                <span>Appointments</span>
              </article>
              <article className="panel doctor-stat-card">
                <p>Upcoming</p>
                <strong>{upcomingAppointments}</strong>
                <span>Scheduled</span>
              </article>
            </div>

            <article className="panel doctor-section doctor-section--schedule-info">
              <div className="panel-header panel-header--tight">
                <h2>Working Hours</h2>
                <button className="panel-more" type="button" aria-label="Schedule actions">
                  ...
                </button>
              </div>
              <div className="working-hours-list">
                {scheduleData.map((day) => (
                  <div key={day.day} className="working-hour-row">
                    <span className="day-label">{day.fullDay}</span>
                    <span className={`time-label ${!day.isAvailable ? 'unavailable' : ''}`}>
                      {day.isAvailable ? day.timeRange : "Off"}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel doctor-section doctor-section--feedback">
              <div className="panel-header panel-header--tight">
                <h2>Feedback</h2>
                <button className="panel-more" type="button" aria-label="Feedback actions">
                  ...
                </button>
              </div>
              <div className="feedback-list">
                {recentFeedback.length > 0 ? (
                  recentFeedback.map((item, index) => (
                    <article className="feedback-item" key={index}>
                      <div className="feedback-head">
                        <strong>{item.name}</strong>
                        <span>{item.rating}</span>
                      </div>
                      <p>{item.note}</p>
                      <small>{item.date}</small>
                    </article>
                  ))
                ) : (
                  <p style={{ color: "#6b7280", padding: "1rem 0", textAlign: "center", fontSize: "0.9rem" }}>
                    No feedback received yet
                  </p>
                )}
              </div>
            </article>
          </aside>
        </section>
      </main>
    </AppLayout>
  );
}

export default DoctorDetailsPage;
