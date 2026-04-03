import AppLayout from "../layouts/AppLayout";
import {
  doctorFeedback,
  doctorFollowUps,
  doctorPatientRows,
  doctorScheduleItems,
  doctorStats,
} from "../data/navigation";

const overviewBars = [42, 58, 44, 71, 64, 52, 69];

function DoctorDetailsPage() {
  return (
    <AppLayout title="Dr. Nina Alvarez" subtitle="Doctors / Doctor Details">
      <main className="doctor-details-page">
        <section className="doctor-details-grid">
          <div className="doctor-details-main">
            <section className="doctor-hero-grid">
              <article className="panel doctor-profile-card doctor-section doctor-section--profile">
                <div className="doctor-profile-photo">NA</div>
                <div className="doctor-profile-summary">
                  <strong>Dr. Nina Alvarez</strong>
                  <span>#DR-1005</span>
                  <div className="doctor-profile-meta">
                    <div>
                      <small>Specialty</small>
                      <strong>Dermatology</strong>
                    </div>
                    <div>
                      <small>Experience</small>
                      <strong>11+ years</strong>
                    </div>
                    <div>
                      <small>Status</small>
                      <strong>Available</strong>
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
                  Dr. Nina specializes in medical and cosmetic dermatology, focusing on acne,
                  pigmentation, and chronic skin conditions with patient-friendly, step-by-step
                  treatment plans.
                </p>
                <div className="doctor-contact-grid">
                  <div>
                    <small>Room Number</small>
                    <strong>Dermatology Clinic - Room D-204</strong>
                  </div>
                  <div>
                    <small>Phone Number</small>
                    <strong>+62 21-555-2035</strong>
                  </div>
                  <div>
                    <small>Email</small>
                    <strong>nina.alvarez@medlinkhospital.com</strong>
                  </div>
                  <div>
                    <small>First Joint</small>
                    <strong>18 January 2006</strong>
                  </div>
                  <div>
                    <small>Emergency Contact</small>
                    <strong>Miguel Morales +62 813-7700-1198</strong>
                  </div>
                  <div>
                    <small>Address</small>
                    <strong>Jl. Harmoni Raya No. 22, Jakarta, Indonesia</strong>
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
                  {doctorScheduleItems.map((item) => (
                    <div className={`schedule-day${item.active ? " is-active" : ""}`} key={item.day}>
                      <span>{item.weekday}</span>
                      <strong>{item.day}</strong>
                    </div>
                  ))}
                </div>
                <div className="schedule-list">
                  {doctorFollowUps.map((item) => (
                    <article className={`schedule-row${item.active ? " is-active" : ""}`} key={`${item.name}-${item.time}`}>
                      <div className="table-avatar">{item.name.split(" ").map((part) => part[0]).join("")}</div>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.type} • {item.time}</p>
                      </div>
                    </article>
                  ))}
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
                <h2>Patients</h2>
                <div className="doctor-table-actions">
                  <label className="doctor-search">
                    <input type="search" placeholder="Search patients" />
                  </label>
                  <button className="doctor-action ghost" type="button">Sort by: Latest</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="doctor-patients-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Name</th>
                      <th>Check In Date</th>
                      <th>Condition</th>
                      <th>Treatment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorPatientRows.map((row) => (
                      <tr key={row.patientId}>
                        <td><span className="table-check" aria-hidden="true" /></td>
                        <td>
                          <div className="table-person">
                            <span className="table-avatar">{row.patient.split(" ").map((part) => part[0]).join("")}</span>
                            <div>
                              <strong>{row.patient}</strong>
                              <p>{row.patientId}</p>
                            </div>
                          </div>
                        </td>
                        <td>{row.checkIn}</td>
                        <td>{row.condition}</td>
                        <td>{row.treatment}</td>
                        <td>
                          <span className={`status-pill patient-status patient-status--${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <strong>88%</strong>
                <p>+0.5%</p>
              </div>
              <small>1,739 patients are satisfied. It&apos;s increasing than last month</small>
            </article>

            <div className="doctor-stat-grid doctor-section doctor-section--stats">
              {doctorStats.map((item) => (
                <article className="panel doctor-stat-card" key={item.label}>
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                  <span>{item.delta} vs. last month</span>
                </article>
              ))}
            </div>

            <article className="panel doctor-section doctor-section--feedback">
              <div className="panel-header panel-header--tight">
                <h2>Feedback</h2>
                <button className="panel-more" type="button" aria-label="Feedback actions">
                  ...
                </button>
              </div>
              <div className="feedback-list">
                {doctorFeedback.map((item) => (
                  <article className="feedback-item" key={`${item.name}-${item.date}`}>
                    <div className="feedback-head">
                      <strong>{item.name}</strong>
                      <span>{item.rating}</span>
                    </div>
                    <p>{item.note}</p>
                    <small>{item.date}</small>
                  </article>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </main>
    </AppLayout>
  );
}

export default DoctorDetailsPage;
