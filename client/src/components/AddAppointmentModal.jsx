import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useHospitalSettings } from "../hooks";

const URGENCY_LEVELS = [
  { value: 1, label: "Routine", color: "#10b981" },
  { value: 2, label: "Low", color: "#3b82f6" },
  { value: 3, label: "Moderate", color: "#f59e0b" },
  { value: 4, label: "High", color: "#f97316" },
  { value: 5, label: "Emergency", color: "#ef4444" },
];

function AddAppointmentModal({ isOpen, onClose, onSuccess, hospitalId }) {
  const { appointmentTypes } = useHospitalSettings(hospitalId);
  // Patient state
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  // New patient form
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "",
    dateOfBirth: "",
  });

  // Doctor state
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Appointment state
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointmentType, setAppointmentType] = useState("");
  const [urgencyScore, setUrgencyScore] = useState(3);
  const [notes, setNotes] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch doctors on mount
  useEffect(() => {
    if (isOpen && hospitalId) {
      fetchDoctors();
    }
  }, [isOpen, hospitalId]);

  // Search patients with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearch.length >= 2) {
        searchPatients();
      } else {
        setPatients([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Fetch slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    if (!appointmentType && appointmentTypes.length > 0) {
      setAppointmentType(appointmentTypes[0]);
    }
  }, [appointmentType, appointmentTypes]);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await api.get(`/hospitals/${hospitalId}/doctors`);
      setDoctors(res.data.doctors || []);
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
      toast.error("Failed to load doctors");
    } finally {
      setLoadingDoctors(false);
    }
  };

  const searchPatients = async () => {
    setSearchingPatients(true);
    try {
      const res = await api.get(`/appointments/patients/search?q=${encodeURIComponent(patientSearch)}`);
      setPatients(res.data.patients || []);
    } catch (error) {
      console.error("Failed to search patients:", error);
    } finally {
      setSearchingPatients(false);
    }
  };

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    setSelectedSlot("");
    try {
      const res = await api.get(`/doctors/${selectedDoctor._id}/slots?date=${selectedDate}`);
      const slots = (res.data.slots || []).filter((slot) => slot.available);
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Failed to fetch slots:", error);
      toast.error("Failed to load available slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch("");
    setPatients([]);
    setShowNewPatientForm(false);
  };

  const handleNewPatientSubmit = async () => {
    if (!newPatient.name || !newPatient.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const res = await api.post("/appointments/patients/quick-register", newPatient);
      setSelectedPatient(res.data.patient);
      setShowNewPatientForm(false);
      setNewPatient({ name: "", phone: "", email: "", gender: "", dateOfBirth: "" });
      toast.success(res.data.message || "Patient registered");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to register patient");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (!selectedDoctor) {
      toast.error("Please select a doctor");
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/appointments/manual", {
        patientId: selectedPatient._id,
        doctorId: selectedDoctor._id,
        date: selectedDate,
        slotTime: selectedSlot,
        appointmentType,
        urgencyScore,
        notes,
      });

      toast.success("Appointment booked successfully!");
      onSuccess?.(res.data.appointment);
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setPatients([]);
    setSelectedDoctor(null);
    setSelectedDate("");
    setSelectedSlot("");
    setAvailableSlots([]);
    setAppointmentType(appointmentTypes[0] || "");
    setUrgencyScore(3);
    setNotes("");
    setShowNewPatientForm(false);
    setNewPatient({ name: "", phone: "", email: "", gender: "", dateOfBirth: "" });
    onClose();
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split("T")[0];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-appointment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Appointment</h2>
          <button className="modal-close" onClick={handleClose} type="button">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Patient Selection */}
          <div className="form-section">
            <label className="form-label">Patient *</label>

            {selectedPatient ? (
              <div className="selected-item">
                <div className="selected-item-info">
                  <strong>{selectedPatient.name}</strong>
                  <span>{selectedPatient.phone}</span>
                </div>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => setSelectedPatient(null)}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Search patient by name or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="form-input"
                  />
                  {searchingPatients && <span className="search-spinner">...</span>}
                </div>

                {patients.length > 0 && (
                  <ul className="search-results">
                    {patients.map((patient) => (
                      <li key={patient._id} onClick={() => handleSelectPatient(patient)}>
                        <strong>{patient.name}</strong>
                        <span>{patient.phone}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {patientSearch.length >= 2 && patients.length === 0 && !searchingPatients && (
                  <p className="no-results">No patients found</p>
                )}

                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setShowNewPatientForm(!showNewPatientForm)}
                >
                  {showNewPatientForm ? "Cancel" : "+ Add New Patient (Walk-in)"}
                </button>

                {showNewPatientForm && (
                  <div className="new-patient-form">
                    <div className="form-row">
                      <input
                        type="text"
                        placeholder="Patient Name *"
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                        className="form-input"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number *"
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-row">
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                        className="form-input"
                      />
                      <select
                        value={newPatient.gender}
                        onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                        className="form-input"
                      >
                        <option value="">Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button type="button" className="btn-secondary" onClick={handleNewPatientSubmit}>
                      Register Patient
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Doctor Selection */}
          <div className="form-section">
            <label className="form-label">Doctor *</label>
            {loadingDoctors ? (
              <p>Loading doctors...</p>
            ) : (
              <select
                value={selectedDoctor?._id || ""}
                onChange={(e) => {
                  const doc = doctors.find((d) => d._id === e.target.value);
                  setSelectedDoctor(doc);
                  setSelectedSlot("");
                  setAvailableSlots([]);
                }}
                className="form-input"
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.userId?.name || "Doctor"} - {doctor.specialty}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Selection */}
          <div className="form-section">
            <label className="form-label">Date *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
              className="form-input"
              required
            />
          </div>

          {/* Time Slot Selection */}
          <div className="form-section">
            <label className="form-label">Time Slot *</label>
            {loadingSlots ? (
              <p>Loading available slots...</p>
            ) : selectedDoctor && selectedDate ? (
              availableSlots.length > 0 ? (
                <div className="slots-grid">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      className={`slot-btn ${selectedSlot === slot.time ? "selected" : ""}`}
                      onClick={() => setSelectedSlot(slot.time)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="no-results">No available slots for this date</p>
              )
            ) : (
              <p className="hint">Select doctor and date first</p>
            )}
          </div>

          {/* Appointment Type */}
          <div className="form-section">
            <label className="form-label">Appointment Type</label>
            <div className="radio-group">
              {appointmentTypes.map((type) => (
                <label key={type} className="radio-label">
                  <input
                    type="radio"
                    name="appointmentType"
                    value={type}
                    checked={appointmentType === type}
                    onChange={(e) => setAppointmentType(e.target.value)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="form-section">
            <label className="form-label">Priority/Urgency</label>
            <div className="urgency-selector">
              {URGENCY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  className={`urgency-btn ${urgencyScore === level.value ? "selected" : ""}`}
                  style={{
                    borderColor: urgencyScore === level.value ? level.color : "#e5e7eb",
                    backgroundColor: urgencyScore === level.value ? level.color : "transparent",
                    color: urgencyScore === level.value ? "#fff" : "#374151",
                  }}
                  onClick={() => setUrgencyScore(level.value)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-section">
            <label className="form-label">Notes / Reason for Visit</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter reason for visit or symptoms..."
              className="form-input form-textarea"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAppointmentModal;
