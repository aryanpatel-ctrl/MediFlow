import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'Ophthalmology',
  'Gastroenterology', 'Pulmonology', 'Psychiatry', 'Urology', 'Emergency'
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function DoctorOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Personal Info
    name: '',
    email: '',
    phone: '',
    password: '',
    // Professional Info
    specialty: 'General Medicine',
    qualification: '',
    registrationNumber: '',
    experience: 1,
    consultationFee: 500,
    // Slot Config
    slotDuration: 15,
    // Availability
    availability: {
      monday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
      tuesday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
      wednesday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
      thursday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
      friday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
      saturday: { isAvailable: true, slots: [{ startTime: '10:00', endTime: '14:00' }] },
      sunday: { isAvailable: false, slots: [] }
    }
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: {
          ...prev.availability[day],
          isAvailable: !prev.availability[day].isAvailable
        }
      }
    }));
  };

  const updateDayTime = (day, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: {
          ...prev.availability[day],
          slots: prev.availability[day].slots.map((slot, i) =>
            i === index ? { ...slot, [field]: value } : slot
          )
        }
      }
    }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      toast.error('Please fill all personal details');
      return false;
    }
    if (!formData.qualification || !formData.registrationNumber) {
      toast.error('Please fill all professional details');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await api.post('/doctors/onboard', formData);
      if (response.data.success) {
        toast.success('Doctor added successfully!');
        navigate('/doctors');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add doctor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doctor-onboarding">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h1>Add New Doctor</h1>
          <p>Register a new doctor to your hospital</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <section className="form-section">
            <h3>Personal Information</h3>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Dr. John Smith"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="doctor@hospital.com"
                />
                <small>Login credentials will be sent here</small>
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Temporary Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Min 6 characters"
              />
              <small>Doctor can change this after first login</small>
            </div>
          </section>

          {/* Professional Details */}
          <section className="form-section">
            <h3>Professional Details</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Specialty *</label>
                <select
                  value={formData.specialty}
                  onChange={(e) => updateField('specialty', e.target.value)}
                >
                  {SPECIALTIES.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Experience (years) *</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={formData.experience}
                  onChange={(e) => updateField('experience', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Qualification *</label>
              <input
                type="text"
                value={formData.qualification}
                onChange={(e) => updateField('qualification', e.target.value)}
                placeholder="MBBS, MD, DM Cardiology"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Registration Number *</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => updateField('registrationNumber', e.target.value)}
                  placeholder="MH-12345"
                />
              </div>
              <div className="form-group">
                <label>Consultation Fee (Rs)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.consultationFee}
                  onChange={(e) => updateField('consultationFee', parseInt(e.target.value))}
                />
              </div>
            </div>
          </section>

          {/* Availability */}
          <section className="form-section">
            <h3>Weekly Schedule</h3>

            <div className="form-group">
              <label>Slot Duration (minutes)</label>
              <select
                value={formData.slotDuration}
                onChange={(e) => updateField('slotDuration', parseInt(e.target.value))}
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            <div className="availability-grid">
              {DAYS.map(day => (
                <div key={day} className="day-row">
                  <label className="day-toggle">
                    <input
                      type="checkbox"
                      checked={formData.availability[day].isAvailable}
                      onChange={() => toggleDay(day)}
                    />
                    <span className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                  </label>

                  {formData.availability[day].isAvailable ? (
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={formData.availability[day].slots[0]?.startTime || '09:00'}
                        onChange={(e) => updateDayTime(day, 0, 'startTime', e.target.value)}
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={formData.availability[day].slots[0]?.endTime || '17:00'}
                        onChange={(e) => updateDayTime(day, 0, 'endTime', e.target.value)}
                      />
                    </div>
                  ) : (
                    <span className="closed-label">Not Available</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding Doctor...' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DoctorOnboarding;
