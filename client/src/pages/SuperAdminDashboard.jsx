import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import toast from 'react-hot-toast';
import api from '../services/api';

function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    fetchHospitals();
  }, [user, navigate]);

  const fetchHospitals = async () => {
    try {
      const res = await api.get('/hospitals');
      setHospitals(res.data.hospitals || []);
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="super-admin-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="super-admin-dashboard">
      <header className="admin-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p>Manage hospitals and their administrators</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Add New Hospital
        </button>
      </header>

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-value">{hospitals.length}</span>
          <span className="stat-label">Total Hospitals</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{hospitals.filter(h => h.isActive).length}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{hospitals.filter(h => h.googleCalendar?.connected).length}</span>
          <span className="stat-label">Google Connected</span>
        </div>
      </div>

      {/* Hospitals List */}
      <div className="hospitals-list">
        <h2>Registered Hospitals</h2>

        {hospitals.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Hospital Name</th>
                <th>Type</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Google Calendar</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map(hospital => (
                <tr key={hospital._id}>
                  <td>
                    <strong>{hospital.name}</strong>
                    <p className="sub-text">{hospital.address?.city}, {hospital.address?.state}</p>
                  </td>
                  <td>{hospital.type || 'Private'}</td>
                  <td>{hospital.email}</td>
                  <td>{hospital.phone}</td>
                  <td>
                    <span className={`status-badge ${hospital.isActive ? 'active' : 'inactive'}`}>
                      {hospital.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${hospital.googleCalendar?.connected ? 'connected' : 'not-connected'}`}>
                      {hospital.googleCalendar?.connected ? 'Connected' : 'Not Connected'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>No hospitals registered yet</p>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              Add First Hospital
            </button>
          </div>
        )}
      </div>

      {/* Add Hospital Modal */}
      {showAddModal && (
        <AddHospitalModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchHospitals();
          }}
        />
      )}
    </div>
  );
}

// Add Hospital Modal Component
function AddHospitalModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Hospital Info
    name: '',
    type: 'private',
    email: '',
    phone: '',
    registrationNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    // Admin Info
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: ''
  });

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.adminEmail || !formData.adminPassword) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.adminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/hospitals/onboard', formData);
      toast.success('Hospital added successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add hospital');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Hospital</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Hospital Details */}
          <div className="form-section">
            <h3>Hospital Details</h3>

            <div className="form-group">
              <label>Hospital Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="City Hospital"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => updateField('type', e.target.value)}
                >
                  <option value="private">Private</option>
                  <option value="government">Government</option>
                  <option value="clinic">Clinic</option>
                </select>
              </div>
              <div className="form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => updateField('registrationNumber', e.target.value)}
                  placeholder="REG-12345"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Hospital Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="info@hospital.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91 9876543210"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => updateField('address.city', e.target.value)}
                  placeholder="Mumbai"
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => updateField('address.state', e.target.value)}
                  placeholder="Maharashtra"
                />
              </div>
            </div>
          </div>

          {/* Admin Account */}
          <div className="form-section">
            <h3>Hospital Admin Account</h3>
            <p className="section-note">These credentials will be used by the hospital admin to login</p>

            <div className="form-group">
              <label>Admin Name *</label>
              <input
                type="text"
                value={formData.adminName}
                onChange={(e) => updateField('adminName', e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Admin Email *</label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => updateField('adminEmail', e.target.value)}
                  placeholder="admin@hospital.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Admin Phone</label>
                <input
                  type="tel"
                  value={formData.adminPhone}
                  onChange={(e) => updateField('adminPhone', e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={formData.adminPassword}
                onChange={(e) => updateField('adminPassword', e.target.value)}
                placeholder="Min 6 characters"
                required
              />
              <small>Hospital admin will use this to login</small>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Hospital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
