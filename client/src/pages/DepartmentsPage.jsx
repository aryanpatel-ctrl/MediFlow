import AppLayout from "../layouts/AppLayout";
import {
  departmentBreakdownLegend,
  departmentBreakdownRows,
  departmentCards,
  departmentOverviewCards,
} from "../data/navigation";

function DepartmentsPage() {
  return (
    <AppLayout title="Departments" subtitle="Department overview and staffing">
      <main className="departments-page">
        <section className="departments-top-grid">
          <div className="departments-stat-column">
            {departmentOverviewCards.map((card) => (
              <article className="panel department-stat-card" key={card.label}>
                <div className="department-stat-card__top">
                  <span>{card.label}</span>
                  <button className="panel-more" type="button" aria-label={`${card.label} options`}>
                    ...
                  </button>
                </div>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
                <div className="department-stat-card__icon">{card.icon}</div>
              </article>
            ))}
          </div>

          <section className="panel department-breakdown-card">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>Staff Breakdown by Departments</h2>
                <p>Total All Staff</p>
                <strong className="department-breakdown-total">1,475</strong>
              </div>
              <div className="department-breakdown-legend" aria-label="Staff legend">
                {departmentBreakdownLegend.map((item) => (
                  <span key={item.label}>
                    <i className={`department-legend-dot department-legend-dot--${item.tone}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="department-breakdown-scale">
              {[50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0].map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>

            <div className="department-breakdown-grid">
              {departmentBreakdownRows.map((row) => (
                <div className="department-breakdown-column" key={row.label}>
                  {row.values.map((value, index) => (
                    <div
                      className={`department-breakdown-bar department-breakdown-bar--${
                        row.active && index === 3 ? "active" : index === 3 ? "dark" : index === 2 ? "teal" : index === 1 ? "light" : "soft"
                      }`}
                      key={`${row.label}-${index}`}
                      style={{ height: `${40 + value * 1.7}px` }}
                    >
                      {row.active && index === 3 ? (
                        <div className="department-breakdown-tooltip">
                          <strong>{row.label}</strong>
                          <span>Doctor staff 3</span>
                          <span>Specialists 17</span>
                          <span>Nurses 17</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <span className="department-breakdown-label">{row.label}</span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <div className="departments-filter-row">
          <label className="department-search">
            <input type="search" placeholder="Search Departments" />
            <span className="department-search__icon" aria-hidden="true">
              Q
            </span>
          </label>
          <button className="department-filter-button" type="button">
            Filter
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        <section className="departments-card-grid">
          {departmentCards.map((department) => (
            <article className="panel department-card" key={department.name}>
              <div className={`department-card__media department-card__media--${department.tone}`} />
              <div className="department-card__body">
                <div className="department-card__head">
                  <div>
                    <h2>{department.name}</h2>
                    <p>{department.floor}</p>
                  </div>
                  <div className="department-card__staff">
                    <div className="department-card__avatars" aria-hidden="true">
                      {department.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <small>{department.beds}</small>
                  </div>
                </div>
                <p className="department-card__note">{department.note}</p>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppLayout>
  );
}

export default DepartmentsPage;
