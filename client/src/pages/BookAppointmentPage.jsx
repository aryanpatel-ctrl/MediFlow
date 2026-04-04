import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { useAppointments, useAuth, useDoctors, useHospitalSettings } from "../hooks";
import api from "../services/api";
import toast from "react-hot-toast";
import { SlotPicker } from "../components/chatbot";

function BookAppointmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { appointmentTypes } = useHospitalSettings();
  const { create } = useAppointments();
  const { clearAvailableSlots } = useDoctors();
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  const hospitalId = user?.hospitalId?._id || user?.hospitalId;

  useEffect(() => {
    if (appointmentTypes.length > 0 && !appointmentType) {
      setAppointmentType(appointmentTypes[0]);
    }
  }, [appointmentType, appointmentTypes]);

  useEffect(() => {
    const fetchDoctors = async () => {
      if (!hospitalId) {
        setLoadingDoctors(false);
        return;
      }

      setLoadingDoctors(true);
      try {
        const response = await api.get(`/hospitals/${hospitalId}/doctors`);
        const nextDoctors = response.data.doctors || [];
        setDoctors(nextDoctors);
        setSelectedDoctor((current) => current || nextDoctors[0] || null);
      } catch (error) {
        toast.error("Failed to load doctors");
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, [hospitalId]);

  useEffect(() => {
    setSelectedDate("");
    setSelectedSlot("");
    clearAvailableSlots();
  }, [selectedDoctor, clearAvailableSlots]);

  const sortedDoctors = useMemo(
    () =>
      [...doctors].sort((left, right) =>
        (left.userId?.name || "Doctor").localeCompare(right.userId?.name || "Doctor")
      ),
    [doctors]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedDoctor) {
      toast.error("Please select a doctor");
      return;
    }

    if (!selectedDate || !selectedSlot) {
      toast.error("Please select a date and slot");
      return;
    }

    setBooking(true);
    try {
      const result = await create({
        doctorId: selectedDoctor._id,
        date: selectedDate,
        slotTime: selectedSlot,
        appointmentType,
        triageData: notes.trim() ? { preVisitSummary: notes.trim() } : undefined,
        bookingSource: "manual",
      });

      if (result.error) {
        toast.error(result.payload || "Failed to book appointment");
      } else {
        toast.success("Appointment booked successfully");
        setNotes("");
        setSelectedSlot("");
        navigate("/my-appointments");
      }
    } catch (error) {
      toast.error("Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  return (
    <AppLayout title="Book Appointment" subtitle="Choose your doctor, date, and preferred slot">
      <main className="booking-page">
        <section className="booking-hero panel">
          <div>
            <p className="booking-eyebrow">Manual Booking</p>
            <h2>Book your appointment directly</h2>
            <p>
              Pick a doctor, choose an available slot, and confirm your appointment in a few steps.
            </p>
          </div>
          <div className="booking-hero-badges">
            <span><Stethoscope size={16} /> {sortedDoctors.length} doctors</span>
            <span><CalendarDays size={16} /> Live slots</span>
            <span><Clock3 size={16} /> Instant confirmation</span>
          </div>
        </section>

        <section className="booking-layout">
          <section className="panel booking-doctors-panel">
            <div className="panel-header">
              <div>
                <h2>Select Doctor</h2>
              </div>
            </div>

            {loadingDoctors ? (
              <div className="booking-empty-state">Loading doctors...</div>
            ) : sortedDoctors.length === 0 ? (
              <div className="booking-empty-state">No doctors available right now.</div>
            ) : (
              <div className="booking-doctor-list">
                {sortedDoctors.map((doctor) => (
                  <button
                    key={doctor._id}
                    type="button"
                    className={`booking-doctor-card${selectedDoctor?._id === doctor._id ? " is-selected" : ""}`}
                    onClick={() => setSelectedDoctor(doctor)}
                  >
                    <div className="booking-doctor-card__top">
                      <strong>{doctor.userId?.name || "Doctor"}</strong>
                      <span>{doctor.specialty}</span>
                    </div>
                    <div className="booking-doctor-card__meta">
                      <small>₹{doctor.consultationFee || 0}</small>
                      <small>{doctor.slotDuration || 15} min</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel booking-details-panel">
            <div className="panel-header">
              <div>
                <h2>Appointment Details</h2>
              </div>
            </div>

            {selectedDoctor ? (
              <form className="booking-form" onSubmit={handleSubmit}>
                <div className="booking-selected-doctor">
                  <h3>{selectedDoctor.userId?.name}</h3>
                  <p>{selectedDoctor.specialty} • ₹{selectedDoctor.consultationFee || 0}</p>
                </div>

                <div className="form-group">
                  <label htmlFor="booking-appointment-type">Appointment Type</label>
                  <select
                    id="booking-appointment-type"
                    value={appointmentType}
                    onChange={(event) => setAppointmentType(event.target.value)}
                  >
                    {appointmentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <SlotPicker
                  doctor={selectedDoctor}
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                  onSelectDate={setSelectedDate}
                  onSelectSlot={setSelectedSlot}
                />

                <div className="form-group">
                  <label htmlFor="booking-notes">Notes</label>
                  <textarea
                    id="booking-notes"
                    rows="4"
                    placeholder="Add symptoms or a short reason for the visit"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>

                <div className="booking-form__actions">
                  <button className="btn-primary" type="submit" disabled={booking}>
                    {booking ? "Booking..." : "Confirm Appointment"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="booking-empty-state">Select a doctor to continue.</div>
            )}
          </section>
        </section>
      </main>
    </AppLayout>
  );
}

export default BookAppointmentPage;
