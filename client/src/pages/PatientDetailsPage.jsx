import AppLayout from "../layouts/AppLayout";
import {
  healthReportItems,
  medicationRows,
  patientAppointments,
  patientVitals,
} from "../data/navigation";

const pressureBars = [62, 74, 55, 69, 80, 83, 72, 77, 68, 75, 88, 81];

function PatientDetailsPage() {
  return (
    <AppLayout title="Patient Details" subtitle="Patients / Patient Details">
      <main className="patient-details-page">
        <section className="patient-details-top">
          <section className="panel patient-profile-card">
            <div className="patient-profile-main">
              <div className="patient-profile-photo">DW</div>
              <div className="patient-profile-info">
                <div className="patient-profile-head">
                  <div>
                    <h2>Daniel Wong</h2>
                    <p>#PT-2035-078</p>
                  </div>
                  <button className="panel-more" type="button" aria-label="Patient actions">
                    ...
                  </button>
                </div>

                <div className="patient-contact-row">
                  <span>+62 812-9012-4477</span>
                  <span>daniel.wong@hospital.com</span>
                  <span>Jl. Kaliurang No. 36, Yogyakarta</span>
                  <span>+62 812-9988-4411 (Spouse)</span>
                </div>

                <div className="patient-meta-grid">
                  <div>
                    <small>Age & Gender</small>
                    <strong>42 / Male</strong>
                  </div>
                  <div>
                    <small>DOB</small>
                    <strong>23 July 1993</strong>
                  </div>
                  <div>
                    <small>Blood Type</small>
                    <strong>O+</strong>
                  </div>
                  <div>
                    <small>Occupation</small>
                    <strong>Project Manager</strong>
                  </div>
                  <div>
                    <small>Status</small>
                    <strong>Post-Op (Inpatient)</strong>
                  </div>
                  <div>
                    <small>Insurance</small>
                    <strong>BPJS - Class 1</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="panel patient-id-card">
            <div className="patient-id-brand">Medlink</div>
            <div className="patient-id-body">
              <strong>Daniel Wong</strong>
              <p>#PT-2035-078</p>
            </div>
            <div className="patient-id-footer">
              <span>09:35</span>
              <span>Every Day</span>
            </div>
          </aside>
        </section>

        <section className="patient-details-grid">
          <div className="patient-details-main">
            <section className="patient-vitals-grid">
              {patientVitals.map((item) => (
                <article className="panel patient-vital-card" key={item.label}>
                  <div className="patient-vital-icon">{item.icon}</div>
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </section>

            <section className="panel blood-pressure-card">
              <div className="panel-header">
                <div>
                  <h2>Blood Pressure</h2>
                </div>
                <p>Last check-up: Feb 23, 2035</p>
              </div>
              <div className="pressure-legend">
                <span><i className="legend-dot legend-dot--soft" /> Heart Rate</span>
                <span><i className="legend-dot legend-dot--teal" /> Blood Pressure</span>
              </div>
              <div className="pressure-chart" aria-hidden="true">
                {pressureBars.map((value, index) => (
                  <div className="pressure-bar-group" key={index}>
                    <span className="pressure-bar pressure-bar--top" style={{ height: `${value}px` }} />
                    <span className="pressure-bar pressure-bar--bottom" style={{ height: `${Math.max(35, value - 22)}px` }} />
                  </div>
                ))}
              </div>
              <div className="pressure-months" aria-hidden="true">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </section>

            <section className="patient-bottom-grid">
              <section className="panel">
                <div className="panel-header panel-header--tight">
                  <h2>Health Reports</h2>
                  <button className="panel-more" type="button" aria-label="Health reports actions">
                    ...
                  </button>
                </div>
                <ul className="file-list">
                  {healthReportItems.map((item) => (
                    <li key={item}>
                      <span className="file-mark" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="panel">
                <div className="panel-header panel-header--tight">
                  <h2>Patient Note</h2>
                  <button className="panel-more" type="button" aria-label="Patient note actions">
                    ...
                  </button>
                </div>
                <div className="patient-note-card">
                  <strong>Dr. Sam Jaguar</strong>
                  <p>On Duty Doctor</p>
                  <div className="patient-note-copy">
                    Daniel is stable post-op with well-controlled pain and early mobilization is planned.
                    Continue regular blood pressure monitoring and adjust medication if pain or hypertension worsens.
                  </div>
                </div>
              </section>
            </section>
          </div>

          <div className="patient-details-side">
            <section className="panel">
              <div className="panel-header panel-header--tight">
                <h2>Medical Info</h2>
                <button className="panel-more" type="button" aria-label="Medical info actions">
                  ...
                </button>
              </div>

              <div className="medical-summary-grid">
                <div className="medical-box">
                  <small>Conditions</small>
                  <div className="medical-tags">
                    <span>Bone Fracture</span>
                    <span>Hypertension</span>
                    <span>Left Tibia (Post Surgery)</span>
                    <span>Controlled</span>
                  </div>
                </div>
                <div className="medical-box">
                  <small>Allergies</small>
                  <div className="medical-tags">
                    <span>Penicillin</span>
                    <span>Aspirin</span>
                    <span>Shellfish</span>
                    <span>Dust Mites</span>
                    <span>Peanuts</span>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="medical-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Name</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Start - End Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicationRows.map((row) => (
                      <tr key={row.name}>
                        <td>
                          <span className="table-check" aria-hidden="true" />
                        </td>
                        <td>
                          <div className="table-meta">
                            <strong>{row.name}</strong>
                            <p>{row.form}</p>
                          </div>
                        </td>
                        <td>{row.dosage}</td>
                        <td>{row.frequency}</td>
                        <td>{row.startEnd}</td>
                        <td>
                          <span className={`status-pill status-${row.status.toLowerCase()}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header panel-header--tight">
                <h2>Appointments</h2>
                <button className="panel-more" type="button" aria-label="Appointments history actions">
                  ...
                </button>
              </div>
              <div className="appointment-tabs" aria-hidden="true">
                <span className="is-active">All</span>
                <span>Upcoming</span>
                <span>History</span>
              </div>
              <div className="table-wrap">
                <table className="patient-history-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Date</th>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Doctor</th>
                      <th>Status</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientAppointments.map((row) => (
                      <tr key={`${row.date}-${row.time}`}>
                        <td>
                          <span className="table-check" aria-hidden="true" />
                        </td>
                        <td>{row.date}</td>
                        <td>{row.time}</td>
                        <td>{row.type}</td>
                        <td>
                          <div className="table-meta">
                            <strong>{row.doctor}</strong>
                            <p>{row.specialty}</p>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill status-${row.status.toLowerCase()}`}>
                            {row.status}
                          </span>
                        </td>
                        <td>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default PatientDetailsPage;
