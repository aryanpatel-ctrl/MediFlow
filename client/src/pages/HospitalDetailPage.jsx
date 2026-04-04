import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import toast from 'react-hot-toast';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { resolveMediaUrl } from '../services/api';

function HospitalDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    fetchHospitalDetails();
  }, [user, navigate, id]);

  const fetchHospitalDetails = async () => {
    try {
      const [hospitalRes, doctorsRes] = await Promise.all([
        api.get(`/hospitals/${id}`),
        api.get(`/hospitals/${id}/doctors`)
      ]);

      setHospital(hospitalRes.data.hospital || hospitalRes.data);
      setDoctors(doctorsRes.data.doctors || []);
    } catch (error) {
      console.error('Failed to fetch hospital details:', error);
      toast.error('Failed to load hospital details');
    } finally {
      setLoading(false);
    }
  };

  const toggleHospitalStatus = async () => {
    try {
      await api.patch(`/hospitals/${id}`, { isActive: !hospital.isActive });
      setHospital(prev => ({ ...prev, isActive: !prev.isActive }));
      toast.success(`Hospital ${hospital.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      toast.error('Failed to update hospital status');
    }
  };

  if (loading) {
    return (
      <AppLayout title="Hospital Details" subtitle="Loading...">
        <div className="hospital-detail-page loading">
          <div className="loading-spinner"></div>
          <p>Loading hospital details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!hospital) {
    return (
      <AppLayout title="Hospital Not Found" subtitle="">
        <div className="hospital-detail-page not-found">
          <h2>Hospital Not Found</h2>
          <p>The hospital you're looking for doesn't exist.</p>
          <Link to="/super-admin/hospitals" className="btn-primary">
            Back to Hospitals
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={hospital.name} subtitle={`${hospital.address?.city}, ${hospital.address?.state}`}>
      <main className="hospital-detail-page">
        {/* Action Header */}
        <div className="page-actions space-between">
          <Link to="/super-admin/hospitals" className="btn-secondary-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12,19 5,12 12,5"/>
            </svg>
            Back to Hospitals
          </Link>
          <div className="page-actions-right">
            <span className={`status-badge-lg ${hospital.isActive ? 'active' : 'inactive'}`}>
              {hospital.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              className={`btn-outline ${hospital.isActive ? 'danger' : 'success'}`}
              onClick={toggleHospitalStatus}
            >
              {hospital.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>

        <div className="settings-card hospital-detail-branding">
          <div className="settings-logo-preview hospital-detail-branding__logo">
            {hospital.logo ? (
              <img src={resolveMediaUrl(hospital.logo)} alt={hospital.name} className="hospital-logo-image" />
            ) : (
              <span>{hospital.name?.charAt(0)?.toUpperCase() || 'H'}</span>
            )}
          </div>
          <div className="hospital-detail-branding__content">
            <h2>{hospital.name}</h2>
            <p>{hospital.address?.city}, {hospital.address?.state}</p>
          </div>
        </div>

      {/* Stats Row */}
      <div className="hdp-stats-row">
        <div className="hdp-stat-card">
          <div className="hdp-stat-icon doctors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <span className="hdp-stat-value">{doctors.length}</span>
            <span className="hdp-stat-label">Doctors</span>
          </div>
        </div>

        <div className="hdp-stat-card">
          <div className="hdp-stat-icon patients">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div>
            <span className="hdp-stat-value">{hospital.totalPatients || 0}</span>
            <span className="hdp-stat-label">Patients</span>
          </div>
        </div>

        <div className="hdp-stat-card">
          <div className="hdp-stat-icon appointments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <span className="hdp-stat-value">{hospital.totalAppointments || 0}</span>
            <span className="hdp-stat-label">Appointments</span>
          </div>
        </div>

        <div className="hdp-stat-card">
          <div className={`hdp-stat-icon google ${hospital.googleCalendar?.connected ? 'connected' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <span className={`hdp-stat-value ${hospital.googleCalendar?.connected ? 'connected' : 'not-connected'}`}>
              {hospital.googleCalendar?.connected ? 'Connected' : 'Not Connected'}
            </span>
            <span className="hdp-stat-label">Google Calendar</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="hdp-tabs">
        <button
          className={`hdp-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`hdp-tab ${activeTab === 'doctors' ? 'active' : ''}`}
          onClick={() => setActiveTab('doctors')}
        >
          Doctors ({doctors.length})
        </button>
        <button
          className={`hdp-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="hdp-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="hdp-overview">
            <div className="hdp-info-grid">
              <div className="hdp-info-card">
                <h3>Contact Information</h3>
                <div className="hdp-info-list">
                  <div className="hdp-info-item">
                    <span className="label">Email</span>
                    <span className="value">{hospital.email}</span>
                  </div>
                  <div className="hdp-info-item">
                    <span className="label">Phone</span>
                    <span className="value">{hospital.phone}</span>
                  </div>
                  {hospital.website && (
                    <div className="hdp-info-item">
                      <span className="label">Website</span>
                      <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="value link">
                        {hospital.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="hdp-info-card">
                <h3>Address</h3>
                <div className="hdp-info-list">
                  {hospital.address?.street && (
                    <div className="hdp-info-item">
                      <span className="label">Street</span>
                      <span className="value">{hospital.address.street}</span>
                    </div>
                  )}
                  <div className="hdp-info-item">
                    <span className="label">City</span>
                    <span className="value">{hospital.address?.city}</span>
                  </div>
                  <div className="hdp-info-item">
                    <span className="label">State</span>
                    <span className="value">{hospital.address?.state}</span>
                  </div>
                  {hospital.address?.pincode && (
                    <div className="hdp-info-item">
                      <span className="label">Pincode</span>
                      <span className="value">{hospital.address.pincode}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="hdp-info-card">
                <h3>Hospital Details</h3>
                <div className="hdp-info-list">
                  <div className="hdp-info-item">
                    <span className="label">Type</span>
                    <span className="value capitalize">{hospital.type || 'Private'}</span>
                  </div>
                  {hospital.registrationNumber && (
                    <div className="hdp-info-item">
                      <span className="label">Registration #</span>
                      <span className="value">{hospital.registrationNumber}</span>
                    </div>
                  )}
                  <div className="hdp-info-item">
                    <span className="label">Verified</span>
                    <span className={`value ${hospital.isVerified ? 'success' : 'warning'}`}>
                      {hospital.isVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hdp-info-card">
                <h3>Specialties</h3>
                {hospital.specialties?.length > 0 ? (
                  <div className="hdp-specialties">
                    {hospital.specialties.map(specialty => (
                      <span key={specialty} className="hdp-specialty-tag">
                        {specialty}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="hdp-no-data">No specialties listed</p>
                )}
              </div>
            </div>

            {hospital.description && (
              <div className="hdp-description">
                <h3>Description</h3>
                <p>{hospital.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="hdp-doctors">
            {doctors.length > 0 ? (
              <div className="hdp-doctors-grid">
                {doctors.map(doctor => (
                  <div key={doctor._id} className="hdp-doctor-card">
                    <div className="hdp-doctor-header">
                      <div className="hdp-doctor-avatar">
                        {doctor.userId?.name?.charAt(0).toUpperCase() || 'D'}
                      </div>
                      <div className="hdp-doctor-info">
                        <h4>{doctor.userId?.name || 'Doctor'}</h4>
                        <p>{doctor.specialty}</p>
                      </div>
                      <span className={`hdp-doctor-status ${doctor.isActive ? 'active' : 'inactive'}`}>
                        {doctor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="hdp-doctor-details">
                      <div className="hdp-doctor-detail">
                        <span className="label">Qualification</span>
                        <span className="value">{doctor.qualification}</span>
                      </div>
                      <div className="hdp-doctor-detail">
                        <span className="label">Experience</span>
                        <span className="value">{doctor.experience} years</span>
                      </div>
                      <div className="hdp-doctor-detail">
                        <span className="label">Consultation Fee</span>
                        <span className="value">Rs. {doctor.consultationFee}</span>
                      </div>
                      <div className="hdp-doctor-detail">
                        <span className="label">Rating</span>
                        <span className="value">
                          {doctor.rating?.average || 'N/A'} ({doctor.rating?.count || 0} reviews)
                        </span>
                      </div>
                    </div>

                    <div className="hdp-doctor-contact">
                      <span>{doctor.userId?.email}</span>
                      <span>{doctor.userId?.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="hdp-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <h3>No Doctors Yet</h3>
                <p>This hospital hasn't added any doctors yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="hdp-settings">
            <div className="hdp-settings-section">
              <h3>Hospital Status</h3>
              <p>Control whether this hospital is active on the platform</p>
              <div className="hdp-setting-item">
                <div>
                  <strong>Active Status</strong>
                  <p>When inactive, the hospital won't appear in searches and can't accept appointments</p>
                </div>
                <button
                  className={`btn-outline ${hospital.isActive ? 'danger' : 'success'}`}
                  onClick={toggleHospitalStatus}
                >
                  {hospital.isActive ? 'Deactivate Hospital' : 'Activate Hospital'}
                </button>
              </div>
            </div>

            <div className="hdp-settings-section">
              <h3>Google Calendar Integration</h3>
              <p>Status of Google Calendar connection for this hospital</p>
              <div className="hdp-setting-item">
                <div>
                  <strong>Connection Status</strong>
                  <p>
                    {hospital.googleCalendar?.connected
                      ? `Connected as ${hospital.googleCalendar.email || 'unknown'}`
                      : 'Not connected - Hospital admin needs to connect from their settings'}
                  </p>
                </div>
                <span className={`hdp-setting-badge ${hospital.googleCalendar?.connected ? 'connected' : ''}`}>
                  {hospital.googleCalendar?.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            <div className="hdp-settings-section danger">
              <h3>Danger Zone</h3>
              <p>Irreversible actions for this hospital</p>
              <div className="hdp-setting-item">
                <div>
                  <strong>Delete Hospital</strong>
                  <p>Permanently delete this hospital and all associated data</p>
                </div>
                <button className="btn-danger" disabled>
                  Delete Hospital
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </main>
    </AppLayout>
  );
}

export default HospitalDetailPage;
