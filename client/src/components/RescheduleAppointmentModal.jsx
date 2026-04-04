import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const RESCHEDULE_REASONS = [
  "Patient requested different time",
  "Doctor's schedule changed",
  "Emergency rescheduling",
  "Conflict with another appointment",
  "Other"
];

function RescheduleAppointmentModal({ isOpen, onClose, onSuccess, appointment, requestApproval = false }) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get today's date for min date
  const today = new Date().toISOString().split("T")[0];

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

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && appointment?.doctorId) {
      fetchAvailableSlots();
    }
  }, [selectedDate, appointment]);

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    setSelectedSlot("");
    try {
      const doctorId = appointment.doctorId?._id || appointment.doctorId;
      const res = await api.get(`/doctors/${doctorId}/slots?date=${selectedDate}`);
      const slots = (res.data.slots || []).filter((slot) => slot.available);
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Failed to fetch slots:", error);
      toast.error("Failed to load available slots");
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalReason = reason === "Other" ? customReason : reason;
    if (!finalReason) {
      toast.error("Please select or enter a reason");
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a new date");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/appointments/${appointment._id}/reschedule`, {
        newDate: selectedDate,
        newSlotTime: selectedSlot,
        reason: finalReason
      });

      toast.success(requestApproval ? "Reschedule request sent to doctor" : "Appointment rescheduled successfully");
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || (requestApproval ? "Failed to send reschedule request" : "Failed to reschedule appointment"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setCustomReason("");
    setSelectedDate("");
    setSelectedSlot("");
    setAvailableSlots([]);
    onClose();
  };

  if (!isOpen || !appointment) return null;

  const patientName = appointment.patientId?.name || "Patient";
  const currentDate = new Date(appointment.date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const rescheduleCount = appointment.rescheduleCount || 0;
  const remainingReschedules = 2 - rescheduleCount;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content reschedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-warning">
          <h2>{requestApproval ? "Request Reschedule" : "Reschedule Appointment"}</h2>
          <button className="modal-close" onClick={handleClose} type="button">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Current Appointment Info */}
          <div className="current-appointment-info">
            <h4>Current Appointment</h4>
            <div className="info-grid">
              <div>
                <span className="info-label">Patient</span>
                <span className="info-value">{patientName}</span>
              </div>
              <div>
                <span className="info-label">Date</span>
                <span className="info-value">{currentDate}</span>
              </div>
              <div>
                <span className="info-label">Time</span>
                <span className="info-value">{appointment.slotTime}</span>
              </div>
              <div>
                <span className="info-label">Doctor</span>
                <span className="info-value">{appointment.doctorName || "Doctor"}</span>
              </div>
            </div>
            {remainingReschedules <= 1 && (
              <p className="reschedule-warning">
                ⚠️ {remainingReschedules === 0
                  ? "This appointment cannot be rescheduled again."
                  : `Only ${remainingReschedules} reschedule remaining.`}
              </p>
            )}
            {requestApproval && (
              <p className="reschedule-warning">
                Your doctor must approve this new date and slot before the appointment is changed.
              </p>
            )}
          </div>

          {/* New Date Selection */}
          <div className="form-section">
            <label className="form-label">New Date *</label>
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
            <label className="form-label">New Time Slot *</label>
            {loadingSlots ? (
              <p className="hint">Loading available slots...</p>
            ) : selectedDate ? (
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
              <p className="hint">Select a date first</p>
            )}
          </div>

          {/* Reason Selection */}
          <div className="form-section">
            <label className="form-label">Reason for Rescheduling *</label>
            <div className="reason-options">
              {RESCHEDULE_REASONS.map((r) => (
                <label key={r} className="radio-label">
                  <input
                    type="radio"
                    name="rescheduleReason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            {reason === "Other" && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify the reason..."
                className="form-input form-textarea"
                rows={3}
                required
              />
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-warning"
              disabled={submitting || remainingReschedules === 0}
            >
              {submitting
                ? (requestApproval ? "Sending Request..." : "Rescheduling...")
                : (requestApproval ? "Send Request" : "Reschedule Appointment")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RescheduleAppointmentModal;
