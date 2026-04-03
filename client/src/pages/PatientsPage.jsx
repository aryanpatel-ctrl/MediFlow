import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";

function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchPatients();
  }, [user]);

  const fetchPatients = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
        return;
      }

      // Get doctors first
      const doctorsRes = await api.get(`/hospitals/${hospitalId}/doctors`);
      const doctors = doctorsRes.data.doctors || [];

      // Get appointments for all doctors to extract patient data
      const patientMap = new Map();

      for (const doc of doctors) {
        try {
          const apptRes = await api.get(`/doctors/${doc._id}/appointments`);

          if (apptRes.data.appointments) {
            apptRes.data.appointments.forEach(appt => {
              if (appt.patientId && !patientMap.has(appt.patientId._id)) {
                const patient = appt.patientId;
                patientMap.set(patient._id, {
                  _id: patient._id,
                  name: patient.name || 'Patient',
                  phone: patient.phone || '--',
                  gender: patient.gender || '--',
                  email: patient.email || '--',
                  lastVisit: appt.date,
                  lastDoctor: doc.userId?.name || 'Doctor',
                  lastSpecialty: doc.specialty,
                  condition: appt.triageData?.symptoms?.join(', ') || '--',
                  status: appt.status,
                  totalVisits: 1
                });
              } else if (appt.patientId) {
                // Update visit count
                const existing = patientMap.get(appt.patientId._id);
                if (existing) {
                  existing.totalVisits++;
                  // Update with most recent appointment info
                  if (new Date(appt.date) > new Date(existing.lastVisit)) {
                    existing.lastVisit = appt.date;
                    existing.lastDoctor = doc.userId?.name || 'Doctor';
                    existing.lastSpecialty = doc.specialty;
                    existing.condition = appt.triageData?.symptoms?.join(', ') || existing.condition;
                    existing.status = appt.status;
                  }
                }
              }
            });
          }
        } catch (err) {
          console.log(`Could not fetch appointments for doctor ${doc._id}`);
        }
      }

      setPatients(Array.from(patientMap.values()));
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'discharged';
      case 'booked':
      case 'confirmed': return 'scheduled';
      case 'checked_in':
      case 'in_consultation': return 'in-treatment';
      case 'cancelled':
      case 'no_show': return 'cancelled';
      default: return 'scheduled';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'Completed';
      case 'booked':
      case 'confirmed': return 'Scheduled';
      case 'checked_in':
      case 'in_consultation': return 'In Treatment';
      case 'cancelled': return 'Cancelled';
      case 'no_show': return 'No Show';
      default: return status || 'Unknown';
    }
  };

  const filteredPatients = patients.filter(p => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return ['booked', 'confirmed', 'checked_in', 'in_consultation'].includes(p.status);
    if (statusFilter === "completed") return p.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <AppLayout title="Patients" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading patients...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Patients" subtitle="Monitor appointments and patient history">
      <main className="patients-page">
        <section className="panel patients-table-card">
          <div className="patients-header">
            <h2>Patients ({filteredPatients.length})</h2>
            <div className="patients-filters">
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Patients</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            {filteredPatients.length > 0 ? (
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Condition</th>
                    <th>Last Doctor</th>
                    <th>Last Visit</th>
                    <th>Visits</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <div className="table-person">
                          <span className="table-avatar">
                            {row.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                          </span>
                          <div>
                            <strong>{row.name}</strong>
                            <p>{row.gender || '--'}</p>
                          </div>
                        </div>
                      </td>
                      <td>{row.phone}</td>
                      <td>{row.condition?.slice(0, 30) || '--'}{row.condition?.length > 30 ? '...' : ''}</td>
                      <td>
                        <div className="table-meta">
                          <strong>{row.lastDoctor}</strong>
                          <p>{row.lastSpecialty}</p>
                        </div>
                      </td>
                      <td>{row.lastVisit ? new Date(row.lastVisit).toLocaleDateString() : '--'}</td>
                      <td>{row.totalVisits}</td>
                      <td>
                        <span className={`status-pill patient-status patient-status--${getStatusClass(row.status)}`}>
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No patients found</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default PatientsPage;
