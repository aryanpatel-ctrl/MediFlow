import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";
import MediFlowDataTable from "../components/DataTable";

function PatientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      case 'completed': return 'completed';
      case 'booked':
      case 'confirmed': return 'scheduled';
      case 'checked_in':
      case 'in_consultation': return 'ongoing';
      case 'cancelled':
      case 'no_show': return 'canceled';
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

  // Define table columns
  const tableColumns = useMemo(() => [
    {
      name: "Patient",
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => (
        <div className="table-user-cell">
          <div
            className="table-avatar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--accent)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          >
            {row.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
          </div>
          <div className="table-user-info">
            <span className="table-user-name" style={{ color: "var(--accent)" }}>
              {row.name}
            </span>
            <span className="table-user-email">{row.gender || '--'}</span>
          </div>
        </div>
      ),
      minWidth: "180px",
    },
    {
      name: "Phone",
      selector: (row) => row.phone,
      sortable: true,
      minWidth: "130px",
    },
    {
      name: "Condition",
      selector: (row) => row.condition,
      sortable: true,
      cell: (row) => (
        <span title={row.condition}>
          {row.condition?.slice(0, 25) || '--'}{row.condition?.length > 25 ? '...' : ''}
        </span>
      ),
      minWidth: "150px",
    },
    {
      name: "Last Doctor",
      selector: (row) => row.lastDoctor,
      sortable: true,
      cell: (row) => (
        <div className="table-user-info">
          <span className="table-user-name">{row.lastDoctor}</span>
          <span className="table-user-email">{row.lastSpecialty}</span>
        </div>
      ),
      minWidth: "150px",
    },
    {
      name: "Last Visit",
      selector: (row) => new Date(row.lastVisit).getTime(),
      sortable: true,
      cell: (row) => (
        <div className="table-user-info">
          <span className="table-user-name">
            {row.lastVisit ? new Date(row.lastVisit).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }) : '--'}
          </span>
        </div>
      ),
      minWidth: "120px",
    },
    {
      name: "Visits",
      selector: (row) => row.totalVisits,
      sortable: true,
      minWidth: "80px",
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <span className={`status-badge ${getStatusClass(row.status)}`}>
          {getStatusLabel(row.status)}
        </span>
      ),
      minWidth: "120px",
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="table-actions">
          <button
            className="table-action-btn view"
            onClick={() => navigate(`/patients/${row._id}`)}
            title="View Patient"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      minWidth: "80px",
    },
  ], [navigate]);

  // Filter actions
  const tableActions = (
    <select
      className="filter-select"
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
    >
      <option value="all">All Patients</option>
      <option value="active">Active</option>
      <option value="completed">Completed</option>
    </select>
  );

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
        <MediFlowDataTable
          title={
            <div className="datatable-title">
              <h2>Patients</h2>
              <p>{filteredPatients.length} patients</p>
            </div>
          }
          columns={tableColumns}
          data={filteredPatients}
          loading={loading}
          selectableRows={false}
          searchable={true}
          searchFields={["name", "phone", "condition", "lastDoctor"]}
          pagination={true}
          paginationPerPage={10}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          actions={tableActions}
          onRowClicked={(row) => navigate(`/patients/${row._id}`)}
          noDataMessage="No patients found"
        />
      </main>
    </AppLayout>
  );
}

export default PatientsPage;
