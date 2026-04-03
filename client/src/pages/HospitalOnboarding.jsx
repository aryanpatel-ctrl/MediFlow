import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../services/api';
import { setCredentials } from '../store/slices/authSlice';

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'Ophthalmology',
  'Gastroenterology', 'Pulmonology', 'Psychiatry', 'Urology',
  'Nephrology', 'Oncology', 'Emergency', 'Dental'
];

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
];

function HospitalOnboarding() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    name: '',
    type: 'private',
    registrationNumber: '',
    email: '',
    phone: '',
    website: '',
    address: {
      street: '',
      landmark: '',
      city: '',
      state: 'Maharashtra',
      pincode: ''
    },
    // Step 2: Operations
    operatingHours: {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true },
      wednesday: { open: '09:00', close: '18:00', isOpen: true },
      thursday: { open: '09:00', close: '18:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '14:00', isOpen: true },
      sunday: { open: '', close: '', isOpen: false }
    },
    emergency24x7: false,
    specialties: ['General Medicine'],
    // Step 3: Configuration
    defaultSlotDuration: 15,
    maxPatientsPerSlot: 1,
    features: {
      aiChatbotEnabled: true,
      voiceBookingEnabled: false,
      smsNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      smartOverbookingEnabled: false,
      overbookingPercentage: 10
    },
    emergencySlotsPerDoctor: 3,
    // Step 4: Admin Account
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: '',
    agreeTerms: false
  });

  const updateFormData = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const toggleSpecialty = (specialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          isOpen: !prev.operatingHours[day].isOpen
        }
      }
    }));
  };

  const updateDayTime = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.name || !formData.registrationNumber || !formData.email ||
            !formData.phone || !formData.address.city || !formData.address.state ||
            !formData.address.pincode) {
          toast.error('Please fill all required fields');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast.error('Please enter a valid email');
          return false;
        }
        return true;
      case 2:
        if (formData.specialties.length === 0) {
          toast.error('Please select at least one specialty');
          return false;
        }
        return true;
      case 3:
        if (formData.defaultSlotDuration < 5 || formData.defaultSlotDuration > 60) {
          toast.error('Slot duration must be between 5 and 60 minutes');
          return false;
        }
        return true;
      case 4:
        if (!formData.adminName || !formData.adminEmail || !formData.adminPhone ||
            !formData.adminPassword) {
          toast.error('Please fill all admin details');
          return false;
        }
        if (formData.adminPassword.length < 6) {
          toast.error('Password must be at least 6 characters');
          return false;
        }
        if (formData.adminPassword !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return false;
        }
        if (!formData.agreeTerms) {
          toast.error('Please agree to the terms and conditions');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      const response = await api.post('/hospitals/onboard', formData);

      if (response.data.success) {
        // Store auth credentials
        dispatch(setCredentials({
          user: {
            ...response.data.admin,
            hospitalId: response.data.hospital?._id
          },
          token: response.data.token
        }));

        toast.success('Hospital registered successfully!');

        // Check if Google Calendar should be connected
        if (formData.features.googleCalendarEnabled) {
          // Get Google auth URL
          try {
            const googleRes = await api.get(`/hospitals/${response.data.hospital._id}/google/auth`);
            if (googleRes.data.authUrl) {
              toast.success('Redirecting to connect Google Calendar...');
              window.location.href = googleRes.data.authUrl;
              return;
            }
          } catch (err) {
            console.log('Google Calendar not configured, skipping');
          }
        }

        navigate('/', { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="onboarding-step">
      <h2>Basic Details</h2>
      <p className="step-description">Tell us about your hospital</p>

      <div className="form-group">
        <label>Hospital Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="Enter hospital name"
        />
      </div>

      <div className="form-group">
        <label>Hospital Type *</label>
        <div className="radio-group">
          {['government', 'private', 'clinic', 'nursing_home'].map(type => (
            <label key={type} className="radio-label">
              <input
                type="radio"
                name="type"
                value={type}
                checked={formData.type === type}
                onChange={(e) => updateFormData('type', e.target.value)}
              />
              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Registration Number *</label>
        <input
          type="text"
          value={formData.registrationNumber}
          onChange={(e) => updateFormData('registrationNumber', e.target.value)}
          placeholder="Hospital license/registration number"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            placeholder="hospital@example.com"
          />
        </div>
        <div className="form-group">
          <label>Phone *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateFormData('phone', e.target.value)}
            placeholder="+91 XXXXXXXXXX"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Website (Optional)</label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => updateFormData('website', e.target.value)}
          placeholder="https://www.example.com"
        />
      </div>

      <h3>Address</h3>

      <div className="form-group">
        <label>Street Address</label>
        <input
          type="text"
          value={formData.address.street}
          onChange={(e) => updateFormData('address.street', e.target.value)}
          placeholder="123 Main Street"
        />
      </div>

      <div className="form-group">
        <label>Landmark</label>
        <input
          type="text"
          value={formData.address.landmark}
          onChange={(e) => updateFormData('address.landmark', e.target.value)}
          placeholder="Near City Mall"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>City *</label>
          <input
            type="text"
            value={formData.address.city}
            onChange={(e) => updateFormData('address.city', e.target.value)}
            placeholder="Mumbai"
          />
        </div>
        <div className="form-group">
          <label>State *</label>
          <select
            value={formData.address.state}
            onChange={(e) => updateFormData('address.state', e.target.value)}
          >
            {STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>PIN Code *</label>
          <input
            type="text"
            value={formData.address.pincode}
            onChange={(e) => updateFormData('address.pincode', e.target.value)}
            placeholder="400001"
            maxLength={6}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="onboarding-step">
      <h2>Operating Hours & Departments</h2>
      <p className="step-description">Set your hospital's schedule and available departments</p>

      <h3>Operating Hours</h3>
      <div className="operating-hours">
        {Object.entries(formData.operatingHours).map(([day, hours]) => (
          <div key={day} className="day-row">
            <label className="day-toggle">
              <input
                type="checkbox"
                checked={hours.isOpen}
                onChange={() => toggleDay(day)}
              />
              <span className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
            </label>
            {hours.isOpen && (
              <div className="time-inputs">
                <input
                  type="time"
                  value={hours.open}
                  onChange={(e) => updateDayTime(day, 'open', e.target.value)}
                />
                <span>to</span>
                <input
                  type="time"
                  value={hours.close}
                  onChange={(e) => updateDayTime(day, 'close', e.target.value)}
                />
              </div>
            )}
            {!hours.isOpen && <span className="closed-label">Closed</span>}
          </div>
        ))}
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={formData.emergency24x7}
            onChange={(e) => updateFormData('emergency24x7', e.target.checked)}
          />
          24x7 Emergency Services Available
        </label>
      </div>

      <h3>Departments Available</h3>
      <p className="hint">Select all departments available at your hospital</p>
      <div className="specialty-grid">
        {SPECIALTIES.map(specialty => (
          <label key={specialty} className="specialty-checkbox">
            <input
              type="checkbox"
              checked={formData.specialties.includes(specialty)}
              onChange={() => toggleSpecialty(specialty)}
            />
            {specialty}
          </label>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="onboarding-step">
      <h2>System Configuration</h2>
      <p className="step-description">Configure appointment and AI settings</p>

      <h3>Appointment Settings</h3>

      <div className="form-row">
        <div className="form-group">
          <label>Default Slot Duration (minutes) *</label>
          <input
            type="number"
            min={5}
            max={60}
            value={formData.defaultSlotDuration}
            onChange={(e) => updateFormData('defaultSlotDuration', parseInt(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Max Patients Per Slot</label>
          <input
            type="number"
            min={1}
            max={5}
            value={formData.maxPatientsPerSlot}
            onChange={(e) => updateFormData('maxPatientsPerSlot', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Emergency Slots Reserved (per doctor/day)</label>
        <input
          type="number"
          min={0}
          max={10}
          value={formData.emergencySlotsPerDoctor}
          onChange={(e) => updateFormData('emergencySlotsPerDoctor', parseInt(e.target.value))}
        />
      </div>

      <h3>Smart Overbooking (No-Show Handling)</h3>
      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={formData.features.smartOverbookingEnabled}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              features: { ...prev.features, smartOverbookingEnabled: e.target.checked }
            }))}
          />
          Enable Smart Overbooking
        </label>
        <p className="hint">System will overbook slots with high no-show probability</p>
      </div>

      {formData.features.smartOverbookingEnabled && (
        <div className="form-group">
          <label>Overbooking Limit (%)</label>
          <input
            type="number"
            min={5}
            max={30}
            value={formData.features.overbookingPercentage}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              features: { ...prev.features, overbookingPercentage: parseInt(e.target.value) }
            }))}
          />
        </div>
      )}

      <h3>AI & Notification Features</h3>

      <div className="features-grid">
        <label className="feature-toggle">
          <input
            type="checkbox"
            checked={formData.features.aiChatbotEnabled}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              features: { ...prev.features, aiChatbotEnabled: e.target.checked }
            }))}
          />
          <span className="feature-info">
            <strong>AI Chatbot</strong>
            <small>GPT-4 powered symptom triage</small>
          </span>
        </label>

        <label className="feature-toggle">
          <input
            type="checkbox"
            checked={formData.features.voiceBookingEnabled}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              features: { ...prev.features, voiceBookingEnabled: e.target.checked }
            }))}
          />
          <span className="feature-info">
            <strong>Voice Booking</strong>
            <small>Phone-based appointment booking</small>
          </span>
        </label>

        <label className="feature-toggle">
          <input
            type="checkbox"
            checked={formData.features.smsNotificationsEnabled}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              features: { ...prev.features, smsNotificationsEnabled: e.target.checked }
            }))}
          />
          <span className="feature-info">
            <strong>SMS Notifications</strong>
            <small>Appointment reminders via SMS</small>
          </span>
        </label>

        <label className="feature-toggle">
          <input
            type="checkbox"
            checked={formData.features.emailNotificationsEnabled}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              features: { ...prev.features, emailNotificationsEnabled: e.target.checked }
            }))}
          />
          <span className="feature-info">
            <strong>Email Notifications</strong>
            <small>Appointment confirmations & reminders</small>
          </span>
        </label>
      </div>

      <h3>Google Calendar Integration</h3>
      <p className="hint">Connect Google Calendar to automatically create appointment events</p>
      <div className="google-calendar-section">
        <label className="feature-toggle">
          <input
            type="checkbox"
            checked={formData.features.googleCalendarEnabled}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              features: { ...prev.features, googleCalendarEnabled: e.target.checked }
            }))}
          />
          <span className="feature-info">
            <strong>Google Calendar Sync</strong>
            <small>Auto-create calendar events for appointments</small>
          </span>
        </label>
        {formData.features.googleCalendarEnabled && (
          <p className="google-note">
            You'll be redirected to connect Google Calendar after registration
          </p>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="onboarding-step">
      <h2>Admin Account</h2>
      <p className="step-description">Create your hospital administrator account</p>

      <div className="form-group">
        <label>Admin Name *</label>
        <input
          type="text"
          value={formData.adminName}
          onChange={(e) => updateFormData('adminName', e.target.value)}
          placeholder="Full name"
        />
      </div>

      <div className="form-group">
        <label>Admin Email *</label>
        <input
          type="email"
          value={formData.adminEmail}
          onChange={(e) => updateFormData('adminEmail', e.target.value)}
          placeholder="admin@hospital.com"
        />
        <small>This will be your login email</small>
      </div>

      <div className="form-group">
        <label>Admin Phone *</label>
        <input
          type="tel"
          value={formData.adminPhone}
          onChange={(e) => updateFormData('adminPhone', e.target.value)}
          placeholder="+91 XXXXXXXXXX"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Password *</label>
          <input
            type="password"
            value={formData.adminPassword}
            onChange={(e) => updateFormData('adminPassword', e.target.value)}
            placeholder="Min 6 characters"
          />
        </div>
        <div className="form-group">
          <label>Confirm Password *</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => updateFormData('confirmPassword', e.target.value)}
            placeholder="Confirm password"
          />
        </div>
      </div>

      <div className="form-group checkbox-group terms">
        <label>
          <input
            type="checkbox"
            checked={formData.agreeTerms}
            onChange={(e) => updateFormData('agreeTerms', e.target.checked)}
          />
          I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
        </label>
      </div>
    </div>
  );

  return (
    <div className="hospital-onboarding">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h1>Hospital Registration</h1>
          <p>Join MedQueue AI to streamline your appointment management</p>
        </div>

        <div className="progress-bar">
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
            >
              <div className="step-circle">{step}</div>
              <span className="step-label">
                {step === 1 && 'Basic Details'}
                {step === 2 && 'Operations'}
                {step === 3 && 'Configuration'}
                {step === 4 && 'Admin Account'}
              </span>
            </div>
          ))}
        </div>

        <div className="onboarding-content">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        <div className="onboarding-actions">
          {currentStep > 1 && (
            <button className="btn-secondary" onClick={handleBack} disabled={loading}>
              Back
            </button>
          )}
          {currentStep < 4 ? (
            <button className="btn-primary" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          )}
        </div>

        <div className="onboarding-footer">
          <p>Already registered? <a href="/login">Login here</a></p>
        </div>
      </div>
    </div>
  );
}

export default HospitalOnboarding;
