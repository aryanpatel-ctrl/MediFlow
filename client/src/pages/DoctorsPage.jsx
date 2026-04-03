import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";

const SPECIALTIES = [
  "All",
  "General Medicine",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "Dermatology",
  "ENT",
  "Ophthalmology",
  "Gastroenterology",
  "Pulmonology",
  "Psychiatry",
  "Emergency"
];

const PORTRAIT_TONES = ['peach', 'mint', 'sky', 'sand', 'rose', 'slate', 'blush', 'stone', 'lilac', 'cream'];

function DoctorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDoctors();
  }, [user]);

  const fetchDoctors = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      let url = '/doctors';
      if (hospitalId) {
        url = `/hospitals/${hospitalId}/doctors`;
      }

      const res = await api.get(url);
      const doctorsList = res.data.doctors || [];

      // Add display properties
      const enrichedDoctors = doctorsList.map((doc, index) => ({
        ...doc,
        name: doc.userId?.name || 'Doctor',
        email: doc.userId?.email || '',
        phone: doc.userId?.phone || '',
        status: doc.isAcceptingPatients ? 'Available' : 'Unavailable',
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

    const days = Object.entries(availability)
      .filter(([_, val]) => val?.isAvailable)
      .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3));

    if (days.length === 0) return 'No availability';
    if (days.length === 7) return 'Mon - Sun';
    if (days.length >= 5) return 'Mon - Fri';

    return days.join(', ');
  };

  const filteredDoctors = doctors.filter(doc => {
    const matchesSpecialty = activeTab === "All" || doc.specialty === activeTab;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "available" && doc.status === "Available") ||
      (statusFilter === "unavailable" && doc.status === "Unavailable");
    return matchesSpecialty && matchesStatus;
  });

  const handleAddDoctor = () => {
    navigate('/doctors/add');
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

  return (
    <AppLayout title="Doctors" subtitle="Browse specialists and manage doctor profiles">
      <main className="doctors-page">
        <section className="panel doctors-directory-card">
          <div className="doctors-toolbar">
            <div className="doctor-tabs" aria-label="Doctor categories">
              {SPECIALTIES.slice(0, 8).map((tab) => (
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
                    <p className="doctor-meta">
                      {doctor.experience} yrs exp | Rs. {doctor.consultationFee}
                    </p>
                  </div>

                  <div className="doctor-card__footer">
                    <div className="doctor-rating">
                      {doctor.rating?.average > 0 && (
                        <span>Rating: {doctor.rating.average}/5</span>
                      )}
                    </div>
                    <button
                      className="assign-button"
                      type="button"
                      onClick={() => navigate(`/doctors/details?id=${doctor._id}`)}
                    >
                      View Details
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
