import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import MediFlowDataTable from "../components/DataTable";
import MetricCard from "../components/MetricCard";
import NoShowRiskCard from "../components/NoShowRiskCard";
import DoctorAlertsPanel from "../components/DoctorAlertsPanel";
import AppLayout from "../layouts/AppLayout";
import { useAuth, useHospitalSettings } from "../hooks";
import api from "../services/api";

const TEST_HOSPITAL_ADMIN_EMAIL = "cityhospital@mediflow.ai";
const DEPARTMENT_BULLET_TONES = ["dark", "light", "aqua", "soft", "muted", "pale"];
const CALENDAR_DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const startOfDay = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isSameDay = (left, right) => startOfDay(left).getTime() === startOfDay(right).getTime();

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

const getInitials = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getAppointmentDateTime = (appointment) => {
  const date = startOfDay(appointment?.date || new Date());

  if (typeof appointment?.slotTime === "string") {
    const [hoursText = "0", minutesText = "0"] = appointment.slotTime.split(":");
    const hours = Number.parseInt(hoursText, 10);
    const minutes = Number.parseInt(minutesText, 10);

    date.setHours(Number.isNaN(hours) ? 0 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  }

  return date;
};

const compareAppointmentsAsc = (left, right) => getAppointmentDateTime(left) - getAppointmentDateTime(right);
const compareAppointmentsDesc = (left, right) => getAppointmentDateTime(right) - getAppointmentDateTime(left);

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

const formatAppointmentStatus = (status) => {
  switch (status) {
    case "in_progress":
    case "in_consultation":
      return "Ongoing";
    case "no_show":
      return "No Show";
    case "checked_in":
      return "Checked In";
    default:
      return (status || "Booked")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
  }
};

const getStatusClass = (status) => {
  switch ((status || "").toLowerCase()) {
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
    case "available":
      return "available";
    case "busy":
      return "busy";
    case "offline":
    case "unavailable":
      return "offline";
    default:
      return "scheduled";
  }
};

const countAppointmentStats = (appointments) =>
  appointments.reduce(
    (totals, appointment) => {
      totals.total += 1;

      if (appointment.status === "completed") {
        totals.completed += 1;
      } else if (["checked_in", "in_consultation", "in_progress"].includes(appointment.status)) {
        totals.ongoing += 1;
      } else if (["cancelled", "no_show"].includes(appointment.status)) {
        totals.cancelled += 1;
      } else {
        totals.scheduled += 1;
      }

      return totals;
    },
    {
      total: 0,
      completed: 0,
      ongoing: 0,
      cancelled: 0,
      scheduled: 0,
    },
  );

const buildMockDashboardAppointments = (doctors = [], appointmentTypes = []) => {
  const fallbackDoctors = [
    { doctorName: "Dr. Rajesh Sharma", doctorSpecialty: "General Medicine" },
    { doctorName: "Dr. Priya Patel", doctorSpecialty: "Cardiology" },
    { doctorName: "Dr. Amit Kumar", doctorSpecialty: "Orthopedics" },
    { doctorName: "Dr. Sneha Reddy", doctorSpecialty: "Pediatrics" },
    { doctorName: "Dr. Kiran Mehta", doctorSpecialty: "Dermatology" },
  ];

  const doctorPool = doctors.length
    ? doctors.map((doctor) => ({
        doctorName: doctor.name || "Doctor",
        doctorSpecialty: doctor.specialty || "General Medicine",
      }))
    : fallbackDoctors;
  const configuredTypes = appointmentTypes.length ? appointmentTypes : ["Consultation"];
  const getType = (index) => configuredTypes[index % configuredTypes.length];

  const pickDoctor = (index) => doctorPool[index % doctorPool.length];
  const today = startOfDay(new Date());
  const appointmentDate = (dayOffset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    return date.toISOString();
  };

  return [
    {
      _id: "dashboard-mock-001",
      patientId: { name: "Alicia Perth", phone: "+62 813-456-7102" },
      patientCode: "#PT-2035-001",
      ...pickDoctor(0),
      appointmentType: getType(0),
      date: appointmentDate(0),
      slotTime: "08:30",
      status: "completed",
    },
    {
      _id: "dashboard-mock-002",
      patientId: { name: "Bima Kurnia", phone: "+62 813-2256-8941" },
      patientCode: "#PT-2035-024",
      ...pickDoctor(1),
      appointmentType: getType(1),
      date: appointmentDate(0),
      slotTime: "09:00",
      status: "completed",
    },
    {
      _id: "dashboard-mock-003",
      patientId: { name: "Clara Wright", phone: "+62 811-6677-2043" },
      patientCode: "#PT-2035-053",
      ...pickDoctor(2),
      appointmentType: getType(2),
      date: appointmentDate(0),
      slotTime: "09:30",
      status: "in_progress",
    },
    {
      _id: "dashboard-mock-004",
      patientId: { name: "Daniel Evans", phone: "+62 812-7711-9910" },
      patientCode: "#PT-2035-088",
      ...pickDoctor(3),
      appointmentType: getType(3),
      date: appointmentDate(1),
      slotTime: "10:00",
      status: "booked",
    },
    {
      _id: "dashboard-mock-005",
      patientId: { name: "Emma Brooks", phone: "+62 812-9088-1112" },
      patientCode: "#PT-2035-101",
      ...pickDoctor(4),
      appointmentType: getType(4),
      date: appointmentDate(2),
      slotTime: "11:15",
      status: "confirmed",
    },
    {
      _id: "dashboard-mock-006",
      patientId: { name: "Farhan Malik", phone: "+62 813-1045-5634" },
      patientCode: "#PT-2035-132",
      ...pickDoctor(1),
      appointmentType: getType(5),
      date: appointmentDate(3),
      slotTime: "13:00",
      status: "cancelled",
    },
  ];
};

const buildCalendarDays = (dateValue = new Date()) => {
  const current = new Date(dateValue);
  const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
  const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  const leadingSpaces = firstDay.getDay();
  const totalSlots = Math.ceil((leadingSpaces + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: totalSlots }, (_, index) => {
    const dayNumber = index - leadingSpaces + 1;
    return dayNumber > 0 && dayNumber <= lastDay.getDate() ? dayNumber : "";
  });
};

function DashboardPage() {
  const { user } = useAuth();
  const { appointmentTypes } = useHospitalSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    ongoing: 0,
    totalDoctors: 0,
    avgWaitTime: 0,
  });
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const dashboardTableColumns = useMemo(
    () => [
      {
        name: "Name",
        selector: (row) => row.patientId?.name || "Patient",
        sortable: true,
        cell: (row) => (
          <div className="table-user-cell">
            <span className="table-avatar">{getInitials(row.patientId?.name || "Patient")}</span>
            <div className="table-user-info">
              <span className="table-user-name">{row.patientId?.name || "Patient"}</span>
              <span className="table-user-email">{row.patientCode || row.patientId?.phone || "--"}</span>
            </div>
          </div>
        ),
      },
      {
        name: "Doctor / Department",
        selector: (row) => row.doctorName || "Doctor",
        sortable: true,
        cell: (row) => (
          <div className="table-user-info">
            <span className="table-user-name">{row.doctorName || "Doctor"}</span>
            <span className="table-user-email">{row.doctorSpecialty || "--"}</span>
          </div>
        ),
      },
      {
        name: "Appointment Type",
        selector: (row) => formatAppointmentType(row),
        sortable: true,
      },
      {
        name: "Date & Time",
        selector: (row) => getAppointmentDateTime(row).getTime(),
        sortable: true,
        cell: (row) => (
          <div className="table-user-info">
            <span className="table-user-name">
              {getAppointmentDateTime(row).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="table-user-email">{row.slotTime || "--"}</span>
          </div>
        ),
      },
      {
        name: "Status",
        selector: (row) => row.status,
        sortable: true,
        cell: (row) => (
          <span className={`status-pill status-${getStatusClass(row.status)}`}>
            {formatAppointmentStatus(row.status)}
          </span>
        ),
      },
    ],
    [],
  );

  useEffect(() => {
    if (user?.role === "doctor") {
      navigate("/doctor/dashboard");
      return;
    }

    if (user?.role === "hospital_admin") {
      fetchHospitalAdminData();
    } else if (user?.role === "patient") {
      fetchPatientData();
    } else {
      setLoading(false);
    }
  }, [user, navigate, appointmentTypes]);

  const fetchHospitalAdminData = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
        return;
      }

      const [statsRes, doctorsRes, hospitalRes] = await Promise.all([
        api.get(`/hospitals/${hospitalId}/stats`),
        api.get("/doctors", { params: { hospitalId } }),
        api.get(`/hospitals/${hospitalId}`),
      ]);

      const doctorsList = doctorsRes.data.doctors || [];
      const hospital = hospitalRes.data.hospital || null;

      const doctorsWithStatus = doctorsList.map((doctor) => {
        let status = "Offline";

        if (doctor.currentQueueStatus === "paused") {
          status = "Busy";
        } else if (doctor.currentQueueStatus === "active" || doctor.isAcceptingPatients !== false) {
          status = "Available";
        }

        return {
          ...doctor,
          name: doctor.userId?.name || "Doctor",
          status,
        };
      });

      const appointmentResponses = await Promise.all(
        doctorsList.map((doctor) =>
          api.get(`/doctors/${doctor._id}/appointments`).catch(() => ({ data: { appointments: [] } })),
        ),
      );

      let hospitalAppointments = appointmentResponses
        .flatMap((response, index) =>
          (response.data.appointments || []).map((appointment) => ({
            ...appointment,
            doctorName: doctorsList[index]?.userId?.name || "Doctor",
            doctorSpecialty: doctorsList[index]?.specialty || "",
          })),
        )
        .sort(compareAppointmentsAsc);

      if (!hospitalAppointments.length && user?.email === TEST_HOSPITAL_ADMIN_EMAIL) {
        hospitalAppointments = buildMockDashboardAppointments(doctorsWithStatus, appointmentTypes).sort(compareAppointmentsAsc);
      }

      const todayAppointments = hospitalAppointments.filter((appointment) => isSameDay(appointment.date, new Date()));
      const todayStats = countAppointmentStats(todayAppointments);

      setStats({
        totalAppointments: todayStats.total,
        completed: todayStats.completed,
        pending: todayStats.scheduled + todayStats.ongoing,
        cancelled: todayStats.cancelled,
        ongoing: todayStats.ongoing,
        totalDoctors: statsRes.data.stats?.doctors || doctorsWithStatus.length,
        avgWaitTime: statsRes.data.stats?.avgWaitTime || hospital?.avgWaitTime || 0,
      });
      setDoctors(doctorsWithStatus);
      setAppointments(hospitalAppointments);
      setHospitalInfo(hospital);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      const response = await api.get("/appointments/my");
      setPatientAppointments(response.data.appointments || []);
    } catch (error) {
      console.error("Failed to fetch patient data:", error);
    } finally {
      setLoading(false);
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

  if (user?.role === "patient") {
    const upcomingAppointments = patientAppointments.filter(
      (appointment) =>
        appointment.status === "booked" ||
        appointment.status === "confirmed" ||
        appointment.status === "checked_in",
    );
    const completedAppointments = patientAppointments.filter((appointment) => appointment.status === "completed");

    return (
      <AppLayout title="Dashboard" subtitle={`Welcome back, ${user?.name || "Patient"}`}>
        <main className="patient-dashboard">
          <div className="patient-stats-grid">
            <div className="patient-stat-card">
              <div className="patient-stat-icon upcoming">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
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
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
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
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="patient-stat-info">
                <span className="patient-stat-value">{patientAppointments.length}</span>
                <span className="patient-stat-label">Total Appointments</span>
              </div>
            </div>
          </div>

          <div className="patient-actions-section">
            <h2>Quick Actions</h2>
            <div className="patient-actions-grid">
              <Link to="/book" className="patient-action-card primary">
                <div className="patient-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div className="patient-action-content">
                  <h3>Book Appointment</h3>
                  <p>Chat with AI to describe symptoms and book with the right doctor</p>
                </div>
                <svg className="patient-action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12,5 19,12 12,19" />
                </svg>
              </Link>

              <Link to="/my-appointments" className="patient-action-card">
                <div className="patient-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="patient-action-content">
                  <h3>My Appointments</h3>
                  <p>View and manage all your scheduled appointments</p>
                </div>
                <svg className="patient-action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12,5 19,12 12,19" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="patient-appointments-section">
            <div className="section-header">
              <h2>Upcoming Appointments</h2>
              <Link to="/my-appointments" className="view-all-link">
                View All
              </Link>
            </div>

            {upcomingAppointments.length > 0 ? (
              <div className="patient-appointments-list">
                {upcomingAppointments.slice(0, 3).map((appointment) => (
                  <div key={appointment._id} className="patient-appointment-card">
                    <div className="appt-date-badge">
                      <span className="appt-day">{new Date(appointment.date).getDate()}</span>
                      <span className="appt-month">
                        {new Date(appointment.date).toLocaleString("default", { month: "short" })}
                      </span>
                    </div>
                    <div className="appt-details">
                      <h4>{appointment.doctorId?.userId?.name || "Doctor"}</h4>
                      <p>{appointment.doctorId?.specialty || "Specialist"}</p>
                      <span className="appt-time">{appointment.slotTime}</span>
                    </div>
                    <span className={`status-pill status-${getStatusClass(appointment.status)}`}>
                      {appointment.status?.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="patient-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h3>No Upcoming Appointments</h3>
                <p>Book your first appointment with our AI assistant</p>
                <Link to="/book" className="btn-primary">
                  Book Now
                </Link>
              </div>
            )}
          </div>
        </main>
      </AppLayout>
    );
  }

  const now = new Date();
  const todayAppointments = appointments.filter((appointment) => isSameDay(appointment.date, now));
  const { start: weekStart, end: weekEnd } = getWeekBounds(now);
  const weekAppointments = appointments.filter((appointment) => {
    const appointmentDate = startOfDay(appointment.date);
    return appointmentDate >= weekStart && appointmentDate < weekEnd;
  });
  const upcomingAppointments = appointments
    .filter((appointment) => {
      const appointmentDateTime = getAppointmentDateTime(appointment);
      return appointmentDateTime >= now && !["completed", "cancelled", "no_show"].includes(appointment.status);
    })
    .sort(compareAppointmentsAsc);
  const recentAppointments = [...appointments].sort(compareAppointmentsDesc);
  const availableDoctors = doctors.filter((doctor) => doctor.status === "Available").length;
  const busyDoctors = doctors.filter((doctor) => doctor.status === "Busy").length;
  const offlineDoctors = doctors.length - availableDoctors - busyDoctors;
  const dashboardTableRows = (todayAppointments.length ? todayAppointments : weekAppointments).slice(0, 6);
  const appointmentsThisMonth = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    return (
      appointmentDate.getFullYear() === now.getFullYear() &&
      appointmentDate.getMonth() === now.getMonth()
    );
  });

  const weekSeries = Array.from({ length: 7 }, (_, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);

    const mockData = [[45, 30, 25], [38, 56, 17], [40, 25, 38], [55, 35, 20], [32, 48, 26], [48, 28, 42], [50, 40, 20]];

    return {
      day: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
      scheduled: mockData[index][0],
      inCare: mockData[index][1],
      total: mockData[index][2],
    };
  });

  const maxSeriesValue = 60;
  const getBarHeight = (value) => {
    return value > 0 ? Math.max(22, Math.round((value / maxSeriesValue) * 170)) : 12;
  };

  const departmentMap = doctors.reduce((collection, doctor) => {
    const specialty = doctor.specialty || "General Medicine";

    if (!collection.has(specialty)) {
      collection.set(specialty, { name: specialty, count: 0 });
    }

    collection.get(specialty).count += 1;
    return collection;
  }, new Map());

  if (hospitalInfo?.specialties?.length) {
    hospitalInfo.specialties.forEach((specialty) => {
      if (!departmentMap.has(specialty)) {
        departmentMap.set(specialty, { name: specialty, count: 0 });
      }
    });
  }

  const departmentItems = [...departmentMap.values()]
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 6)
    .map((department, index) => ({
      ...department,
      tone: DEPARTMENT_BULLET_TONES[index % DEPARTMENT_BULLET_TONES.length],
    }));

  const reportItems = [
    {
      title: hospitalInfo?.type ? `${hospitalInfo.type} hospital workspace is active` : "Hospital workspace is active",
      note: hospitalInfo?.email || "Administration",
    },
    {
      title: `${departmentMap.size} departments are configured`,
      note: `${availableDoctors} doctors available for booking`,
    },
    {
      title: stats.avgWaitTime ? `Average wait time is ${stats.avgWaitTime} min` : "Average wait time is not configured",
      note: `${stats.pending} appointments are pending today`,
    },
  ];

  const activityItems = recentAppointments.slice(0, 4).map((appointment) => {
    let tone = "teal";

    if (appointment.status === "completed") {
      tone = "green";
    } else if (["cancelled", "no_show"].includes(appointment.status)) {
      tone = "amber";
    } else if (["checked_in", "in_progress", "in_consultation"].includes(appointment.status)) {
      tone = "blue";
    }

    return {
      tone,
      title: `${formatAppointmentStatus(appointment.status)} appointment`,
      time: `${appointment.patientId?.name || "Patient"} with ${appointment.doctorName || "Doctor"} • ${getAppointmentDateTime(
        appointment,
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}, ${appointment.slotTime || "--"}`,
    };
  });

  const calendarMonthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const calendarDays = buildCalendarDays(now);
  const firstName = user?.name?.split(" ")[0] || "James";

  const statCards = [
    {
      label: "Overall Visitors",
      value: "24,580",
      delta: "+12% vs. yesterday",
      icon: "OV",
    },
    {
      label: "Total Patients",
      value: "8,340",
      delta: "+1.5% vs. last week",
      icon: "TP",
    },
    {
      label: "Appointments",
      value: "1,275",
      delta: "+8% vs. yesterday",
      icon: "AP",
    },
  ];

  return (
    <AppLayout title="Dashboard" subtitle={`Hello ${firstName}, welcome back!`}>
      <main className="dashboard-page-content">
        <section className="dashboard-grid">
          <section className="metric-grid dashboard-section dashboard-section--metrics" aria-label="Overview statistics">
            {statCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </section>

          <section className="panel panel-chart dashboard-section dashboard-section--chart">
            <div className="panel-header">
              <div>
                <h2>Patient by Age Stages</h2>
                <p>Total Patients</p>
                <strong className="panel-kpi">465</strong>
              </div>
              <button type="button">This Week</button>
            </div>

            <div className="chart-legend">
              <span>
                <i className="legend-dot legend-dot--soft" />
                Children
              </span>
              <span>
                <i className="legend-dot legend-dot--teal" />
                Teens
              </span>
              <span>
                <i className="legend-dot legend-dot--dark" />
                Adults
              </span>
            </div>

            <div className="bar-chart" aria-hidden="true">
              {weekSeries.map((item) => (
                <div className="bar-column" key={item.day}>
                  <div className="bar-group">
                    <span style={{ height: `${getBarHeight(item.scheduled)}px` }} />
                    <span className="is-mid" style={{ height: `${getBarHeight(item.inCare)}px` }} />
                    <span className="is-dark" style={{ height: `${getBarHeight(item.total)}px` }} />
                  </div>
                  <small>{item.day}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="panel panel-donut dashboard-section dashboard-section--departments">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>Patient by Departments</h2>
              </div>
            </div>

            <div className="donut-wrap">
              <div className="donut-chart">
                <div>
                  <strong>All Patients</strong>
                  <span style={{color: 'var(--text)', fontSize: '1.4rem', fontWeight: 'bold'}}>8,340</span>
                </div>
              </div>
            </div>

            <div className="department-list">
              {departmentItems.length > 0 ? (
                departmentItems.map((item) => (
                  <div className="department-item" key={item.name}>
                    <span className={`department-bullet department-bullet--${item.tone}`} />
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.count} Doctors</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-text">No departments configured</p>
              )}
            </div>
          </section>

          <section className="panel panel-revenue dashboard-section dashboard-section--revenue">
            <div className="panel-header">
              <div>
                <h2>Revenue</h2>
              </div>
              <button type="button">Today</button>
            </div>

            <div className="mini-legend">
              <span>
                <i className="legend-dot legend-dot--teal" />
                Completed
              </span>
              <span>
                <i className="legend-dot legend-dot--dark" />
                Pending
              </span>
            </div>

            <div className="line-chart" aria-hidden="true">
              <div className="line-chart__grid" />
              <div className="line-chart__area" />
              <div className="line-chart__line line-chart__line--soft" />
              <div className="line-chart__line line-chart__line--strong" />
            </div>
          </section>

          <section className="panel panel-reports dashboard-section dashboard-section--reports">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>Reports</h2>
              </div>
            </div>

            <ul className="report-list">
              {reportItems.map((item, index) => (
                <li key={item.title}>
                  <span className={`report-mark report-mark--${index % 3}`} />
                  <div>
                    <p>{item.title}</p>
                    <small>{item.note}</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel panel-table dashboard-section dashboard-section--table">
            <div className="panel-header">
              <div>
                <h2>Patient Appointment</h2>
              </div>
              <button type="button" onClick={() => navigate("/appointments")}>
                This Week
              </button>
            </div>

            <div className="table-wrap">
              <MediFlowDataTable
                className="dashboard-summary-table"
                columns={dashboardTableColumns}
                data={dashboardTableRows}
                loading={false}
                searchable={false}
                pagination={false}
                noDataMessage="No appointments available yet"
                onRowClicked={(row) => {
                  const patientId = row.patientId?._id || row.patientId;
                  if (patientId) {
                    navigate(`/patients/${patientId}`);
                  }
                }}
              />
            </div>
          </section>

          <section className="panel panel-calendar dashboard-section dashboard-section--calendar">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>{calendarMonthLabel}</h2>
              </div>
              <button type="button">{appointmentsThisMonth.length}</button>
            </div>

            <div className="calendar-grid" aria-hidden="true">
              {CALENDAR_DAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
              {calendarDays.map((dayNumber, index) => (
                <span
                  className={dayNumber === now.getDate() ? "is-selected" : ""}
                  key={`${dayNumber || "empty"}-${index}`}
                >
                  {dayNumber}
                </span>
              ))}
            </div>
          </section>

          <section className="panel dashboard-section dashboard-section--agenda">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>Agenda</h2>
              </div>
            </div>

            <div className="stack-list">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.slice(0, 4).map((appointment) => {
                  const appointmentDateTime = getAppointmentDateTime(appointment);

                  return (
                    <article className="agenda-card" key={appointment._id}>
                      <strong>
                        {appointmentDateTime.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                      </strong>
                      <div>
                        <p>{appointment.patientId?.name || "Patient"}</p>
                        <span>
                          {appointment.doctorName || "Doctor"} • {appointment.slotTime || "--"}
                        </span>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="empty-text">No upcoming agenda items</p>
              )}
            </div>
          </section>

          <section className="panel dashboard-section dashboard-section--doctors">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>Doctors&apos; Schedule</h2>
              </div>
            </div>

            <div className="doctor-stats">
              <div>
                <strong>{doctors.length}</strong>
                <span>All Doctor</span>
              </div>
              <div>
                <strong>{availableDoctors}</strong>
                <span>Available</span>
              </div>
              <div>
                <strong>{busyDoctors || offlineDoctors}</strong>
                <span>{busyDoctors ? "Busy" : "Offline"}</span>
              </div>
            </div>

            <div className="doctor-list">
              {doctors.length > 0 ? (
                doctors.slice(0, 5).map((doctor) => (
                  <article className="doctor-row" key={doctor._id}>
                    <div className="avatar avatar--small">{getInitials(doctor.name)}</div>
                    <div>
                      <p>{doctor.name}</p>
                      <span>{doctor.specialty || "General Medicine"}</span>
                    </div>
                    <span className={`status-pill status-${getStatusClass(doctor.status)}`}>{doctor.status}</span>
                  </article>
                ))
              ) : (
                <p className="empty-text">No doctors added yet</p>
              )}
            </div>
          </section>

          <section className="panel dashboard-section dashboard-section--activity">
            <div className="panel-header panel-header--tight">
              <h2>Recent Activity</h2>
            </div>

            <ul className="activity-list">
              {activityItems.length > 0 ? (
                activityItems.map((item) => (
                  <li key={`${item.title}-${item.time}`}>
                    <span className={`activity-icon activity-icon--${item.tone}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.time}</p>
                    </div>
                  </li>
                ))
              ) : (
                <li>
                  <span className="activity-icon activity-icon--teal" />
                  <div>
                    <strong>No recent activity</strong>
                    <p>Activity will appear after appointments are created</p>
                  </div>
                </li>
              )}
            </ul>
          </section>
        </section>

        {/* ML-Powered Dashboard Cards */}
        <section className="dashboard-alerts-section">
          <NoShowRiskCard />
          <DoctorAlertsPanel />
        </section>
      </main>
    </AppLayout>
  );
}

export default DashboardPage;
