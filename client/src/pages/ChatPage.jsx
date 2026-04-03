import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatWindow,
  DoctorList,
  SlotPicker,
  BookingConfirm,
} from '../components/chatbot';

const STEPS = {
  CHAT: 'chat',
  SELECT_DOCTOR: 'select_doctor',
  SELECT_SLOT: 'select_slot',
  CONFIRM: 'confirm',
  SUCCESS: 'success',
};

function ChatPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.CHAT);
  const [triageResult, setTriageResult] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedAppointment, setBookedAppointment] = useState(null);

  const handleTriageComplete = (result) => {
    setTriageResult(result);
  };

  const handleFindDoctors = (result) => {
    setTriageResult(result);
    setStep(STEPS.SELECT_DOCTOR);
  };

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setStep(STEPS.SELECT_SLOT);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(STEPS.CONFIRM);
  };

  const handleBookingSuccess = (appointment) => {
    setBookedAppointment(appointment);
    setStep(STEPS.SUCCESS);
  };

  const handleBackToChat = () => {
    setStep(STEPS.CHAT);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleBackToDoctors = () => {
    setStep(STEPS.SELECT_DOCTOR);
    setSelectedSlot(null);
  };

  const handleBackToSlots = () => {
    setStep(STEPS.SELECT_SLOT);
  };

  const handleViewAppointments = () => {
    navigate('/my-appointments');
  };

  const handleNewBooking = () => {
    setStep(STEPS.CHAT);
    setTriageResult(null);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setBookedAppointment(null);
  };

  return (
    <div className="chat-page">
      <div className="chat-page__container">
        {/* Progress Steps */}
        <div className="chat-page__progress">
          <div className={`progress-step ${step === STEPS.CHAT ? 'progress-step--active' : step !== STEPS.CHAT ? 'progress-step--done' : ''}`}>
            <span className="progress-step__number">1</span>
            <span className="progress-step__label">Symptoms</span>
          </div>
          <div className="progress-step__line" />
          <div className={`progress-step ${step === STEPS.SELECT_DOCTOR ? 'progress-step--active' : [STEPS.SELECT_SLOT, STEPS.CONFIRM, STEPS.SUCCESS].includes(step) ? 'progress-step--done' : ''}`}>
            <span className="progress-step__number">2</span>
            <span className="progress-step__label">Doctor</span>
          </div>
          <div className="progress-step__line" />
          <div className={`progress-step ${step === STEPS.SELECT_SLOT ? 'progress-step--active' : [STEPS.CONFIRM, STEPS.SUCCESS].includes(step) ? 'progress-step--done' : ''}`}>
            <span className="progress-step__number">3</span>
            <span className="progress-step__label">Schedule</span>
          </div>
          <div className="progress-step__line" />
          <div className={`progress-step ${step === STEPS.CONFIRM || step === STEPS.SUCCESS ? 'progress-step--active' : ''}`}>
            <span className="progress-step__number">4</span>
            <span className="progress-step__label">Confirm</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="chat-page__content">
          {step === STEPS.CHAT && (
            <ChatWindow
              onTriageComplete={handleTriageComplete}
              onFindDoctors={handleFindDoctors}
            />
          )}

          {step === STEPS.SELECT_DOCTOR && (
            <div className="chat-page__panel">
              <button className="chat-page__back" onClick={handleBackToChat}>
                ← Back to Chat
              </button>
              <DoctorList
                specialty={triageResult?.recommendedSpecialty}
                selectedDoctor={selectedDoctor}
                onSelectDoctor={handleSelectDoctor}
              />
            </div>
          )}

          {step === STEPS.SELECT_SLOT && (
            <div className="chat-page__panel">
              <button className="chat-page__back" onClick={handleBackToDoctors}>
                ← Back to Doctors
              </button>
              <div className="chat-page__selected-doctor">
                <h3>Booking with {selectedDoctor?.userId?.name}</h3>
                <p>{selectedDoctor?.specialty} • ₹{selectedDoctor?.consultationFee}</p>
              </div>
              <SlotPicker
                doctor={selectedDoctor}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onSelectDate={setSelectedDate}
                onSelectSlot={handleSelectSlot}
              />
            </div>
          )}

          {step === STEPS.CONFIRM && (
            <div className="chat-page__panel">
              <BookingConfirm
                doctor={selectedDoctor}
                date={selectedDate}
                slot={selectedSlot}
                triageData={triageResult}
                onSuccess={handleBookingSuccess}
                onCancel={handleBackToSlots}
              />
            </div>
          )}

          {step === STEPS.SUCCESS && (
            <div className="chat-page__panel chat-page__success">
              <div className="success-icon">✓</div>
              <h2>Appointment Booked!</h2>
              <p>Your appointment has been confirmed.</p>

              {bookedAppointment && (
                <div className="success-details">
                  <p><strong>Token:</strong> #{bookedAppointment.queueNumber || 'TBD'}</p>
                  <p><strong>Doctor:</strong> {selectedDoctor?.userId?.name}</p>
                  <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {selectedSlot}</p>
                </div>
              )}

              <div className="success-actions">
                <button className="btn-primary" onClick={handleViewAppointments}>
                  View My Appointments
                </button>
                <button className="btn-secondary" onClick={handleNewBooking}>
                  Book Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
