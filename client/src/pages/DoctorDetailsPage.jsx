import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import MediFlowDataTable from "../components/DataTable";
import api, { resolveMediaUrl } from "../services/api";

function DoctorDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const doctorId = searchParams.get("id");

  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [patientSearch, setPatientSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");

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

  const filteredAppointments = useMemo(() => {
    const searchValue = patientSearch.trim().toLowerCase();

    const matchesSearch = appointments.filter((appointment) => {
      if (!searchValue) return true;

      const patientName = appointment.patientId?.name || "";
      const patientPhone = appointment.patientId?.phone || "";
      const appointmentType = appointment.appointmentType || "Consultation";

      return [patientName, patientPhone, appointmentType].some((value) =>
        value.toLowerCase().includes(searchValue),
      );
    });

    return [...matchesSearch].sort((left, right) => {
      const leftDate = new Date(left.date).getTime();
      const rightDate = new Date(right.date).getTime();

      return sortOrder === "latest" ? rightDate - leftDate : leftDate - rightDate;
    });
  }, [appointments, patientSearch, sortOrder]);

  const patientTableColumns = useMemo(
    () => [
      {
        name: "Name",
        selector: (row) => row.patientId?.name || "Patient",
        sortable: true,
        cell: (row) => (
          <div className="table-user-cell">
            <span className="table-avatar">{getInitials(row.patientId?.name)}</span>
            <div className="table-user-info">
              <span className="table-user-name">{row.patientId?.name || "Patient"}</span>
              <span className="table-user-email">{row.patientId?.phone || "--"}</span>
            </div>
          </div>
        ),
      },
      {
        name: "Appointment Date",
        selector: (row) => new Date(row.date).getTime(),
        sortable: true,
        cell: (row) => formatDate(row.date),
      },
      {
        name: "Time",
        selector: (row) => row.slotTime || "--",
        sortable: true,
      },
      {
        name: "Type",
        selector: (row) => row.appointmentType || "Consultation",
        sortable: true,
      },
      {
        name: "Status",
        selector: (row) => row.status || "scheduled",
        sortable: true,
        cell: (row) => (
          <span className={`status-pill patient-status patient-status--${getStatusClass(row.status)}`}>
            {getStatusLabel(row.status)}
          </span>
        ),
      },
    ],
    [],
  );

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
                <div className="doctor-profile-photo">
                  {doctor.profilePhoto ? (
                    <img src={resolveMediaUrl(doctor.profilePhoto)} alt={doctorName} className="doctor-profile-photo__image" />
                  ) : (
                    getInitials(doctorName)
                  )}
                </div>
                <div className="doctor-profile-summary">
                  <strong>{doctorName}</strong>
                  <span>{doctorCode}</span>
                  <div className="doctor-profile-meta">
                    <div>
                      <small>Department</small>
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
                  <div>
                    <small>License Number</small>
                    <strong>{doctor.registrationNumber || "--"}</strong>
                  </div>
                  <div>
                    <small>License Expiry</small>
                    <strong>{doctor.licenseExpiry ? new Date(doctor.licenseExpiry).toLocaleDateString() : "--"}</strong>
                  </div>
                </div>
                {doctor.certifications?.length > 0 && (
                  <div className="doctor-certifications">
                    <small>Certifications</small>
                    <div className="doctor-certifications__list">
                      {doctor.certifications.map((cert, index) => (
                        <a key={cert.url || `${cert.name}-${index}`} href={resolveMediaUrl(cert.url)} target="_blank" rel="noreferrer">
                          {cert.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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
                  <label className="datatable-search doctor-search">
                    <Search size={18} className="search-icon" />
                    <input
                      className="search-input"
                      type="search"
                      placeholder="Search patients"
                      value={patientSearch}
                      onChange={(event) => setPatientSearch(event.target.value)}
                    />
                  </label>
                  <button
                    className="doctor-action ghost"
                    type="button"
                    onClick={() => setSortOrder((currentValue) => (currentValue === "latest" ? "oldest" : "latest"))}
                  >
                    Sort by: {sortOrder === "latest" ? "Latest" : "Oldest"}
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <MediFlowDataTable
                  className="doctor-patients-datatable"
                  columns={patientTableColumns}
                  data={filteredAppointments.slice(0, 10)}
                  loading={false}
                  searchable={false}
                  pagination={false}
                  noDataMessage="No appointments found for this doctor"
                  onRowClicked={(row) => {
                    const patientId = row.patientId?._id || row.patientId;
                    if (patientId) {
                      navigate(`/patients/${patientId}`);
                    }
                  }}
                />
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
