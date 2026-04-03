function DoctorCard({ doctor, onSelect, selected }) {
  return (
    <div
      className={`doctor-card ${selected ? 'doctor-card--selected' : ''}`}
      onClick={() => onSelect(doctor)}
    >
      <div className="doctor-card__avatar">
        {doctor.userId?.name?.charAt(0) || 'D'}
      </div>

      <div className="doctor-card__info">
        <h4>{doctor.userId?.name || 'Doctor'}</h4>
        <p className="doctor-card__specialty">{doctor.specialty}</p>

        <div className="doctor-card__meta">
          <span className="doctor-card__experience">
            {doctor.experience} yrs exp
          </span>
          <span className="doctor-card__rating">
            ★ {doctor.rating?.average?.toFixed(1) || '4.5'}
          </span>
        </div>

        <div className="doctor-card__footer">
          <span className="doctor-card__fee">₹{doctor.consultationFee}</span>
          <span className="doctor-card__duration">{doctor.slotDuration} min</span>
        </div>
      </div>

      {selected && <span className="doctor-card__check">✓</span>}
    </div>
  );
}

export default DoctorCard;
