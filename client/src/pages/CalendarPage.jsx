import AppLayout from "../layouts/AppLayout";
import {
  calendarDays,
  calendarScheduleDetails,
  calendarSummary,
} from "../data/navigation";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarPage() {
  return (
    <AppLayout title="Calendar" subtitle="Manage department schedules and agenda blocks">
      <main className="calendar-page">
        <section className="panel calendar-shell">
          <div className="calendar-toolbar">
            <div className="calendar-toolbar__title">
              <h2>March 2028</h2>
              <span aria-hidden="true">⌄</span>
            </div>
            <div className="calendar-toolbar__actions">
              <div className="calendar-view-switch">
                <button type="button" className="is-active">Month</button>
                <button type="button">Week</button>
                <button type="button">Day</button>
              </div>
              <button className="calendar-add-button" type="button">+ New Agenda</button>
            </div>
          </div>

          <div className="calendar-layout">
            <aside className="calendar-summary">
              <small>Total All Schedules</small>
              <strong>12</strong>
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
                    className={`calendar-cell${cell.muted ? " is-muted" : ""}${cell.day === 14 ? " is-selected" : ""}`}
                    key={`${cell.day}-${index}`}
                  >
                    <span className="calendar-cell__weekday">{weekdays[index % 7]}</span>
                    <span className="calendar-date">{cell.day}</span>
                    <div className="calendar-events">
                      {cell.events?.map((event) => (
                        <div className={`calendar-event calendar-event--${event.tone}`} key={`${cell.day}-${event.title}`}>
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
                <h3>Schedule Details</h3>
                <button type="button" aria-label="Close details">×</button>
              </div>

              <div className="calendar-detail-list">
                {calendarScheduleDetails.map((item) => (
                  <article className={`calendar-detail-card calendar-detail-card--${item.tone}`} key={item.title}>
                    <h4>{item.title}</h4>
                    <ul>
                      <li className="calendar-detail-meta calendar-detail-meta--date">{item.date}</li>
                      <li className="calendar-detail-meta calendar-detail-meta--time">{item.time}</li>
                      <li className="calendar-detail-meta calendar-detail-meta--location">{item.location}</li>
                      <li className="calendar-detail-meta calendar-detail-meta--participants">{item.participants}</li>
                    </ul>
                    <div className="calendar-detail-team">
                      <small>Team</small>
                      <div className="calendar-detail-person">
                        <span className="table-avatar">{item.team.split(" ").map((part) => part[0]).join("")}</span>
                        <div>
                          <strong>{item.team}</strong>
                          <p>{item.role}</p>
                        </div>
                      </div>
                    </div>
                    <div className="calendar-detail-note">
                      <small>Note</small>
                      <p>{item.note}</p>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default CalendarPage;
