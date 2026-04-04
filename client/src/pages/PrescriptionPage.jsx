import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../hooks';
import api from '../services/api';
import toast from 'react-hot-toast';

const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'As needed',
  'Before meals',
  'After meals',
  'At bedtime'
];

const TIMINGS = [
  'Morning',
  'Afternoon',
  'Evening',
  'Night',
  'Before breakfast',
  'After breakfast',
  'Before lunch',
  'After lunch',
  'Before dinner',
  'After dinner',
  'With meals',
  'Empty stomach'
];

const DURATION_UNITS = ['days', 'weeks', 'months'];

function PrescriptionPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const patientId = searchParams.get('patientId');
  const appointmentId = searchParams.get('appointmentId');

  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicineResults, setMedicineResults] = useState([]);
  const [searchingMedicine, setSearchingMedicine] = useState(false);

  // Prescription form state
  const [prescription, setPrescription] = useState({
    diagnosis: '',
    symptoms: [],
    medications: [],
    labTests: [],
    advice: [],
    followUpDate: '',
    followUpInstructions: '',
    vitalSigns: {
      bloodPressure: '',
      pulse: '',
      temperature: '',
      weight: '',
      oxygenSaturation: ''
    },
    notes: ''
  });

  const [symptomInput, setSymptomInput] = useState('');
  const [adviceInput, setAdviceInput] = useState('');
  const [labTestInput, setLabTestInput] = useState({ testName: '', instructions: '', urgency: 'routine' });

  // Medication being added
  const [currentMedication, setCurrentMedication] = useState({
    medicine: null,
    dosage: '',
    frequency: 'Twice daily',
    timing: 'After meals',
    duration: { value: 5, unit: 'days' },
    quantity: 10,
    instructions: ''
  });

  useEffect(() => {
    if (patientId) {
      fetchData();
    }
  }, [patientId]);

  const fetchData = async () => {
    try {
      // Get doctor profile
      const doctorsRes = await api.get('/doctors', { params: { userId: user?._id } });
      const doctorData = doctorsRes.data.doctors?.find(
        d => d.userId?._id === user?._id || d.userId === user?._id
      );
      setDoctor(doctorData);

      // Get patient info
      const patientRes = await api.get(`/appointments/patients/${patientId}`);
      setPatient(patientRes.data.patient);

    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Search medicines
  useEffect(() => {
    const searchMedicines = async () => {
      if (medicineSearch.length < 2) {
        setMedicineResults([]);
        return;
      }

      setSearchingMedicine(true);
      try {
        const res = await api.get('/medicines/search', {
          params: { q: medicineSearch, limit: 10 }
        });
        setMedicineResults(res.data.medicines || []);
      } catch (error) {
        console.error('Medicine search failed:', error);
      } finally {
        setSearchingMedicine(false);
      }
    };

    const debounce = setTimeout(searchMedicines, 300);
    return () => clearTimeout(debounce);
  }, [medicineSearch]);

  const selectMedicine = (medicine) => {
    setCurrentMedication({
      ...currentMedication,
      medicine: medicine,
      dosage: medicine.commonDosages?.[0] || medicine.strength
    });
    setMedicineSearch('');
    setMedicineResults([]);
  };

  const addMedication = () => {
    if (!currentMedication.medicine) {
      toast.error('Please select a medicine');
      return;
    }

    setPrescription({
      ...prescription,
      medications: [
        ...prescription.medications,
        {
          ...currentMedication,
          medicine: currentMedication.medicine._id,
          medicineName: currentMedication.medicine.name,
          medicineType: currentMedication.medicine.type
        }
      ]
    });

    setCurrentMedication({
      medicine: null,
      dosage: '',
      frequency: 'Twice daily',
      timing: 'After meals',
      duration: { value: 5, unit: 'days' },
      quantity: 10,
      instructions: ''
    });
  };

  const removeMedication = (index) => {
    const updated = [...prescription.medications];
    updated.splice(index, 1);
    setPrescription({ ...prescription, medications: updated });
  };

  const addSymptom = () => {
    if (symptomInput.trim()) {
      setPrescription({
        ...prescription,
        symptoms: [...prescription.symptoms, symptomInput.trim()]
      });
      setSymptomInput('');
    }
  };

  const removeSymptom = (index) => {
    const updated = [...prescription.symptoms];
    updated.splice(index, 1);
    setPrescription({ ...prescription, symptoms: updated });
  };

  const addAdvice = () => {
    if (adviceInput.trim()) {
      setPrescription({
        ...prescription,
        advice: [...prescription.advice, adviceInput.trim()]
      });
      setAdviceInput('');
    }
  };

  const removeAdvice = (index) => {
    const updated = [...prescription.advice];
    updated.splice(index, 1);
    setPrescription({ ...prescription, advice: updated });
  };

  const addLabTest = () => {
    if (labTestInput.testName.trim()) {
      setPrescription({
        ...prescription,
        labTests: [...prescription.labTests, { ...labTestInput }]
      });
      setLabTestInput({ testName: '', instructions: '', urgency: 'routine' });
    }
  };

  const removeLabTest = (index) => {
    const updated = [...prescription.labTests];
    updated.splice(index, 1);
    setPrescription({ ...prescription, labTests: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!prescription.diagnosis) {
      toast.error('Please enter a diagnosis');
      return;
    }

    if (prescription.medications.length === 0) {
      toast.error('Please add at least one medication');
      return;
    }

    setSubmitting(true);
    try {
      const prescriptionData = {
        patientId,
        appointmentId: appointmentId || undefined,
        diagnosis: prescription.diagnosis,
        symptoms: prescription.symptoms,
        medications: prescription.medications.map(med => ({
          medicine: med.medicine,
          dosage: med.dosage,
          frequency: med.frequency,
          timing: med.timing,
          duration: med.duration,
          quantity: med.quantity,
          instructions: med.instructions
        })),
        labTests: prescription.labTests,
        advice: prescription.advice,
        followUpDate: prescription.followUpDate || undefined,
        followUpInstructions: prescription.followUpInstructions || undefined,
        vitalSigns: Object.values(prescription.vitalSigns).some(v => v)
          ? prescription.vitalSigns
          : undefined,
        notes: prescription.notes || undefined
      };

      const res = await api.post('/prescriptions', prescriptionData);
      toast.success('Prescription created successfully');
      navigate(`/patients/${patientId}`);
    } catch (error) {
      console.error('Failed to create prescription:', error);
      toast.error(error.response?.data?.message || 'Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Create Prescription">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout title="Create Prescription">
        <div className="error-state">
          <p>Patient not found. Please select a patient first.</p>
          <button className="btn-primary" onClick={() => navigate('/patients')}>
            Go to Patients
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Create Prescription"
    >
      <main className="prescription-page">
        <form onSubmit={handleSubmit} className="prescription-form">
          {/* Patient Info Header */}
          <section className="panel prescription-patient-info">
            <h3>Patient Information</h3>
            <div className="patient-info-grid">
              <div className="info-item">
                <label>Name</label>
                <span>{patient.userId?.name || patient.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Age</label>
                <span>
                  {patient.userId?.dateOfBirth || patient.dateOfBirth
                    ? Math.floor((new Date() - new Date(patient.userId?.dateOfBirth || patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                    : 'N/A'} years
                </span>
              </div>
              <div className="info-item">
                <label>Gender</label>
                <span>{patient.userId?.gender || patient.gender || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Phone</label>
                <span>{patient.userId?.phone || patient.phone || 'N/A'}</span>
              </div>
            </div>
          </section>

          {/* Vitals Section */}
          <section className="panel prescription-vitals">
            <h3>Vital Signs</h3>
            <div className="vitals-grid">
              <div className="form-group">
                <label>Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={prescription.vitalSigns.bloodPressure}
                  onChange={(e) => setPrescription({
                    ...prescription,
                    vitalSigns: { ...prescription.vitalSigns, bloodPressure: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Pulse (bpm)</label>
                <input
                  type="number"
                  placeholder="72"
                  value={prescription.vitalSigns.pulse}
                  onChange={(e) => setPrescription({
                    ...prescription,
                    vitalSigns: { ...prescription.vitalSigns, pulse: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Temperature (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={prescription.vitalSigns.temperature}
                  onChange={(e) => setPrescription({
                    ...prescription,
                    vitalSigns: { ...prescription.vitalSigns, temperature: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={prescription.vitalSigns.weight}
                  onChange={(e) => setPrescription({
                    ...prescription,
                    vitalSigns: { ...prescription.vitalSigns, weight: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>SpO2 (%)</label>
                <input
                  type="number"
                  placeholder="98"
                  value={prescription.vitalSigns.oxygenSaturation}
                  onChange={(e) => setPrescription({
                    ...prescription,
                    vitalSigns: { ...prescription.vitalSigns, oxygenSaturation: e.target.value }
                  })}
                />
              </div>
            </div>
          </section>

          {/* Diagnosis Section */}
          <section className="panel prescription-diagnosis">
            <h3>Diagnosis & Symptoms</h3>
            <div className="form-group">
              <label>Primary Diagnosis *</label>
              <input
                type="text"
                placeholder="Enter diagnosis..."
                value={prescription.diagnosis}
                onChange={(e) => setPrescription({ ...prescription, diagnosis: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Symptoms</label>
              <div className="tag-input-container">
                <div className="tags-list">
                  {prescription.symptoms.map((symptom, index) => (
                    <span key={index} className="tag">
                      {symptom}
                      <button type="button" onClick={() => removeSymptom(index)}>&times;</button>
                    </span>
                  ))}
                </div>
                <div className="tag-input-row">
                  <input
                    type="text"
                    placeholder="Add symptom..."
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom())}
                  />
                  <button type="button" className="btn-secondary" onClick={addSymptom}>Add</button>
                </div>
              </div>
            </div>
          </section>

          {/* Medications Section */}
          <section className="panel prescription-medications">
            <h3>Medications</h3>

            {/* Added Medications */}
            {prescription.medications.length > 0 && (
              <div className="medications-list">
                {prescription.medications.map((med, index) => (
                  <div key={index} className="medication-item">
                    <div className="medication-header">
                      <strong>{med.medicineName}</strong>
                      <span className="medication-type">{med.medicineType}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeMedication(index)}
                      >
                        &times;
                      </button>
                    </div>
                    <div className="medication-details">
                      <span>{med.dosage}</span>
                      <span>|</span>
                      <span>{med.frequency}</span>
                      <span>|</span>
                      <span>{med.timing}</span>
                      <span>|</span>
                      <span>{med.duration.value} {med.duration.unit}</span>
                      <span>|</span>
                      <span>Qty: {med.quantity}</span>
                    </div>
                    {med.instructions && (
                      <div className="medication-instructions">
                        <em>{med.instructions}</em>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add New Medication */}
            <div className="add-medication-form">
              <div className="form-group medicine-search">
                <label>Search Medicine</label>
                <input
                  type="text"
                  placeholder="Type medicine name..."
                  value={currentMedication.medicine ? currentMedication.medicine.name : medicineSearch}
                  onChange={(e) => {
                    if (currentMedication.medicine) {
                      setCurrentMedication({ ...currentMedication, medicine: null });
                    }
                    setMedicineSearch(e.target.value);
                  }}
                />
                {searchingMedicine && <div className="search-loading">Searching...</div>}
                {medicineResults.length > 0 && (
                  <div className="medicine-results">
                    {medicineResults.map(med => (
                      <div
                        key={med._id}
                        className="medicine-result-item"
                        onClick={() => selectMedicine(med)}
                      >
                        <strong>{med.name}</strong>
                        <span className="generic-name">{med.genericName}</span>
                        <span className="medicine-info">{med.type} | {med.strength}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {currentMedication.medicine && (
                <>
                  <div className="medication-form-grid">
                    <div className="form-group">
                      <label>Dosage</label>
                      <select
                        value={currentMedication.dosage}
                        onChange={(e) => setCurrentMedication({
                          ...currentMedication,
                          dosage: e.target.value
                        })}
                      >
                        {currentMedication.medicine.commonDosages?.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                        <option value={currentMedication.medicine.strength}>
                          {currentMedication.medicine.strength}
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Frequency</label>
                      <select
                        value={currentMedication.frequency}
                        onChange={(e) => setCurrentMedication({
                          ...currentMedication,
                          frequency: e.target.value
                        })}
                      >
                        {FREQUENCIES.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Timing</label>
                      <select
                        value={currentMedication.timing}
                        onChange={(e) => setCurrentMedication({
                          ...currentMedication,
                          timing: e.target.value
                        })}
                      >
                        {TIMINGS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group duration-group">
                      <label>Duration</label>
                      <div className="duration-inputs">
                        <input
                          type="number"
                          min="1"
                          value={currentMedication.duration.value}
                          onChange={(e) => setCurrentMedication({
                            ...currentMedication,
                            duration: { ...currentMedication.duration, value: parseInt(e.target.value) }
                          })}
                        />
                        <select
                          value={currentMedication.duration.unit}
                          onChange={(e) => setCurrentMedication({
                            ...currentMedication,
                            duration: { ...currentMedication.duration, unit: e.target.value }
                          })}
                        >
                          {DURATION_UNITS.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={currentMedication.quantity}
                        onChange={(e) => setCurrentMedication({
                          ...currentMedication,
                          quantity: parseInt(e.target.value)
                        })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Special Instructions (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Take with warm water"
                      value={currentMedication.instructions}
                      onChange={(e) => setCurrentMedication({
                        ...currentMedication,
                        instructions: e.target.value
                      })}
                    />
                  </div>

                  <button type="button" className="btn-secondary" onClick={addMedication}>
                    + Add Medication
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Lab Tests Section */}
          <section className="panel prescription-labtests">
            <h3>Lab Tests</h3>

            {prescription.labTests.length > 0 && (
              <div className="labtests-list">
                {prescription.labTests.map((test, index) => (
                  <div key={index} className="labtest-item">
                    <div className="labtest-header">
                      <strong>{test.testName}</strong>
                      <span className={`urgency-badge urgency-${test.urgency}`}>{test.urgency}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeLabTest(index)}
                      >
                        &times;
                      </button>
                    </div>
                    {test.instructions && (
                      <div className="labtest-instructions">{test.instructions}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="add-labtest-form">
              <div className="labtest-form-row">
                <input
                  type="text"
                  placeholder="Test name (e.g., CBC, Blood Sugar)"
                  value={labTestInput.testName}
                  onChange={(e) => setLabTestInput({ ...labTestInput, testName: e.target.value })}
                />
                <select
                  value={labTestInput.urgency}
                  onChange={(e) => setLabTestInput({ ...labTestInput, urgency: e.target.value })}
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
                <button type="button" className="btn-secondary" onClick={addLabTest}>Add</button>
              </div>
              <input
                type="text"
                placeholder="Instructions (optional)"
                value={labTestInput.instructions}
                onChange={(e) => setLabTestInput({ ...labTestInput, instructions: e.target.value })}
              />
            </div>
          </section>

          {/* Advice Section */}
          <section className="panel prescription-advice">
            <h3>Advice & Instructions</h3>

            {prescription.advice.length > 0 && (
              <div className="advice-list">
                {prescription.advice.map((item, index) => (
                  <div key={index} className="advice-item">
                    <span>{item}</span>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeAdvice(index)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-advice-form">
              <input
                type="text"
                placeholder="Add advice (e.g., Rest for 2 days, Avoid spicy food)"
                value={adviceInput}
                onChange={(e) => setAdviceInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAdvice())}
              />
              <button type="button" className="btn-secondary" onClick={addAdvice}>Add</button>
            </div>
          </section>

          {/* Follow-up Section */}
          <section className="panel prescription-followup">
            <h3>Follow-up</h3>
            <div className="followup-grid">
              <div className="form-group">
                <label>Follow-up Date</label>
                <input
                  type="date"
                  value={prescription.followUpDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPrescription({ ...prescription, followUpDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Follow-up Instructions</label>
                <input
                  type="text"
                  placeholder="e.g., Bring lab reports"
                  value={prescription.followUpInstructions}
                  onChange={(e) => setPrescription({ ...prescription, followUpInstructions: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Notes Section */}
          <section className="panel prescription-notes">
            <h3>Additional Notes</h3>
            <textarea
              placeholder="Any additional notes..."
              value={prescription.notes}
              onChange={(e) => setPrescription({ ...prescription, notes: e.target.value })}
              rows={3}
            />
          </section>

          {/* Submit Button */}
          <div className="prescription-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </main>
    </AppLayout>
  );
}

export default PrescriptionPage;
