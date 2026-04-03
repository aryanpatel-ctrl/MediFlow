import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import toast from 'react-hot-toast';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';

const STEPS = [
  { id: 1, title: 'Hospital Details', description: 'Basic information about the hospital' },
  { id: 2, title: 'Address & Contact', description: 'Location and contact details' },
  { id: 3, title: 'Admin Account', description: 'Create hospital admin credentials' },
  { id: 4, title: 'Review & Create', description: 'Confirm all details' }
];

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'Gynecology', 'Dermatology', 'ENT',
  'Gastroenterology', 'Psychiatry', 'Oncology', 'Nephrology',
  'Pulmonology', 'Urology', 'Ophthalmology', 'Dental'
];

function HospitalOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Hospital Details
    name: '',
    type: 'private',
    registrationNumber: '',
    description: '',
    specialties: [],
    // Step 2: Address & Contact
    email: '',
    phone: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    // Step 3: Admin Account
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
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

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Hospital name is required';
      if (!formData.type) newErrors.type = 'Please select hospital type';
    }

    if (step === 2) {
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
      if (!formData.address.city.trim()) newErrors['address.city'] = 'City is required';
      if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required';
    }

    if (step === 3) {
      if (!formData.adminName.trim()) newErrors.adminName = 'Admin name is required';
      if (!formData.adminEmail.trim()) newErrors.adminEmail = 'Admin email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) newErrors.adminEmail = 'Invalid email format';
      if (!formData.adminPassword) newErrors.adminPassword = 'Password is required';
      else if (formData.adminPassword.length < 6) newErrors.adminPassword = 'Password must be at least 6 characters';
      if (formData.adminPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      await api.post('/hospitals/onboard', {
        name: formData.name,
        type: formData.type,
        registrationNumber: formData.registrationNumber,
        description: formData.description,
        specialties: formData.specialties,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        adminPhone: formData.adminPhone,
        adminPassword: formData.adminPassword
      });

      toast.success('Hospital created successfully!');
      navigate('/super-admin/hospitals');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create hospital');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'super_admin') {
    navigate('/');
    return null;
  }

  return (
    <AppLayout title="Add Hospital" subtitle="Complete the steps to onboard a new hospital">
      <main className="hospital-onboarding-page">
        {/* Progress Steps */}
      <div className="hop-progress">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`hop-step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
          >
            <div className="hop-step-number">
              {currentStep > step.id ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              ) : (
                step.id
              )}
            </div>
            <div className="hop-step-info">
              <span className="hop-step-title">{step.title}</span>
              <span className="hop-step-desc">{step.description}</span>
            </div>
            {index < STEPS.length - 1 && <div className="hop-step-line" />}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="hop-form-container">
        {/* Step 1: Hospital Details */}
        {currentStep === 1 && (
          <div className="hop-form-step">
            <h2>Hospital Details</h2>
            <p>Enter the basic information about the hospital</p>

            <div className="hop-form-group">
              <label>Hospital Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., City General Hospital"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="hop-form-row">
              <div className="hop-form-group">
                <label>Hospital Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => updateField('type', e.target.value)}
                  className={errors.type ? 'error' : ''}
                >
                  <option value="private">Private Hospital</option>
                  <option value="government">Government Hospital</option>
                  <option value="clinic">Clinic</option>
                  <option value="multispecialty">Multi-Specialty Hospital</option>
                </select>
                {errors.type && <span className="error-text">{errors.type}</span>}
              </div>

              <div className="hop-form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => updateField('registrationNumber', e.target.value)}
                  placeholder="e.g., REG-12345"
                />
              </div>
            </div>

            <div className="hop-form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Brief description about the hospital..."
                rows={3}
              />
            </div>

            <div className="hop-form-group">
              <label>Specialties Available</label>
              <p className="hop-form-hint">Select all specialties offered by this hospital</p>
              <div className="hop-specialties-grid">
                {SPECIALTIES.map(specialty => (
                  <label
                    key={specialty}
                    className={`hop-specialty-chip ${formData.specialties.includes(specialty) ? 'selected' : ''}`}
                  >
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
          </div>
        )}

        {/* Step 2: Address & Contact */}
        {currentStep === 2 && (
          <div className="hop-form-step">
            <h2>Address & Contact</h2>
            <p>Enter the hospital's location and contact information</p>

            <div className="hop-form-row">
              <div className="hop-form-group">
                <label>Hospital Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="contact@hospital.com"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="hop-form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91 9876543210"
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
            </div>

            <div className="hop-form-group">
              <label>Website (Optional)</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://www.hospital.com"
              />
            </div>

            <div className="hop-form-group">
              <label>Street Address</label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => updateField('address.street', e.target.value)}
                placeholder="123 Healthcare Avenue"
              />
            </div>

            <div className="hop-form-row">
              <div className="hop-form-group">
                <label>City *</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => updateField('address.city', e.target.value)}
                  placeholder="Mumbai"
                  className={errors['address.city'] ? 'error' : ''}
                />
                {errors['address.city'] && <span className="error-text">{errors['address.city']}</span>}
              </div>

              <div className="hop-form-group">
                <label>State *</label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => updateField('address.state', e.target.value)}
                  placeholder="Maharashtra"
                  className={errors['address.state'] ? 'error' : ''}
                />
                {errors['address.state'] && <span className="error-text">{errors['address.state']}</span>}
              </div>
            </div>

            <div className="hop-form-row">
              <div className="hop-form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={formData.address.pincode}
                  onChange={(e) => updateField('address.pincode', e.target.value)}
                  placeholder="400001"
                />
              </div>

              <div className="hop-form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => updateField('address.country', e.target.value)}
                  placeholder="India"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Admin Account */}
        {currentStep === 3 && (
          <div className="hop-form-step">
            <h2>Admin Account</h2>
            <p>Create login credentials for the hospital administrator</p>

            <div className="hop-info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p>
                The hospital administrator will use these credentials to login and manage
                doctors, appointments, and hospital settings.
              </p>
            </div>

            <div className="hop-form-group">
              <label>Admin Full Name *</label>
              <input
                type="text"
                value={formData.adminName}
                onChange={(e) => updateField('adminName', e.target.value)}
                placeholder="John Doe"
                className={errors.adminName ? 'error' : ''}
              />
              {errors.adminName && <span className="error-text">{errors.adminName}</span>}
            </div>

            <div className="hop-form-row">
              <div className="hop-form-group">
                <label>Admin Email *</label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => updateField('adminEmail', e.target.value)}
                  placeholder="admin@hospital.com"
                  className={errors.adminEmail ? 'error' : ''}
                />
                {errors.adminEmail && <span className="error-text">{errors.adminEmail}</span>}
              </div>

              <div className="hop-form-group">
                <label>Admin Phone</label>
                <input
                  type="tel"
                  value={formData.adminPhone}
                  onChange={(e) => updateField('adminPhone', e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div className="hop-form-row">
              <div className="hop-form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => updateField('adminPassword', e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={errors.adminPassword ? 'error' : ''}
                />
                {errors.adminPassword && <span className="error-text">{errors.adminPassword}</span>}
              </div>

              <div className="hop-form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className={errors.confirmPassword ? 'error' : ''}
                />
                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="hop-form-step hop-review-step">
            <h2>Review & Create</h2>
            <p>Please review all the information before creating the hospital</p>

            <div className="hop-review-section">
              <div className="hop-review-header">
                <h3>Hospital Details</h3>
                <button onClick={() => setCurrentStep(1)} className="hop-edit-btn">Edit</button>
              </div>
              <div className="hop-review-grid">
                <div className="hop-review-item">
                  <span className="label">Name</span>
                  <span className="value">{formData.name}</span>
                </div>
                <div className="hop-review-item">
                  <span className="label">Type</span>
                  <span className="value">{formData.type}</span>
                </div>
                <div className="hop-review-item">
                  <span className="label">Registration #</span>
                  <span className="value">{formData.registrationNumber || '-'}</span>
                </div>
                <div className="hop-review-item full-width">
                  <span className="label">Specialties</span>
                  <span className="value">
                    {formData.specialties.length > 0 ? formData.specialties.join(', ') : 'None selected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="hop-review-section">
              <div className="hop-review-header">
                <h3>Address & Contact</h3>
                <button onClick={() => setCurrentStep(2)} className="hop-edit-btn">Edit</button>
              </div>
              <div className="hop-review-grid">
                <div className="hop-review-item">
                  <span className="label">Email</span>
                  <span className="value">{formData.email}</span>
                </div>
                <div className="hop-review-item">
                  <span className="label">Phone</span>
                  <span className="value">{formData.phone}</span>
                </div>
                <div className="hop-review-item full-width">
                  <span className="label">Address</span>
                  <span className="value">
                    {formData.address.street && `${formData.address.street}, `}
                    {formData.address.city}, {formData.address.state}
                    {formData.address.pincode && ` - ${formData.address.pincode}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="hop-review-section">
              <div className="hop-review-header">
                <h3>Admin Account</h3>
                <button onClick={() => setCurrentStep(3)} className="hop-edit-btn">Edit</button>
              </div>
              <div className="hop-review-grid">
                <div className="hop-review-item">
                  <span className="label">Admin Name</span>
                  <span className="value">{formData.adminName}</span>
                </div>
                <div className="hop-review-item">
                  <span className="label">Admin Email</span>
                  <span className="value">{formData.adminEmail}</span>
                </div>
                <div className="hop-review-item">
                  <span className="label">Admin Phone</span>
                  <span className="value">{formData.adminPhone || '-'}</span>
                </div>
              </div>
            </div>

            <div className="hop-confirm-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              <p>
                By clicking "Create Hospital", a new hospital will be registered and the admin
                will be able to login with the provided credentials.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="hop-form-actions">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="btn-secondary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12,19 5,12 12,5"/>
              </svg>
              Previous
            </button>
          )}

          <div className="hop-spacer" />

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary"
            >
              Next Step
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12,5 19,12 12,19"/>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-success"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-small"></span>
                  Creating...
                </>
              ) : (
                <>
                  Create Hospital
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      </main>
    </AppLayout>
  );
}

export default HospitalOnboardingPage;
