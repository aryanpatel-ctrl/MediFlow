import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, Mail, MapPin, Calendar, FileText, Pill, Activity, Heart, User } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import MediFlowDataTable from "../components/DataTable";
import { useAuth } from "../hooks";
import api from "../services/api";

function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointmentFilter, setAppointmentFilter] = useState("all");

  useEffect(() => {
    if (id) {
      fetchPatientDetails();
    }
  }, [id]);

  const fetchPatientDetails = async () => {
    try {
      const patientRes = await api.get(`/appointments/patients/${id}`);
      setPatient(patientRes.data.patient);

      try {
        const appointmentsRes = await api.get(`/appointments/patients/${id}/history`);
        setAppointments(appointmentsRes.data.appointments || []);
      } catch {
        setAppointments([]);
      }

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

  // Filter appointments based on tab selection
  const filteredAppointments = useMemo(() => {
    switch (appointmentFilter) {
      case "upcoming":
        return appointments.filter(a =>
          ["booked", "confirmed"].includes(a.status) && new Date(a.date) >= new Date()
        );
      case "history":
        return appointments.filter(a => a.status === "completed");
      default:
        return appointments;
    }
  }, [appointments, appointmentFilter]);

  // Table columns for appointments
  const appointmentColumns = useMemo(() => [
    {
      name: "Date",
      selector: (row) => new Date(row.date).getTime(),
      sortable: true,
      cell: (row) => formatDate(row.date),
      minWidth: "100px",
    },
    {
      name: "Time",
      selector: (row) => row.slotTime,
      sortable: true,
      cell: (row) => row.slotTime || "--",
      minWidth: "80px",
    },
    {
      name: "Type",
      selector: (row) => row.appointmentType || "Consultation",
      sortable: true,
      minWidth: "100px",
    },
    {
      name: "Doctor",
      selector: (row) => row.doctorId?.userId?.name || "Doctor",
      sortable: true,
      cell: (row) => (
        <div className="table-user-info">
          <span className="table-user-name">{row.doctorId?.userId?.name || "Doctor"}</span>
          <span className="table-user-email">{row.doctorId?.specialty || ""}</span>
        </div>
      ),
      minWidth: "140px",
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <span className={`status-badge ${getStatusClass(row.status)}`}>
          {formatStatus(row.status)}
        </span>
      ),
      minWidth: "100px",
    },
  ], []);

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
          <button onClick={() => navigate(-1)} className="btn-primary" style={{ marginTop: "1rem" }}>
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  const patientCode = `#PT-${String(patient._id?.slice(-6) || "000000").toUpperCase()}`;
  const age = calculateAge(patient.dateOfBirth);
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "--";

  // Stats
  const completedAppointments = appointments.filter(a => a.status === "completed").length;
  const upcomingAppointments = appointments.filter(a =>
    ["booked", "confirmed"].includes(a.status) && new Date(a.date) >= new Date()
  ).length;

  const latestNote = appointments.find(a => a.triageData?.preVisitSummary || a.notes);

  return (
    <AppLayout title="Patient Details" subtitle={`Patients / ${patient.name}`}>
      <main className="pd-page">
        {/* Top Section */}
        <section className="pd-top-section">
          {/* Patient Profile Card */}
          <div className="pd-profile-card panel">
            <div className="pd-profile-header">
              <div className="pd-avatar">{getInitials(patient.name)}</div>
              <div className="pd-profile-info">
                <div className="pd-name-row">
                  <h2>{patient.name}</h2>
                  <span className="pd-code">{patientCode}</span>
                </div>
                <div className="pd-contact-row">
                  {patient.phone && (
                    <span><Phone size={14} /> {patient.phone}</span>
                  )}
                  {patient.email && (
                    <span><Mail size={14} /> {patient.email}</span>
                  )}
                  {patient.address && (
                    <span><MapPin size={14} /> {patient.address}</span>
                  )}
                </div>
              </div>
              <button className="panel-more">...</button>
            </div>
            <div className="pd-meta-row">
              <div className="pd-meta-item">
                <strong>{age !== "--" ? `${age}/${gender}` : `--/${gender}`}</strong>
                <span>Age & Gender</span>
              </div>
              <div className="pd-meta-item">
                <strong>{formatDate(patient.dateOfBirth)}</strong>
                <span>DOB</span>
              </div>
              <div className="pd-meta-item">
                <strong>{patient.bloodType || "--"}</strong>
                <span>Blood Type</span>
              </div>
              <div className="pd-meta-item">
                <strong>{appointments.length}</strong>
                <span>Total Visits</span>
              </div>
              <div className="pd-meta-item">
                <strong className="status-active">{patient.isVerified ? "Verified" : "Active"}</strong>
                <span>Status</span>
              </div>
              <div className="pd-meta-item">
                <strong>{formatDate(patient.createdAt)}</strong>
                <span>Member Since</span>
              </div>
            </div>
          </div>

          {/* Patient ID Card */}
          <div className="pd-id-card">
            <div className="pd-id-brand">MediFlow</div>
            <div className="pd-id-avatar">{getInitials(patient.name)}</div>
            <div className="pd-id-info">
              <strong>{patient.name}</strong>
              <span>{patientCode}</span>
            </div>
            <div className="pd-id-stats">
              <div>
                <strong>{completedAppointments}</strong>
                <span>Completed</span>
              </div>
              <div>
                <strong>{upcomingAppointments}</strong>
                <span>Upcoming</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="pd-content">
          {/* Left Column */}
          <div className="pd-left-column">
            {/* Stats Cards */}
            <div className="pd-stats-grid">
              <div className="pd-stat-card">
                <div className="pd-stat-icon"><Calendar size={20} /></div>
                <span className="pd-stat-label">Total Visits</span>
                <strong className="pd-stat-value">{appointments.length}</strong>
              </div>
              <div className="pd-stat-card">
                <div className="pd-stat-icon"><Activity size={20} /></div>
                <span className="pd-stat-label">Completed</span>
                <strong className="pd-stat-value">{completedAppointments}</strong>
              </div>
              <div className="pd-stat-card">
                <div className="pd-stat-icon"><Heart size={20} /></div>
                <span className="pd-stat-label">Prescriptions</span>
                <strong className="pd-stat-value">{prescriptions.length}</strong>
              </div>
            </div>

            {/* Medical History */}
            <div className="panel pd-panel">
              <div className="pd-panel-header">
                <FileText size={18} />
                <h3>Medical History</h3>
                <button className="panel-more">...</button>
              </div>
              <div className="pd-panel-body">
                {patient.medicalHistory?.length > 0 ? (
                  <ul className="pd-history-list">
                    {patient.medicalHistory.map((item, idx) => (
                      <li key={idx}>
                        <span className="pd-history-dot"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pd-empty">No medical history recorded</p>
                )}
              </div>
            </div>

            {/* Patient Note */}
            <div className="panel pd-panel">
              <div className="pd-panel-header">
                <FileText size={18} />
                <h3>Patient Note</h3>
                <button className="panel-more">...</button>
              </div>
              <div className="pd-panel-body">
                {latestNote ? (
                  <div className="pd-note">
                    <div className="pd-note-header">
                      <strong>{latestNote.doctorId?.userId?.name || "Doctor"}</strong>
                      <span>{formatDate(latestNote.date)}</span>
                    </div>
                    <p>{latestNote.triageData?.preVisitSummary || latestNote.notes}</p>
                  </div>
                ) : (
                  <p className="pd-empty">No notes recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="pd-right-column">
            {/* Medical Info */}
            <div className="panel pd-panel">
              <div className="pd-panel-header">
                <User size={18} />
                <h3>Medical Info</h3>
                <button className="panel-more">...</button>
              </div>
              <div className="pd-panel-body">
                <div className="pd-info-grid">
                  <div className="pd-info-section">
                    <label>Conditions</label>
                    <div className="pd-tags">
                      {patient.conditions?.length > 0 ? (
                        patient.conditions.map((item, idx) => (
                          <span key={idx} className="pd-tag pd-tag--blue">
                            <Heart size={12} /> {item}
                          </span>
                        ))
                      ) : (
                        <span className="pd-tag pd-tag--gray">None recorded</span>
                      )}
                    </div>
                  </div>
                  <div className="pd-info-section">
                    <label>Allergies</label>
                    <div className="pd-tags">
                      {patient.allergies?.length > 0 ? (
                        patient.allergies.map((item, idx) => (
                          <span key={idx} className="pd-tag pd-tag--red">• {item}</span>
                        ))
                      ) : (
                        <span className="pd-tag pd-tag--gray">None recorded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prescriptions */}
            {(user?.role === 'doctor' || user?.role === 'hospital_admin') && (
              <div className="panel pd-panel">
                <div className="pd-panel-header">
                  <Pill size={18} />
                  <h3>Medications</h3>
                  {user?.role === 'doctor' && (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => navigate(`/prescription?patientId=${id}`)}
                    >
                      + Add
                    </button>
                  )}
                </div>
                <div className="pd-panel-body pd-panel-body--table">
                  {prescriptions.length > 0 ? (
                    <table className="pd-medications-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.slice(0, 5).map((rx) => (
                          <tr key={rx._id}>
                            <td>
                              <strong>{rx.prescriptionNumber}</strong>
                              <span>{rx.diagnosis}</span>
                            </td>
                            <td>{formatDate(rx.createdAt)}</td>
                            <td>
                              <span className={`pd-med-status pd-med-status--${rx.status}`}>
                                {rx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="pd-empty">No prescriptions found</p>
                  )}
                </div>
              </div>
            )}

            {/* Appointments */}
            <div className="panel pd-panel pd-appointments-panel">
              <div className="pd-panel-header">
                <Calendar size={18} />
                <h3>Appointments</h3>
                <button className="panel-more">...</button>
              </div>
              <div className="pd-tabs">
                <button
                  className={appointmentFilter === "all" ? "active" : ""}
                  onClick={() => setAppointmentFilter("all")}
                >
                  All
                </button>
                <button
                  className={appointmentFilter === "upcoming" ? "active" : ""}
                  onClick={() => setAppointmentFilter("upcoming")}
                >
                  Upcoming
                </button>
                <button
                  className={appointmentFilter === "history" ? "active" : ""}
                  onClick={() => setAppointmentFilter("history")}
                >
                  History
                </button>
              </div>
              <div className="pd-panel-body pd-panel-body--table">
                {filteredAppointments.length > 0 ? (
                  <table className="pd-appointments-table">
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
                      {filteredAppointments.slice(0, 10).map((apt) => (
                        <tr key={apt._id}>
                          <td>{formatDate(apt.date)}</td>
                          <td>{apt.slotTime || "--"}</td>
                          <td>{apt.appointmentType || "Consultation"}</td>
                          <td>
                            <div className="pd-doctor-cell">
                              <strong>{apt.doctorId?.userId?.name || "Doctor"}</strong>
                              <span>{apt.doctorId?.specialty || ""}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusClass(apt.status)}`}>
                              {formatStatus(apt.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="pd-empty">No appointments found</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default PatientDetailsPage;
