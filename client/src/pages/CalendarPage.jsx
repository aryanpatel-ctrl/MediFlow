import { useEffect, useState } from "react";
import { Plus, Calendar, Clock, MapPin, Users, X, ChevronLeft, ChevronRight } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (dateValue) => {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getStatusTone = (status) => {
  switch (status) {
    case "completed":
      return "mint";
    case "cancelled":
    case "no_show":
      return "soft";
    case "checked_in":
    case "in_consultation":
    case "in_progress":
      return "light";
    default:
      return "teal";
  }
};

const getCategoryColor = (index) => {
  const colors = ["teal", "mint", "light"];
  return colors[index % colors.length];
};

function CalendarPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [viewMode, setViewMode] = useState("month"); // month, week, day
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);

  useEffect(() => {
    fetchCalendarAppointments();
  }, [user]);

  const fetchCalendarAppointments = async () => {
    setLoading(true);

    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
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
          }));
        } catch (err) {
          console.log(`Could not fetch calendar data for doctor ${doc._id}`);
          return [];
        }
      }));

      const upcomingAppointments = appointmentGroups
        .flat()
        .sort((a, b) => {
          const dateDiff = new Date(a.date) - new Date(b.date);
          if (dateDiff !== 0) return dateDiff;
          return (a.slotTime || "").localeCompare(b.slotTime || "");
        });

      setAppointments(upcomingAppointments);

      if (upcomingAppointments.length > 0) {
        const firstUpcoming = new Date(upcomingAppointments[0].date);
        setCurrentMonth(new Date(firstUpcoming.getFullYear(), firstUpcoming.getMonth(), 1));
        setSelectedDate(toDateKey(firstUpcoming));
      }
    } catch (error) {
      console.error("Failed to fetch calendar appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const todayAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);
    return appointmentDate.getTime() === today.getTime();
  });

  const upcomingWeekAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);
    return appointmentDate >= today && appointmentDate < nextWeek;
  });

  const activeQueueAppointments = appointments.filter((appointment) =>
    ["booked", "confirmed", "checked_in", "in_consultation", "in_progress"].includes(appointment.status)
  );

  const appointmentMap = appointments.reduce((map, appointment) => {
    const key = toDateKey(appointment.date);
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(appointment);
    return map;
  }, {});

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - monthStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - monthEnd.getDay()));

  const calendarDays = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const key = toDateKey(cursor);
    const dayAppointments = appointmentMap[key] || [];
    const events = dayAppointments.slice(0, 2).map((appointment) => ({
      title: appointment.patientId?.name || "Patient",
      time: `${appointment.slotTime || "--"} - ${appointment.slotEndTime || "--"}`,
      tone: getStatusTone(appointment.status),
    }));

    if (dayAppointments.length > 2) {
      events.push({
        title: `+${dayAppointments.length - 2} more`,
        time: "",
        tone: "light",
      });
    }

    calendarDays.push({
      day: cursor.getDate(),
      muted: cursor.getMonth() !== currentMonth.getMonth(),
      key,
      events,
      isToday: toDateKey(cursor) === toDateKey(new Date()),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  const selectedAppointments = selectedDate
    ? appointmentMap[selectedDate] || []
    : appointments.slice(0, 3);

  const selectedDateLabel = selectedDate
    ? "Schedule Details"
    : "Upcoming Schedule Details";

  // Group appointments by category (doctor specialty)
  const categoryGroups = appointments.reduce((acc, apt) => {
    const category = apt.doctorSpecialty || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(apt);
    return acc;
  }, {});

  const calendarCategories = Object.entries(categoryGroups).map(([name, items], index) => ({
    name,
    count: items.length,
    color: getCategoryColor(index),
  }));

  const previousMonth = () =>
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1));

  const nextMonthView = () =>
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const jumpToToday = () => {
    const current = new Date();
    setCurrentMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setSelectedDate(toDateKey(current));
  };

  if (loading) {
    return (
      <AppLayout title="Calendar" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading calendar...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Calendar" subtitle="Manage department schedules and agenda blocks">
      <main className="calendar-page-v2">
        <section className="panel calendar-shell-v2">
          {/* Calendar Toolbar */}
          <div className="calendar-toolbar-v2">
            <div className="calendar-toolbar-v2__left">
              <button className="calendar-nav-btn" onClick={previousMonth} aria-label="Previous month">
                <ChevronLeft size={18} />
              </button>
              <h2 className="calendar-month-title">{monthLabel}</h2>
              <button className="calendar-nav-btn" onClick={nextMonthView} aria-label="Next month">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="calendar-toolbar-v2__right">
              <div className="calendar-view-toggle">
                <button
                  type="button"
                  className={viewMode === "month" ? "is-active" : ""}
                  onClick={() => setViewMode("month")}
                >
                  Month
                </button>
                <button
                  type="button"
                  className={viewMode === "week" ? "is-active" : ""}
                  onClick={() => setViewMode("week")}
                >
                  Week
                </button>
                <button
                  type="button"
                  className={viewMode === "day" ? "is-active" : ""}
                  onClick={() => setViewMode("day")}
                >
                  Day
                </button>
              </div>
              <button className="calendar-new-agenda-btn" type="button" onClick={jumpToToday}>
                <Plus size={16} />
                <span>Go to Today</span>
              </button>
            </div>
          </div>

          {/* Calendar Layout */}
          <div className={`calendar-layout-v2 ${!showDetailsPanel ? 'no-details' : ''}`}>
            {/* Left Sidebar - Categories */}
            <aside className="calendar-sidebar-v2">
              <div className="calendar-total-schedules">
                <span className="calendar-total-label">Total All Schedules</span>
                <strong className="calendar-total-count">{appointments.length}</strong>
              </div>

              <div className="calendar-categories">
                {calendarCategories.length > 0 ? (
                  calendarCategories.map((category, index) => (
                    <div className={`calendar-category calendar-category--${category.color}`} key={category.name}>
                      <strong>{category.name}</strong>
                      <span>{category.count} Schedules</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="calendar-category calendar-category--teal">
                      <strong>Today's Appointments</strong>
                      <span>{todayAppointments.length} Schedules</span>
                    </div>
                    <div className="calendar-category calendar-category--mint">
                      <strong>Next 7 Days</strong>
                      <span>{upcomingWeekAppointments.length} Schedules</span>
                    </div>
                    <div className="calendar-category calendar-category--light">
                      <strong>Queue Ready</strong>
                      <span>{activeQueueAppointments.length} Schedules</span>
                    </div>
                  </>
                )}
              </div>
            </aside>

            {/* Calendar Grid */}
            <section className="calendar-main-v2">
              <div className="calendar-grid-v2 calendar-grid-v2--head">
                {weekdays.map((day) => (
                  <div className="calendar-weekday-v2" key={day}>{day}</div>
                ))}
              </div>

              <div className="calendar-grid-v2 calendar-grid-v2--body">
                {calendarDays.map((cell, index) => (
                  <article
                    className={`calendar-cell-v2${cell.muted ? " is-muted" : ""}${cell.key === selectedDate ? " is-selected" : ""}${cell.isToday ? " is-today" : ""}`}
                    key={`${cell.key}-${index}`}
                    onClick={() => {
                      setSelectedDate(cell.key);
                      setShowDetailsPanel(true);
                    }}
                  >
                    <span className="calendar-date-v2">{cell.day}</span>
                    <div className="calendar-events-v2">
                      {cell.events.map((event, eventIndex) => (
                        <div
                          className={`calendar-event-v2 calendar-event-v2--${event.tone}`}
                          key={`${cell.key}-${eventIndex}`}
                        >
                          <strong>{event.title}</strong>
                          {event.time && <small>{event.time}</small>}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Right Panel - Schedule Details */}
            {showDetailsPanel && (
              <aside className="calendar-details-v2">
                <div className="calendar-details-v2__header">
                  <h3>{selectedDateLabel}</h3>
                  <button
                    type="button"
                    className="calendar-details-close"
                    onClick={() => setShowDetailsPanel(false)}
                    aria-label="Close details"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="calendar-details-v2__list">
                  {selectedAppointments.length > 0 ? (
                    selectedAppointments.map((appointment, index) => (
                      <article
                        className={`calendar-detail-card-v2 calendar-detail-card-v2--${index % 2 === 0 ? 'teal' : 'soft'}`}
                        key={appointment._id}
                      >
                        <h4>{appointment.patientId?.name || "Patient"} with {appointment.doctorName}</h4>

                        <ul className="calendar-detail-meta-list">
                          <li className="calendar-detail-meta-v2">
                            <Calendar size={14} />
                            <span>
                              {new Date(appointment.date).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </li>
                          <li className="calendar-detail-meta-v2">
                            <Clock size={14} />
                            <span>
                              {appointment.slotTime}{appointment.slotEndTime ? ` - ${appointment.slotEndTime}` : ""}
                            </span>
                          </li>
                          <li className="calendar-detail-meta-v2">
                            <MapPin size={14} />
                            <span>{appointment.doctorSpecialty}</span>
                          </li>
                          <li className="calendar-detail-meta-v2">
                            <Users size={14} />
                            <span>{appointment.status?.replace("_", " ") || "booked"}</span>
                          </li>
                        </ul>

                        <div className="calendar-detail-team-v2">
                          <small>Team</small>
                          <div className="calendar-detail-person-v2">
                            <span className="calendar-detail-avatar">
                              {appointment.doctorName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                            </span>
                            <div>
                              <strong>{appointment.doctorName}</strong>
                              <p>{appointment.doctorSpecialty}</p>
                            </div>
                          </div>
                        </div>

                        <div className="calendar-detail-note-v2">
                          <small>Note</small>
                          <p>
                            {appointment.triageData?.preVisitSummary
                              || (appointment.queueNumber
                                ? `Queue number #${appointment.queueNumber} for this appointment.`
                                : "No additional note for this appointment.")}
                          </p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="calendar-empty-state">
                      <Calendar size={40} strokeWidth={1.5} />
                      <p>No appointments scheduled for this day.</p>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default CalendarPage;
