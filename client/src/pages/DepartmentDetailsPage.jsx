import AppLayout from "../layouts/AppLayout";
import {
  departmentPerformanceStats,
  departmentTeamMembers,
  departmentTrendBars,
} from "../data/navigation";

const treatments = [
  "General Cardiac Consultation",
  "Arrhythmia Assessment & Therapy",
  "Heart Failure Management Program",
  "Heart Rhythm Management Program",
];

function DepartmentDetailsPage() {
  return (
    <AppLayout title="Cardiology" subtitle="Departments / Department Details">
      <main className="department-details-page">
        <section className="department-details-top">
          <article className="panel department-hero-card">
            <div className="department-hero-media">
              <span>Heart Center - 4th Floor</span>
            </div>
          </article>

          <article className="panel department-summary-card">
            <div className="department-summary-head">
              <h2>Cardiology Department</h2>
              <div className="department-summary-chief">
                <div className="table-avatar">AH</div>
                <div>
                  <strong>Dr. Amelia Hart, MD, FACC</strong>
                  <p>Head of Department</p>
                </div>
              </div>
            </div>

            <div className="department-copy-block">
              <small>About</small>
              <p>
                The Cardiology Department focuses on prevention, diagnosis, and treatment of heart and blood vessel diseases.
                Using integrated Medlink monitoring, the team manages both emergency and routine cardiac cases, coordinates with
                other specialties, and supports long-term heart health programs for inpatients and outpatients.
              </p>
            </div>

            <div className="department-copy-block">
              <small>Treatments</small>
              <div className="department-treatment-grid">
                {treatments.map((item) => (
                  <article className="department-treatment-item" key={item}>
                    <strong>{item}</strong>
                    <p>
                      Comprehensive support for evaluation, medication planning, monitoring, and procedure referrals with ECG and
                      diagnostic testing.
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="department-details-bottom">
          <article className="panel department-team-card">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>Team</h2>
              </div>
              <strong className="department-team-total">18 Staff</strong>
            </div>
            <div className="department-team-tabs">
              <button type="button" className="is-active">All</button>
              <button type="button">Doctors</button>
              <button type="button">Specialists</button>
              <button type="button">Nurses</button>
              <button type="button">Support Staff</button>
            </div>
            <div className="department-team-list">
              {departmentTeamMembers.map((member) => (
                <article className="department-team-member" key={member.name}>
                  <div className="table-avatar">{member.initials}</div>
                  <div>
                    <strong>{member.name}</strong>
                    <p>{member.role}</p>
                  </div>
                  <span className={`department-team-tag department-team-tag--${member.tag.toLowerCase().replace(/\s+/g, "-")}`}>
                    {member.tag}
                  </span>
                </article>
              ))}
            </div>
          </article>

          <article className="panel department-performance-card">
            <div className="panel-header panel-header--tight">
              <h2>Performance</h2>
              <button className="panel-more" type="button" aria-label="Performance actions">
                ...
              </button>
            </div>
            <div className="department-performance-gauge">
              <div className="department-performance-ring">
                <span>Score</span>
                <strong>4.8/5.0</strong>
              </div>
            </div>
            <div className="department-performance-list">
              {departmentPerformanceStats.map((item) => (
                <div className="department-performance-row" key={item.label}>
                  <div className="department-performance-label">
                    <span>{item.label}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="department-performance-track">
                    <span style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel department-trends-card">
            <div className="panel-header">
              <div>
                <h2>Appointment Trends</h2>
              </div>
              <button type="button">Last Week</button>
            </div>
            <div className="department-trends-summary">
              <strong>236 Appointments</strong>
              <span>+0.5% than last week</span>
            </div>
            <div className="department-trends-chart" aria-hidden="true">
              {departmentTrendBars.map((item) => (
                <div className="department-trends-column" key={item.day}>
                  <span className="department-trends-value">{item.value}</span>
                  <div className="department-trends-track">
                    <span style={{ height: `${item.value * 3.2}px` }} />
                  </div>
                  <small>{item.day}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}

export default DepartmentDetailsPage;
