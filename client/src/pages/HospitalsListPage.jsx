import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { resolveMediaUrl } from '../services/api';

function HospitalsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [filteredHospitals, setFilteredHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    fetchHospitals();
  }, [user, navigate]);

  useEffect(() => {
    filterHospitals();
  }, [hospitals, searchTerm, filterStatus, filterType]);

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

  const filterHospitals = () => {
    let filtered = [...hospitals];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(h =>
        h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.address?.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(h => h.isActive);
      } else if (filterStatus === 'inactive') {
        filtered = filtered.filter(h => !h.isActive);
      } else if (filterStatus === 'google-connected') {
        filtered = filtered.filter(h => h.googleCalendar?.connected);
      }
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(h => h.type === filterType);
    }

    setFilteredHospitals(filtered);
  };

  if (loading) {
    return (
      <AppLayout title="Hospitals" subtitle="All registered hospitals">
        <div className="hospitals-list-page loading">
          <div className="loading-spinner"></div>
          <p>Loading hospitals...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Hospitals" subtitle={`${hospitals.length} hospitals registered`}>
      <main className="hospitals-list-page">
        {/* Action Button */}
        <div className="page-actions">
          <Link to="/super-admin/onboard" className="btn-primary">
            + Add New Hospital
          </Link>
        </div>

      {/* Filters */}
      <div className="hlp-filters">
        <div className="hlp-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="hlp-filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="google-connected">Google Connected</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="private">Private</option>
            <option value="government">Government</option>
            <option value="clinic">Clinic</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="hlp-results-info">
        Showing {filteredHospitals.length} of {hospitals.length} hospitals
      </div>

      {/* Hospitals Grid */}
      {filteredHospitals.length > 0 ? (
        <div className="hlp-hospitals-grid">
          {filteredHospitals.map(hospital => (
            <div key={hospital._id} className="hlp-hospital-card">
                <div className="hlp-card-header">
                  <div className="hlp-hospital-avatar">
                    {hospital.logo ? (
                      <img src={resolveMediaUrl(hospital.logo)} alt={hospital.name} className="hospital-logo-image" />
                    ) : (
                      hospital.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                <div className="hlp-hospital-title">
                  <h3>{hospital.name}</h3>
                  <p className="hlp-hospital-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {hospital.address?.city}, {hospital.address?.state}
                  </p>
                </div>
                <span className={`hlp-status-badge ${hospital.isActive ? 'active' : 'inactive'}`}>
                  {hospital.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="hlp-card-body">
                <div className="hlp-info-row">
                  <span className="hlp-label">Type:</span>
                  <span className="hlp-value">{hospital.type || 'Private'}</span>
                </div>
                <div className="hlp-info-row">
                  <span className="hlp-label">Email:</span>
                  <span className="hlp-value">{hospital.email}</span>
                </div>
                <div className="hlp-info-row">
                  <span className="hlp-label">Phone:</span>
                  <span className="hlp-value">{hospital.phone}</span>
                </div>
              </div>

              <div className="hlp-card-stats">
                <div className="hlp-stat">
                  <div className="hlp-stat-icon doctors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="hlp-stat-info">
                    <span className="hlp-stat-value">{hospital.totalDoctors || 0}</span>
                    <span className="hlp-stat-label">Doctors</span>
                  </div>
                </div>

                <div className="hlp-stat">
                  <div className="hlp-stat-icon patients">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                  <div className="hlp-stat-info">
                    <span className="hlp-stat-value">{hospital.totalPatients || 0}</span>
                    <span className="hlp-stat-label">Patients</span>
                  </div>
                </div>

                <div className="hlp-stat">
                  <div className={`hlp-stat-icon google ${hospital.googleCalendar?.connected ? 'connected' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div className="hlp-stat-info">
                    <span className={`hlp-stat-value ${hospital.googleCalendar?.connected ? 'connected' : 'not-connected'}`}>
                      {hospital.googleCalendar?.connected ? 'Yes' : 'No'}
                    </span>
                    <span className="hlp-stat-label">Google Cal</span>
                  </div>
                </div>
              </div>

              <div className="hlp-card-footer">
                <Link
                  to={`/super-admin/hospitals/${hospital._id}`}
                  className="hlp-view-btn"
                >
                  View Details
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12,5 19,12 12,19"/>
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="hlp-empty-state">
          {searchTerm || filterStatus !== 'all' || filterType !== 'all' ? (
            <>
              <h3>No hospitals found</h3>
              <p>Try adjusting your search or filters</p>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterType('all');
                }}
              >
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h3>No Hospitals Yet</h3>
              <p>Start by adding your first hospital to the platform</p>
              <Link to="/super-admin/onboard" className="btn-primary">
                + Add First Hospital
              </Link>
            </>
          )}
        </div>
      )}
      </main>
    </AppLayout>
  );
}

export default HospitalsListPage;
