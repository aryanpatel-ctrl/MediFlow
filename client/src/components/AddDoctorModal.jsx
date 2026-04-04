import { useState, useRef, useEffect } from "react";
import api, { resolveMediaUrl } from "../services/api";
import { useHospitalSettings } from "../hooks";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ["00", "15", "30", "45"];

const createInitialFormData = () => ({
  fullName: "",
  gender: "female",
  dateOfBirth: "",
  doctorId: "",
  about: "",
  phone: "",
  email: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  department: "",
  workType: "full_time",
  employmentStartDate: "",
  salary: "",
  licenseNumber: "",
  licenseExpiry: "",
  schedule: {
    monday: { enabled: true, startHour: "09", startMin: "00", endHour: "17", endMin: "00" },
    tuesday: { enabled: true, startHour: "09", startMin: "00", endHour: "17", endMin: "00" },
    wednesday: { enabled: false, startHour: "15", startMin: "00", endHour: "21", endMin: "00" },
    thursday: { enabled: true, startHour: "09", startMin: "00", endHour: "17", endMin: "00" },
    friday: { enabled: true, startHour: "13", startMin: "00", endHour: "18", endMin: "00" },
    saturday: { enabled: false, startHour: "09", startMin: "00", endHour: "13", endMin: "00" },
    sunday: { enabled: false, startHour: "09", startMin: "00", endHour: "13", endMin: "00" },
  },
  minAppointments: 1,
  maxAppointments: 18,
});

const mapDoctorToFormData = (doctor) => {
  const base = createInitialFormData();
  if (!doctor) return base;

  const mappedSchedule = { ...base.schedule };
  Object.entries(doctor.availability || {}).forEach(([day, value]) => {
    const firstSlot = value?.slots?.[0];
    mappedSchedule[day] = {
      enabled: Boolean(value?.isAvailable && firstSlot),
      startHour: firstSlot?.startTime?.slice(0, 2) || base.schedule[day].startHour,
      startMin: firstSlot?.startTime?.slice(3, 5) || base.schedule[day].startMin,
      endHour: firstSlot?.endTime?.slice(0, 2) || base.schedule[day].endHour,
      endMin: firstSlot?.endTime?.slice(3, 5) || base.schedule[day].endMin,
    };
  });

  return {
    ...base,
    fullName: doctor.userId?.name || "",
    about: doctor.bio || "",
    phone: doctor.userId?.phone || "",
    email: doctor.userId?.email || "",
    department: doctor.specialty || "",
    licenseNumber: doctor.registrationNumber || "",
    licenseExpiry: doctor.licenseExpiry ? new Date(doctor.licenseExpiry).toISOString().slice(0, 10) : "",
    schedule: mappedSchedule,
  };
};

const mapDoctorCertifications = (doctor) =>
  (doctor?.certifications || []).map((cert, index) => ({
    id: cert.url || `${cert.name}-${index}`,
    name: cert.name,
    url: cert.url,
    mimeType: cert.mimeType,
    isExisting: true,
  }));

function AddDoctorModal({ isOpen, onClose, onSuccess, hospitalId, doctorToEdit = null }) {
  const { specialties } = useHospitalSettings(hospitalId);
  const departmentOptions = specialties.length ? specialties : ["General Medicine"];
  const fileInputRef = useRef(null);
  const certInputRef = useRef(null);
  const isEditMode = Boolean(doctorToEdit);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [certifications, setCertifications] = useState([]);

  const [formData, setFormData] = useState(createInitialFormData);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  useEffect(() => {
    if (departmentOptions.length > 0 && !departmentOptions.includes(formData.department)) {
      setFormData((prev) => ({ ...prev, department: departmentOptions[0] }));
    }
  }, [departmentOptions, formData.department]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData(mapDoctorToFormData(doctorToEdit));
    setProfilePreview(doctorToEdit?.profilePhoto ? resolveMediaUrl(doctorToEdit.profilePhoto) : null);
    setProfileImageFile(null);
    setCertifications(mapDoctorCertifications(doctorToEdit));
    setErrors({});
  }, [doctorToEdit, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleScheduleChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day.toLowerCase()]: {
          ...prev.schedule[day.toLowerCase()],
          [field]: value
        }
      }
    }));
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCertificationUpload = (e) => {
    const files = Array.from(e.target.files);
    const newCerts = files.map(file => ({
      name: file.name,
      file: file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      isExisting: false,
    }));
    setCertifications(prev => [...prev, ...newCerts]);
  };

  const removeCertification = (id) => {
    setCertifications(prev => prev.filter(c => c.id !== id));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newCerts = files.map(file => ({
      name: file.name,
      file: file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      isExisting: false,
    }));
    setCertifications(prev => [...prev, ...newCerts]);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.phone.trim()) newErrors.phone = "Please input the phone number";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.department) newErrors.department = "Department is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !validateForm()) return;

    setLoading(true);
    try {
      // Format availability for the API
      const availability = {};
      Object.entries(formData.schedule).forEach(([day, schedule]) => {
        availability[day] = {
          isAvailable: schedule.enabled,
          slots: schedule.enabled ? [{
            startTime: `${schedule.startHour}:${schedule.startMin}`,
            endTime: `${schedule.endHour}:${schedule.endMin}`
          }] : []
        };
      });

      const doctorData = new FormData();
      doctorData.append('name', formData.fullName);
      doctorData.append('email', formData.email);
      doctorData.append('phone', formData.phone);
      if (!isEditMode) {
        doctorData.append('password', 'TempPass@123');
      }
      doctorData.append('specialty', formData.department);
      doctorData.append('qualification', formData.department);
      doctorData.append('registrationNumber', formData.licenseNumber || `DR-${Date.now()}`);
      doctorData.append('experience', '1');
      doctorData.append('consultationFee', '500');
      doctorData.append('slotDuration', '30');
      doctorData.append('bio', formData.about);
      doctorData.append('licenseExpiry', formData.licenseExpiry);
      doctorData.append('availability', JSON.stringify(availability));
      doctorData.append('languages', JSON.stringify(["English", "Hindi"]));

      if (profileImageFile) {
        doctorData.append('profilePhoto', profileImageFile);
      }

      certifications
        .filter((cert) => !cert.isExisting && cert.file)
        .forEach((cert) => doctorData.append('certifications', cert.file));

      if (isEditMode) {
        doctorData.append(
          'retainedCertifications',
          JSON.stringify(
            certifications
              .filter((cert) => cert.isExisting)
              .map(({ name, url, mimeType }) => ({ name, url, mimeType }))
          )
        );
      }

      const request = isEditMode
        ? api.put(`/doctors/${doctorToEdit._id}`, doctorData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
        : api.post('/doctors/onboard', doctorData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

      await request;
      onSuccess?.();
      onClose();

      // Reset form
      setFormData(createInitialFormData());
      setProfilePreview(null);
      setProfileImageFile(null);
      setCertifications([]);
      setErrors({});
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'add'} doctor:`, error);
      setErrors({ submit: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} doctor` });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Time Select Component
  const TimeSelect = ({ value, onChange, disabled, options }) => (
    <select
      className="time-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );

  // Schedule Row Component
  const ScheduleRow = ({ day }) => {
    const dayKey = day.toLowerCase();
    const schedule = formData.schedule[dayKey];

    return (
      <div className="schedule-day-row">
        <label className="schedule-day-checkbox">
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => handleScheduleChange(day, 'enabled', e.target.checked)}
          />
          <span className="checkmark"></span>
          <span className="day-name">{day}</span>
        </label>

        <div className="schedule-time-group">
          <TimeSelect
            value={schedule.startHour}
            onChange={(val) => handleScheduleChange(day, 'startHour', val)}
            disabled={!schedule.enabled}
            options={HOURS}
          />
          <span className="time-colon">:</span>
          <TimeSelect
            value={schedule.startMin}
            onChange={(val) => handleScheduleChange(day, 'startMin', val)}
            disabled={!schedule.enabled}
            options={MINUTES}
          />
          <span className="time-separator">—</span>
          <TimeSelect
            value={schedule.endHour}
            onChange={(val) => handleScheduleChange(day, 'endHour', val)}
            disabled={!schedule.enabled}
            options={HOURS}
          />
          <span className="time-colon">:</span>
          <TimeSelect
            value={schedule.endMin}
            onChange={(val) => handleScheduleChange(day, 'endMin', val)}
            disabled={!schedule.enabled}
            options={MINUTES}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="doctor-modal-overlay" onClick={onClose}>
      <div className="doctor-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="doctor-modal-header">
          <h2>{isEditMode ? "Edit Doctor" : "Add New Doctor"}</h2>
          <button className="doctor-modal-close" onClick={onClose} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="doctor-modal-body">
          {errors.submit && (
            <div className="doctor-modal-error">{errors.submit}</div>
          )}

          {/* Personal Info */}
          <section className="doctor-modal-section">
            <h3>Personal Info</h3>
            <div className="personal-info-grid">
              <div className="photo-upload-area">
                <div
                  className="photo-preview"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile" />
                  ) : (
                    <div className="photo-placeholder">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                  <span className="photo-edit-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageChange} hidden />
              </div>

              <div className="personal-fields">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Dr. Elena Morales"
                    className={errors.fullName ? 'error' : ''}
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <div className="radio-group">
                    {["female", "male", "other"].map(g => (
                      <label key={g} className="radio-label">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={formData.gender === g}
                          onChange={handleChange}
                        />
                        <span className="radio-custom"></span>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Doctor ID</label>
                    <input
                      type="text"
                      name="doctorId"
                      value={formData.doctorId}
                      onChange={handleChange}
                      placeholder="DR-1025"
                    />
                  </div>
                </div>

                <div className="form-group full">
                  <label>About</label>
                  <textarea
                    name="about"
                    value={formData.about}
                    onChange={handleChange}
                    placeholder="Dr. Elena is a board-certified endocrinologist with a focus on diabetes and thyroid disorders..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Contact Info */}
          <section className="doctor-modal-section">
            <h3>Contact Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Input your phone number"
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="elena.morales@medlinkhospital.com"
                  className={errors.email ? 'error' : ''}
                />
              </div>
            </div>

            <div className="form-group full">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Jl. Harmoni Raya No. 22, Jakarta, Indonesia"
              />
            </div>

            <div className="form-row">
              <div className="form-group emergency-name">
                <label>Emergency Contact</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Miguel Morales"
                />
              </div>
              <div className="form-group emergency-phone">
                <label>&nbsp;</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="+62 813-7700-1198"
                />
              </div>
            </div>
          </section>

          {/* Professional Info */}
          <section className="doctor-modal-section">
            <h3>Professional Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={errors.department ? 'error' : ''}
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Work Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="workType"
                      value="full_time"
                      checked={formData.workType === "full_time"}
                      onChange={handleChange}
                    />
                    <span className="radio-custom"></span>
                    Full Time
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="workType"
                      value="part_time"
                      checked={formData.workType === "part_time"}
                      onChange={handleChange}
                    />
                    <span className="radio-custom"></span>
                    Part Time
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Employment Start Date</label>
                <input
                  type="date"
                  name="employmentStartDate"
                  value={formData.employmentStartDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group salary-group">
              <label>Salary</label>
              <div className="salary-input">
                <input
                  type="text"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  placeholder="IDR 38,000,000"
                />
                <span className="salary-suffix">/ month</span>
              </div>
            </div>
          </section>

          {/* Licenses & Certifications */}
          <section className="doctor-modal-section">
            <h3>Licenses & Certifications</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Medical License Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="IND-MED-EN-453921"
                />
              </div>
              <div className="form-group">
                <label>Certification Uploads</label>
                <div
                  className="upload-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => certInputRef.current?.click()}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p>Drag and drop file or <span className="browse-text">browse file</span></p>
                  <span className="upload-size">Max size 10MB</span>
                </div>
                <input ref={certInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleCertificationUpload} hidden />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>License Expiry Date</label>
                <input
                  type="date"
                  name="licenseExpiry"
                  value={formData.licenseExpiry}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group cert-list-group">
                {certifications.length > 0 && (
                  <div className="cert-list">
                    {certifications.map(cert => (
                      <div key={cert.id} className="cert-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5fb7b4" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        {cert.url ? (
                          <a href={resolveMediaUrl(cert.url)} target="_blank" rel="noreferrer">{cert.name}</a>
                        ) : (
                          <span>{cert.name}</span>
                        )}
                        <button type="button" onClick={() => removeCertification(cert.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section className="doctor-modal-section">
            <h3>Schedule</h3>
            <p className="section-subtitle">Working Days</p>

            <div className="schedule-grid-new">
              {DAYS.map(day => (
                <ScheduleRow key={day} day={day} />
              ))}
            </div>

            <div className="max-appointments-section">
              <label>Max Appointment per Day</label>
              <div className="appointment-limits">
                <div className="limit-item">
                  <span className="limit-label">Min</span>
                  <button
                    type="button"
                    className="limit-btn minus"
                    onClick={() => setFormData(prev => ({ ...prev, minAppointments: Math.max(1, prev.minAppointments - 1) }))}
                  >-</button>
                  <span className="limit-value">{formData.minAppointments}</span>
                  <button
                    type="button"
                    className="limit-btn plus"
                    onClick={() => setFormData(prev => ({ ...prev, minAppointments: prev.minAppointments + 1 }))}
                  >+</button>
                </div>
                <div className="limit-item">
                  <span className="limit-label">Max</span>
                  <button
                    type="button"
                    className="limit-btn minus"
                    onClick={() => setFormData(prev => ({ ...prev, maxAppointments: Math.max(1, prev.maxAppointments - 1) }))}
                  >-</button>
                  <span className="limit-value">{formData.maxAppointments}</span>
                  <button
                    type="button"
                    className="limit-btn plus"
                    onClick={() => setFormData(prev => ({ ...prev, maxAppointments: prev.maxAppointments + 1 }))}
                  >+</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="doctor-modal-footer">
          <button type="button" className="btn-draft" onClick={() => handleSubmit(true)} disabled={loading}>
            Save Draft
          </button>
          <button type="button" className="btn-submit" onClick={() => handleSubmit(false)} disabled={loading}>
            {loading ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Doctor')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddDoctorModal;
