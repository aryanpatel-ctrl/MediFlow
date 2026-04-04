import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { resolveMediaUrl } from '../services/api';

function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalHospitals: 0,
    activeHospitals: 0,
    totalDoctors: 0,
    totalPatients: 0,
    googleConnected: 0,
    pendingVerification: 0
  });
  const [recentHospitals, setRecentHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/hospitals');
      const hospitals = res.data.hospitals || [];

      // Calculate stats
      const totalDoctors = hospitals.reduce((sum, h) => sum + (h.totalDoctors || 0), 0);
      const totalPatients = hospitals.reduce((sum, h) => sum + (h.totalPatients || 0), 0);

      setStats({
        totalHospitals: hospitals.length,
        activeHospitals: hospitals.filter(h => h.isActive).length,
        totalDoctors,
        totalPatients,
        googleConnected: hospitals.filter(h => h.googleCalendar?.connected).length,
        pendingVerification: hospitals.filter(h => !h.isVerified).length
      });

      // Get recent 5 hospitals
      setRecentHospitals(hospitals.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard" subtitle="Super Admin Portal">
        <div className="super-admin-dashboard loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle="Manage all hospitals and administrators">
      <main className="super-admin-dashboard">
        {/* Quick Stats Header */}
        <div className="sa-header-row">
          <Link to="/super-admin/onboard" className="btn-primary">
            + Add New Hospital
          </Link>
        </div>

      {/* Stats Grid */}
      <div className="sa-stats-grid">
        <div className="sa-stat-card">
          <div className="sa-stat-icon hospitals">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
            </svg>
          </div>
          <div className="sa-stat-info">
            <span className="sa-stat-value">{stats.totalHospitals}</span>
            <span className="sa-stat-label">Total Hospitals</span>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="sa-stat-info">
            <span className="sa-stat-value">{stats.activeHospitals}</span>
            <span className="sa-stat-label">Active Hospitals</span>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon doctors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="sa-stat-info">
            <span className="sa-stat-value">{stats.totalDoctors}</span>
            <span className="sa-stat-label">Total Doctors</span>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon patients">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div className="sa-stat-info">
            <span className="sa-stat-value">{stats.totalPatients}</span>
            <span className="sa-stat-label">Total Patients</span>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon google">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="sa-stat-info">
            <span className="sa-stat-value">{stats.googleConnected}</span>
            <span className="sa-stat-label">Google Connected</span>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="sa-stat-info">
            <span className="sa-stat-value">{stats.pendingVerification}</span>
            <span className="sa-stat-label">Pending Verification</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="sa-section">
        <h2>Quick Actions</h2>
        <div className="sa-quick-actions">
          <Link to="/super-admin/onboard" className="sa-action-card">
            <div className="sa-action-icon add">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <h3>Add Hospital</h3>
            <p>Onboard a new hospital with admin credentials</p>
          </Link>

          <Link to="/super-admin/hospitals" className="sa-action-card">
            <div className="sa-action-icon view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h3>View All Hospitals</h3>
            <p>See details of all registered hospitals</p>
          </Link>

          <Link to="/super-admin/analytics" className="sa-action-card">
            <div className="sa-action-icon analytics">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h3>View Analytics</h3>
            <p>Platform-wide performance metrics</p>
          </Link>
        </div>
      </div>

      {/* Recent Hospitals */}
      <div className="sa-section">
        <div className="sa-section-header">
          <h2>Recent Hospitals</h2>
          <Link to="/super-admin/hospitals" className="sa-view-all">View All →</Link>
        </div>

        {recentHospitals.length > 0 ? (
          <div className="sa-hospitals-grid">
            {recentHospitals.map(hospital => (
              <Link
                to={`/super-admin/hospitals/${hospital._id}`}
                key={hospital._id}
                className="sa-hospital-card"
              >
                <div className="sa-hospital-header">
                  <div className="sa-hospital-avatar">
                    {hospital.logo ? (
                      <img src={resolveMediaUrl(hospital.logo)} alt={hospital.name} className="hospital-logo-image" />
                    ) : (
                      hospital.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="sa-hospital-info">
                    <h3>{hospital.name}</h3>
                    <p>{hospital.address?.city}, {hospital.address?.state}</p>
                  </div>
                  <span className={`sa-status-badge ${hospital.isActive ? 'active' : 'inactive'}`}>
                    {hospital.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="sa-hospital-stats">
                  <div className="sa-hospital-stat">
                    <span className="stat-number">{hospital.totalDoctors || 0}</span>
                    <span className="stat-label">Doctors</span>
                  </div>
                  <div className="sa-hospital-stat">
                    <span className="stat-number">{hospital.totalPatients || 0}</span>
                    <span className="stat-label">Patients</span>
                  </div>
                  <div className="sa-hospital-stat">
                    <span className={`google-status ${hospital.googleCalendar?.connected ? 'connected' : ''}`}>
                      {hospital.googleCalendar?.connected ? 'Connected' : 'Not Connected'}
                    </span>
                    <span className="stat-label">Google Calendar</span>
                  </div>
                </div>

                <div className="sa-hospital-footer">
                  <span className="sa-hospital-type">{hospital.type || 'Private'}</span>
                  <span className="sa-hospital-email">{hospital.email}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="sa-empty-state">
            <div className="sa-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
              </svg>
            </div>
            <h3>No Hospitals Yet</h3>
            <p>Start by adding your first hospital to the platform</p>
            <Link to="/super-admin/onboard" className="btn-primary">
              + Add First Hospital
            </Link>
          </div>
        )}
      </div>
      </main>
    </AppLayout>
  );
}

export default SuperAdminDashboard;
