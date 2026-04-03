import { useEffect, useState } from "react";
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

function CalendarPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

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
      time: `${appointment.slotTime || "--"} • ${appointment.doctorName}`,
      tone: getStatusTone(appointment.status),
    }));

    if (dayAppointments.length > 2) {
      events.push({
        title: `+${dayAppointments.length - 2} more`,
        time: "appointments",
        tone: "light",
      });
    }

    calendarDays.push({
      day: cursor.getDate(),
      muted: cursor.getMonth() !== currentMonth.getMonth(),
      key,
      events,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  const selectedAppointments = selectedDate
    ? appointmentMap[selectedDate] || []
    : appointments.slice(0, 3);

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Upcoming Schedule Details";

  const calendarSummary = [
    { title: "Today's Appointments", count: `${todayAppointments.length} Schedules` },
    { title: "Next 7 Days", count: `${upcomingWeekAppointments.length} Schedules` },
    { title: "Queue Ready", count: `${activeQueueAppointments.length} Schedules` },
  ];

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
      <main className="calendar-page">
        <section className="panel calendar-shell">
          <div className="calendar-toolbar">
            <div className="calendar-toolbar__title">
              <h2>{monthLabel}</h2>
              <span aria-hidden="true">⌄</span>
            </div>
            <div className="calendar-toolbar__actions">
              <div className="calendar-view-switch">
                <button type="button" onClick={previousMonth}>Prev</button>
                <button type="button" className="is-active">Month</button>
                <button type="button" onClick={nextMonthView}>Next</button>
              </div>
              <button className="calendar-add-button" type="button" onClick={jumpToToday}>Today</button>
            </div>
          </div>

          <div className="calendar-layout">
            <aside className="calendar-summary">
              <small>Total All Schedules</small>
              <strong>{appointments.length}</strong>
              <div className="calendar-summary-list">
                {calendarSummary.map((item, index) => (
                  <article className={`calendar-summary-item calendar-summary-item--${index + 1}`} key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.count}</span>
                  </article>
                ))}
              </div>
            </aside>

            <section className="calendar-board">
              <div className="calendar-grid calendar-grid--head">
                {weekdays.map((day) => (
                  <div className="calendar-weekday" key={day}>{day}</div>
                ))}
              </div>

              <div className="calendar-grid calendar-grid--body">
                {calendarDays.map((cell, index) => (
                  <article
                    className={`calendar-cell${cell.muted ? " is-muted" : ""}${cell.key === selectedDate ? " is-selected" : ""}`}
                    key={`${cell.key}-${index}`}
                    onClick={() => setSelectedDate(cell.key)}
                  >
                    <span className="calendar-cell__weekday">{weekdays[index % 7]}</span>
                    <span className="calendar-date">{cell.day}</span>
                    <div className="calendar-events">
                      {cell.events.map((event) => (
                        <div className={`calendar-event calendar-event--${event.tone}`} key={`${cell.key}-${event.title}-${event.time}`}>
                          <strong>{event.title}</strong>
                          <small>{event.time}</small>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="calendar-details">
              <div className="calendar-details__head">
                <h3>{selectedDateLabel}</h3>
                <button type="button" aria-label="Close details" onClick={() => setSelectedDate(null)}>×</button>
              </div>

              <div className="calendar-detail-list">
                {selectedAppointments.length > 0 ? (
                  selectedAppointments.map((appointment) => (
                    <article
                      className={`calendar-detail-card calendar-detail-card--${getStatusTone(appointment.status) === "soft" ? "soft" : "teal"}`}
                      key={appointment._id}
                    >
                      <h4>{appointment.patientId?.name || "Patient"} with {appointment.doctorName}</h4>
                      <ul>
                        <li className="calendar-detail-meta calendar-detail-meta--date">
                          {new Date(appointment.date).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </li>
                        <li className="calendar-detail-meta calendar-detail-meta--time">
                          {appointment.slotTime}{appointment.slotEndTime ? ` - ${appointment.slotEndTime}` : ""}
                        </li>
                        <li className="calendar-detail-meta calendar-detail-meta--location">
                          {appointment.doctorSpecialty}
                        </li>
                        <li className="calendar-detail-meta calendar-detail-meta--participants">
                          {appointment.patientId?.phone || "No patient phone"} | {appointment.status?.replace("_", " ") || "booked"}
                        </li>
                      </ul>
                      <div className="calendar-detail-team">
                        <small>Doctor</small>
                        <div className="calendar-detail-person">
                          <span className="table-avatar">
                            {appointment.doctorName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                          </span>
                          <div>
                            <strong>{appointment.doctorName}</strong>
                            <p>{appointment.doctorSpecialty}</p>
                          </div>
                        </div>
                      </div>
                      <div className="calendar-detail-note">
                        <small>Note</small>
                        <p>
                          {appointment.triageData?.preVisitSummary
                            || (appointment.queueNumber
                              ? `Queue number #${appointment.queueNumber} for this appointment.`
                              : "No additional queue note for this appointment.")}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No appointments scheduled for this day.</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default CalendarPage;
