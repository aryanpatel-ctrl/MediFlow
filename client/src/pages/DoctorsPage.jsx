import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";
import AddDoctorModal from "../components/AddDoctorModal";

const SPECIALTY_PRIORITY = [
  "General Medicine",
  "Pediatrics",
  "Cardiology",
  "Orthopedics",
  "Dermatology",
  "Neurology",
  "ENT",
  "Ophthalmology",
  "Gastroenterology",
  "Pulmonology",
  "Psychiatry",
  "Gynecology",
  "Emergency",
];

const PORTRAIT_TONES = ['peach', 'mint', 'sky', 'sand', 'rose', 'slate', 'blush', 'stone', 'lilac', 'cream'];

function DoctorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, [user]);

  const fetchDoctors = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      const res = await api.get('/doctors', {
        params: hospitalId ? { hospitalId } : undefined
      });
      const doctorsList = res.data.doctors || [];

      const enrichedDoctors = doctorsList.map((doc, index) => ({
        ...doc,
        name: doc.userId?.name || 'Doctor',
        email: doc.userId?.email || '',
        phone: doc.userId?.phone || '',
        status: doc.isAcceptingPatients !== false ? 'Available' : 'Unavailable',
        portraitTone: PORTRAIT_TONES[index % PORTRAIT_TONES.length],
        schedule: formatSchedule(doc.availability)
      }));

      setDoctors(enrichedDoctors);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSchedule = (availability) => {
    if (!availability || typeof availability !== 'object') return 'Schedule not set';

    const dayLabels = {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    };

    const activeDays = Object.entries(availability)
      .filter(([_, value]) => value?.isAvailable && value?.slots?.length)
      .map(([day, value]) => ({
        label: dayLabels[day] || day,
        slots: value.slots,
      }));

    if (activeDays.length === 0) {
      return 'No availability';
    }

    const firstDay = activeDays[0];
    const lastDay = activeDays[activeDays.length - 1];
    const firstSlot = firstDay.slots[0];
    const lastSlot = firstDay.slots[firstDay.slots.length - 1];
    const timeRange = firstSlot?.startTime && lastSlot?.endTime
      ? `${firstSlot.startTime} - ${lastSlot.endTime}`
      : 'Schedule not set';

    if (activeDays.length === 1) {
      return `${firstDay.label} | ${timeRange}`;
    }

    return `${firstDay.label} - ${lastDay.label} | ${timeRange}`;
  };

  const specialtyTabs = [
    "All",
    ...SPECIALTY_PRIORITY.filter((specialty) =>
      doctors.some((doctor) => doctor.specialty === specialty)
    )
  ];

  const filteredDoctors = doctors.filter(doc => {
    const matchesSpecialty = activeTab === "All" || doc.specialty === activeTab;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "available" && doc.status === "Available") ||
      (statusFilter === "unavailable" && doc.status === "Unavailable");
    return matchesSpecialty && matchesStatus;
  });

  const handleAddDoctor = () => {
    setShowAddModal(true);
  };

  const handleDoctorAdded = () => {
    fetchDoctors();
  };

  if (loading) {
    return (
      <AppLayout title="Doctors" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading doctors...</p>
        </div>
      </AppLayout>
    );
  }

  const hospitalId = user?.hospitalId?._id || user?.hospitalId;

  return (
    <AppLayout title="Doctors" subtitle="Browse specialists and manage patient assignments">
      <AddDoctorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleDoctorAdded}
        hospitalId={hospitalId}
      />
      <main className="doctors-page">
        <section className="panel doctors-directory-card">
          <div className="doctors-toolbar">
            <div className="doctor-tabs" aria-label="Doctor categories">
              {specialtyTabs.map((tab) => (
                <button
                  className={`doctor-tab${activeTab === tab ? " is-active" : ""}`}
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="doctors-actions">
              <select
                className="doctor-action ghost"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
              {user?.role === 'hospital_admin' && (
                <button
                  className="doctor-action primary"
                  type="button"
                  onClick={handleAddDoctor}
                >
                  Add New Doctor
                </button>
              )}
            </div>
          </div>

          {filteredDoctors.length > 0 ? (
            <section className="doctors-grid">
              {filteredDoctors.map((doctor) => (
                <article className="doctor-card" key={doctor._id}>
                  <div className="doctor-card__head">
                    <div>
                      <h2>{doctor.name}</h2>
                      <span className={`doctor-badge doctor-badge--${doctor.status.toLowerCase()}`}>
                        {doctor.status}
                      </span>
                    </div>
                    <button className="panel-more" type="button" aria-label={`${doctor.name} actions`}>
                      ...
                    </button>
                  </div>

                  <div className={`doctor-portrait doctor-portrait--${doctor.portraitTone}`} aria-hidden="true">
                    <div className="doctor-illustration">
                      <span className="doctor-initials">
                        {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  </div>

                  <div className="doctor-card__info">
                    <strong>{doctor.specialty}</strong>
                    <p>{doctor.schedule}</p>
                  </div>

                  <div className="doctor-card__footer">
                    <div className="doctor-contact-icons" aria-hidden="true">
                      <span className="doctor-contact-icon" />
                      <span className="doctor-contact-icon" />
                    </div>
                    <button
                      className="assign-button"
                      type="button"
                      onClick={() => navigate(`/doctors/details?id=${doctor._id}`)}
                    >
                      Assign Patient
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <div className="empty-state">
              <p>No doctors found</p>
              {user?.role === 'hospital_admin' && (
                <button className="btn-primary" onClick={handleAddDoctor}>
                  Add Your First Doctor
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

export default DoctorsPage;
