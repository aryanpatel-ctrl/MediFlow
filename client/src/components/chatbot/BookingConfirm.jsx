import { useState } from 'react';
import { useAppointments } from '../../hooks';
import toast from 'react-hot-toast';

function BookingConfirm({ doctor, date, slot, triageData, onSuccess, onCancel }) {
  const [booking, setBooking] = useState(false);
  const { create } = useAppointments();

  const handleConfirm = async () => {
    setBooking(true);
    try {
      const result = await create({
        doctorId: doctor._id,
        date,
        slotTime: slot,
        triageData,
        bookingSource: 'web_chat',
      });

      if (result.error) {
        toast.error(result.payload || 'Booking failed');
      } else {
        toast.success('Appointment booked successfully!');
        onSuccess?.(result.payload);
      }
    } catch (error) {
      toast.error('Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="booking-confirm">
      <h3>Confirm Your Appointment</h3>

      <div className="booking-confirm__details">
        <div className="booking-confirm__row">
          <span className="booking-confirm__label">Doctor</span>
          <span className="booking-confirm__value">{doctor.userId?.name}</span>
        </div>

        <div className="booking-confirm__row">
          <span className="booking-confirm__label">Specialty</span>
          <span className="booking-confirm__value">{doctor.specialty}</span>
        </div>

        <div className="booking-confirm__row">
          <span className="booking-confirm__label">Date</span>
          <span className="booking-confirm__value">{formatDate(date)}</span>
        </div>

        <div className="booking-confirm__row">
          <span className="booking-confirm__label">Time</span>
          <span className="booking-confirm__value">{slot}</span>
        </div>

        <div className="booking-confirm__row">
          <span className="booking-confirm__label">Consultation Fee</span>
          <span className="booking-confirm__value">₹{doctor.consultationFee}</span>
        </div>

        {triageData?.urgencyScore && (
          <div className="booking-confirm__row">
            <span className="booking-confirm__label">Priority</span>
            <span className="booking-confirm__value booking-confirm__urgency">
              Level {triageData.urgencyScore}
            </span>
          </div>
        )}
      </div>

      <div className="booking-confirm__actions">
        <button
          className="booking-confirm__cancel"
          onClick={onCancel}
          disabled={booking}
        >
          Back
        </button>
        <button
          className="booking-confirm__submit"
          onClick={handleConfirm}
          disabled={booking}
        >
          {booking ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

export default BookingConfirm;
