import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const CANCEL_REASONS = [
  "Patient requested cancellation",
  "Doctor unavailable",
  "Emergency situation",
  "Scheduling conflict",
  "Patient no longer needs appointment",
  "Other"
];

function CancelAppointmentModal({ isOpen, onClose, onSuccess, appointment }) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalReason = reason === "Other" ? customReason : reason;
    if (!finalReason) {
      toast.error("Please select or enter a reason");
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/appointments/${appointment._id}/cancel`, {
        reason: finalReason
      });

      toast.success("Appointment cancelled successfully");
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setCustomReason("");
    onClose();
  };

  if (!isOpen || !appointment) return null;

  const patientName = appointment.patientId?.name || "Patient";
  const appointmentDate = new Date(appointment.date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-danger">
          <h2>Cancel Appointment</h2>
          <button className="modal-close" onClick={handleClose} type="button">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="cancel-warning">
            <span className="warning-icon">⚠️</span>
            <p>
              Are you sure you want to cancel the appointment for <strong>{patientName}</strong> on <strong>{appointmentDate}</strong> at <strong>{appointment.slotTime}</strong>?
            </p>
          </div>

          <div className="form-section">
            <label className="form-label">Cancellation Reason *</label>
            <div className="reason-options">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="radio-label">
                  <input
                    type="radio"
                    name="cancelReason"
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
              Go Back
            </button>
            <button type="submit" className="btn-danger" disabled={submitting}>
              {submitting ? "Cancelling..." : "Cancel Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CancelAppointmentModal;
