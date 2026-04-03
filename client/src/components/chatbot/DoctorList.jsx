import { useEffect } from 'react';
import { useDoctors } from '../../hooks';
import DoctorCard from './DoctorCard';

function DoctorList({ specialty, hospitalId, selectedDoctor, onSelectDoctor }) {
  const { doctors, loading, error, getDoctors } = useDoctors();

  useEffect(() => {
    getDoctors({ hospitalId, specialty });
  }, [getDoctors, hospitalId, specialty]);

  if (loading) {
    return (
      <div className="doctor-list doctor-list--loading">
        <div className="loading-spinner"></div>
        <p>Finding available doctors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="doctor-list doctor-list--error">
        <p>Failed to load doctors. Please try again.</p>
      </div>
    );
  }

  if (!doctors || doctors.length === 0) {
    return (
      <div className="doctor-list doctor-list--empty">
        <p>No doctors available for {specialty} at the moment.</p>
      </div>
    );
  }

  return (
    <div className="doctor-list">
      <div className="doctor-list__header">
        <h3>Available Doctors</h3>
        <p>{doctors.length} doctors found for {specialty}</p>
      </div>

      <div className="doctor-list__grid">
        {doctors.map((doctor) => (
          <DoctorCard
            key={doctor._id}
            doctor={doctor}
            selected={selectedDoctor?._id === doctor._id}
            onSelect={onSelectDoctor}
          />
        ))}
      </div>
    </div>
  );
}

export default DoctorList;
