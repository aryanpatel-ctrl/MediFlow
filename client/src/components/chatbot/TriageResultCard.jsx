const urgencyConfig = {
  1: { label: 'Emergency', color: '#ef4444', bg: '#fef2f2' },
  2: { label: 'High', color: '#f97316', bg: '#fff7ed' },
  3: { label: 'Medium', color: '#eab308', bg: '#fefce8' },
  4: { label: 'Low', color: '#22c55e', bg: '#f0fdf4' },
  5: { label: 'Routine', color: '#3b82f6', bg: '#eff6ff' },
};

function TriageResultCard({ triageResult, onFindDoctors }) {
  if (!triageResult) return null;

  const urgency = urgencyConfig[triageResult.urgencyScore] || urgencyConfig[3];

  return (
    <div className="triage-card">
      <div className="triage-card__header">
        <h3>Assessment Complete</h3>
        <span
          className="triage-card__urgency"
          style={{ backgroundColor: urgency.bg, color: urgency.color }}
        >
          {urgency.label} Priority
        </span>
      </div>

      <div className="triage-card__body">
        {triageResult.possibleConditions?.length > 0 && (
          <div className="triage-card__section">
            <h4>Possible Conditions</h4>
            <ul>
              {triageResult.possibleConditions.map((condition, idx) => (
                <li key={idx}>{condition}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="triage-card__section">
          <h4>Recommended Specialty</h4>
          <p className="triage-card__specialty">{triageResult.recommendedSpecialty}</p>
        </div>

        {triageResult.symptoms?.length > 0 && (
          <div className="triage-card__section">
            <h4>Identified Symptoms</h4>
            <div className="triage-card__tags">
              {triageResult.symptoms.map((symptom, idx) => (
                <span key={idx} className="triage-card__tag">{symptom}</span>
              ))}
            </div>
          </div>
        )}

        {triageResult.precautions && (
          <div className="triage-card__section triage-card__precautions">
            <h4>Immediate Precautions</h4>
            <p>{triageResult.precautions}</p>
          </div>
        )}
      </div>

      <button className="triage-card__action" onClick={onFindDoctors}>
        Find Available Doctors
      </button>
    </div>
  );
}

export default TriageResultCard;
