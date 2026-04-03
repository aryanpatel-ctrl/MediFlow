import { useState, useEffect } from 'react';
import { useDoctors } from '../../hooks';

function SlotPicker({ doctor, selectedDate, selectedSlot, onSelectDate, onSelectSlot }) {
  const { getSlots, getSlotsForDoctor, slotsLoading } = useDoctors();
  const [dates, setDates] = useState([]);

  // Generate next 7 days
  useEffect(() => {
    const nextDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      nextDays.push(date.toISOString().split('T')[0]);
    }
    setDates(nextDays);

    // Select today by default
    if (!selectedDate && nextDays.length > 0) {
      onSelectDate(nextDays[0]);
    }
  }, []);

  // Fetch slots when date changes
  useEffect(() => {
    if (doctor?._id && selectedDate) {
      getSlots(doctor._id, selectedDate);
    }
  }, [doctor?._id, selectedDate, getSlots]);

  const slots = getSlotsForDoctor(doctor?._id, selectedDate);
  const availableSlots = slots.filter(s => s.available);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="slot-picker">
      <div className="slot-picker__dates">
        <h4>Select Date</h4>
        <div className="slot-picker__date-grid">
          {dates.map((date) => (
            <button
              key={date}
              className={`slot-picker__date ${selectedDate === date ? 'slot-picker__date--selected' : ''}`}
              onClick={() => onSelectDate(date)}
            >
              {formatDate(date)}
            </button>
          ))}
        </div>
      </div>

      <div className="slot-picker__times">
        <h4>Available Slots</h4>
        {slotsLoading ? (
          <div className="slot-picker__loading">Loading slots...</div>
        ) : availableSlots.length === 0 ? (
          <div className="slot-picker__empty">No slots available for this date</div>
        ) : (
          <div className="slot-picker__time-grid">
            {availableSlots.map((slot) => (
              <button
                key={slot.time}
                className={`slot-picker__time ${selectedSlot === slot.time ? 'slot-picker__time--selected' : ''}`}
                onClick={() => onSelectSlot(slot.time)}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SlotPicker;
