import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";

const pressureBars = [62, 74, 55, 69, 80, 83, 72, 77, 68, 75, 88, 81];

function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPatientDetails();
    }
  }, [id]);

  const fetchPatientDetails = async () => {
    try {
      // Fetch patient info
      const patientRes = await api.get(`/appointments/patients/${id}`);
      setPatient(patientRes.data.patient);

      // Fetch patient appointments
      try {
        const appointmentsRes = await api.get(`/appointments/patients/${id}/history`);
        setAppointments(appointmentsRes.data.appointments || []);
      } catch {
        // If no appointments endpoint, try alternative
        setAppointments([]);
      }

      // Fetch patient prescriptions (for doctors/admins)
      if (user?.role === 'doctor' || user?.role === 'hospital_admin') {
        try {
          const prescriptionsRes = await api.get(`/prescriptions/patient/${id}`);
          setPrescriptions(prescriptionsRes.data.prescriptions || []);
        } catch {
          setPrescriptions([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch patient details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "PT";
    return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return "--";
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (date) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "completed": return "completed";
      case "booked":
      case "confirmed": return "scheduled";
      case "in_progress":
      case "checked_in": return "ongoing";
      case "cancelled":
      case "no_show": return "canceled";
      default: return "scheduled";
    }
  };

  const formatStatus = (status) => {
    if (!status) return "Scheduled";
    return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <AppLayout title="Patient Details" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading patient details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout title="Patient Details" subtitle="Not Found">
        <div className="empty-state" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: "1.1rem", color: "#6b7280" }}>Patient not found</p>
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

  const patientCode = `#PT-${String(patient._id?.slice(-6) || "000000").toUpperCase()}`;
  const age = calculateAge(patient.dateOfBirth);
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "--";

  // Get stats
  const completedAppointments = appointments.filter(a => a.status === "completed").length;
  const upcomingAppointments = appointments.filter(a =>
    ["booked", "confirmed"].includes(a.status) && new Date(a.date) >= new Date()
  ).length;
  const cancelledAppointments = appointments.filter(a =>
    ["cancelled", "no_show"].includes(a.status)
  ).length;

  return (
    <AppLayout title="Patient Details" subtitle={`Patients / ${patient.name}`}>
      <main className="patient-details-page">
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
          ← Back to Appointments
        </button>

        <section className="patient-details-top">
          <section className="panel patient-profile-card">
            <div className="patient-profile-main">
              <div className="patient-profile-photo">{getInitials(patient.name)}</div>
              <div className="patient-profile-info">
                <div className="patient-profile-head">
                  <div>
                    <h2>{patient.name}</h2>
                    <p>{patientCode}</p>
                  </div>
                  {user?.role === 'doctor' && (
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => navigate(`/prescription?patientId=${id}`)}
                    >
                      Create Prescription
                    </button>
                  )}
                  <button className="panel-more" type="button" aria-label="Patient actions">
                    ...
                  </button>
                </div>

                <div className="patient-contact-row">
                  <span>{patient.phone || "--"}</span>
                  <span>{patient.email || "--"}</span>
                  {patient.address && <span>{patient.address}</span>}
                </div>

                <div className="patient-meta-grid">
                  <div>
                    <small>Age & Gender</small>
                    <strong>{age !== "--" ? `${age} / ${gender}` : `-- / ${gender}`}</strong>
                  </div>
                  <div>
                    <small>DOB</small>
                    <strong>{formatDate(patient.dateOfBirth)}</strong>
                  </div>
                  <div>
                    <small>Blood Type</small>
                    <strong>{patient.bloodType || "--"}</strong>
                  </div>
                  <div>
                    <small>Total Visits</small>
                    <strong>{patient.totalAppointments || appointments.length || 0}</strong>
                  </div>
                  <div>
                    <small>Status</small>
                    <strong style={{ color: "#10b981" }}>{patient.isVerified ? "Verified" : "Active"}</strong>
                  </div>
                  <div>
                    <small>Member Since</small>
                    <strong>{formatDate(patient.createdAt)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="panel patient-id-card">
            <div className="patient-id-brand">MedQueue AI</div>
            <div className="patient-id-body">
              <strong>{patient.name}</strong>
              <p>{patientCode}</p>
            </div>
            <div className="patient-id-footer">
              <span>{completedAppointments} Completed</span>
              <span>{upcomingAppointments} Upcoming</span>
            </div>
          </aside>
        </section>

        <section className="patient-details-grid">
          <div className="patient-details-main">
            {/* Stats Cards */}
            <section className="patient-vitals-grid">
              <article className="panel patient-vital-card">
                <div className="patient-vital-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>TA</div>
                <p>Total Appointments</p>
                <strong>{appointments.length || patient.totalAppointments || 0}</strong>
              </article>
              <article className="panel patient-vital-card">
                <div className="patient-vital-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>CP</div>
                <p>Completed</p>
                <strong>{completedAppointments}</strong>
              </article>
              <article className="panel patient-vital-card">
                <div className="patient-vital-icon" style={{ background: "#fef3c7", color: "#d97706" }}>UP</div>
                <p>Upcoming</p>
                <strong>{upcomingAppointments}</strong>
              </article>
              <article className="panel patient-vital-card">
                <div className="patient-vital-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>CN</div>
                <p>Cancelled</p>
                <strong>{cancelledAppointments}</strong>
              </article>
            </section>

            {/* Visit History Chart */}
            <section className="panel blood-pressure-card">
              <div className="panel-header">
                <div>
                  <h2>Visit History</h2>
                </div>
                <p>Last 12 months</p>
              </div>
              <div className="pressure-legend">
                <span><i className="legend-dot legend-dot--teal" /> Appointments</span>
              </div>
              <div className="pressure-chart" aria-hidden="true">
                {pressureBars.map((value, index) => (
                  <div className="pressure-bar-group" key={index}>
                    <span className="pressure-bar pressure-bar--bottom" style={{ height: `${Math.max(20, value - 20)}px` }} />
                  </div>
                ))}
              </div>
              <div className="pressure-months" aria-hidden="true">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </section>

            {/* Medical Info */}
            <section className="patient-bottom-grid">
              <section className="panel">
                <div className="panel-header panel-header--tight">
                  <h2>Medical History</h2>
                  <button className="panel-more" type="button" aria-label="Medical history actions">
                    ...
                  </button>
                </div>
                {patient.medicalHistory?.length > 0 ? (
                  <ul className="file-list">
                    {patient.medicalHistory.map((item, idx) => (
                      <li key={idx}>
                        <span className="file-mark" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "#6b7280", padding: "1rem 0" }}>No medical history recorded</p>
                )}
              </section>

              <section className="panel">
                <div className="panel-header panel-header--tight">
                  <h2>Patient Notes</h2>
                  <button className="panel-more" type="button" aria-label="Notes actions">
                    ...
                  </button>
                </div>
                {appointments.filter(a => a.triageData?.preVisitSummary || a.notes).length > 0 ? (
                  <div className="patient-note-card">
                    {(() => {
                      const latestNote = appointments.find(a => a.triageData?.preVisitSummary || a.notes);
                      return latestNote ? (
                        <>
                          <strong>{latestNote.doctorId?.userId?.name || "Doctor"}</strong>
                          <p>{formatDate(latestNote.date)}</p>
                          <div className="patient-note-copy">
                            {latestNote.triageData?.preVisitSummary || latestNote.notes}
                          </div>
                        </>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <p style={{ color: "#6b7280", padding: "1rem 0" }}>No notes recorded</p>
                )}
              </section>
            </section>
          </div>

          <div className="patient-details-side">
            {/* Medical Summary */}
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
                    {patient.conditions?.length > 0 ? (
                      patient.conditions.map((condition, idx) => (
                        <span key={idx}>{condition}</span>
                      ))
                    ) : (
                      <span style={{ background: "#f3f4f6", color: "#6b7280" }}>None recorded</span>
                    )}
                  </div>
                </div>
                <div className="medical-box">
                  <small>Allergies</small>
                  <div className="medical-tags">
                    {patient.allergies?.length > 0 ? (
                      patient.allergies.map((allergy, idx) => (
                        <span key={idx} style={{ background: "#fef2f2", color: "#991b1b" }}>{allergy}</span>
                      ))
                    ) : (
                      <span style={{ background: "#f3f4f6", color: "#6b7280" }}>None recorded</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Prescriptions - For Doctors/Admins */}
            {(user?.role === 'doctor' || user?.role === 'hospital_admin') && (
              <section className="panel">
                <div className="panel-header panel-header--tight">
                  <h2>Prescriptions</h2>
                  <button className="panel-more" type="button" aria-label="Prescriptions actions">
                    ...
                  </button>
                </div>
                {prescriptions.length > 0 ? (
                  <div className="prescriptions-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {prescriptions.map((rx) => (
                      <div key={rx._id} className="prescription-item" style={{
                        padding: '12px',
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#0d9488', fontSize: '0.9rem' }}>
                            {rx.prescriptionNumber}
                          </strong>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: rx.status === 'active' ? '#dcfce7' : '#f3f4f6',
                            color: rx.status === 'active' ? '#166534' : '#6b7280'
                          }}>
                            {rx.status}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#374151' }}>
                          {rx.diagnosis}
                        </p>
                        <p style={{ margin: '0', fontSize: '0.75rem', color: '#9ca3af' }}>
                          {formatDate(rx.createdAt)} | {rx.medications?.length || 0} medications
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#6b7280', padding: '1rem', textAlign: 'center' }}>
                    No prescriptions found
                  </p>
                )}
              </section>
            )}

            {/* Appointments Table */}
            <section className="panel">
              <div className="panel-header panel-header--tight">
                <h2>Appointments</h2>
                <button className="panel-more" type="button" aria-label="Appointments actions">
                  ...
                </button>
              </div>
              <div className="appointment-tabs" aria-hidden="true">
                <span className="is-active">All</span>
                <span>Upcoming</span>
                <span>Completed</span>
              </div>
              <div className="table-wrap">
                {appointments.length > 0 ? (
                  <table className="patient-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Doctor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 10).map((apt) => (
                        <tr key={apt._id}>
                          <td>{formatDate(apt.date)}</td>
                          <td>{apt.slotTime || "--"}</td>
                          <td>{apt.appointmentType || "Consultation"}</td>
                          <td>
                            <div className="table-meta">
                              <strong>{apt.doctorId?.userId?.name || "Doctor"}</strong>
                              <p>{apt.doctorId?.specialty || ""}</p>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill status-${getStatusClass(apt.status)}`}>
                              {formatStatus(apt.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "#6b7280", padding: "1.5rem", textAlign: "center" }}>
                    No appointments found
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default PatientDetailsPage;
