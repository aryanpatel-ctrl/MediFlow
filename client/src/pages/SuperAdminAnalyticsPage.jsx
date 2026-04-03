import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';

function SuperAdminAnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    hospitals: { total: 0, active: 0, inactive: 0, byType: {} },
    doctors: { total: 0, active: 0, bySpecialty: {} },
    patients: { total: 0 },
    appointments: { total: 0, completed: 0, cancelled: 0 },
    googleConnected: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/hospitals');
      const hospitals = res.data.hospitals || [];

      // Calculate analytics
      const byType = {};
      const bySpecialty = {};
      let totalDoctors = 0;
      let totalPatients = 0;

      hospitals.forEach(h => {
        // By type
        const type = h.type || 'private';
        byType[type] = (byType[type] || 0) + 1;

        // Count doctors and patients
        totalDoctors += h.totalDoctors || 0;
        totalPatients += h.totalPatients || 0;

        // By specialty
        (h.specialties || []).forEach(s => {
          bySpecialty[s] = (bySpecialty[s] || 0) + 1;
        });
      });

      setAnalytics({
        hospitals: {
          total: hospitals.length,
          active: hospitals.filter(h => h.isActive).length,
          inactive: hospitals.filter(h => !h.isActive).length,
          byType
        },
        doctors: {
          total: totalDoctors,
          active: totalDoctors, // Assuming all are active for now
          bySpecialty
        },
        patients: {
          total: totalPatients
        },
        appointments: {
          total: 0,
          completed: 0,
          cancelled: 0
        },
        googleConnected: hospitals.filter(h => h.googleCalendar?.connected).length
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Analytics" subtitle="Platform statistics">
        <div className="sa-analytics-page loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </AppLayout>
    );
  }

  const topSpecialties = Object.entries(analytics.doctors.bySpecialty)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <AppLayout title="Analytics" subtitle="Platform performance metrics">
      <main className="sa-analytics-page">

      {/* Overview Stats */}
      <div className="sap-overview-stats">
        <div className="sap-stat-card primary">
          <div className="sap-stat-content">
            <span className="sap-stat-value">{analytics.hospitals.total}</span>
            <span className="sap-stat-label">Total Hospitals</span>
          </div>
          <div className="sap-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
            </svg>
          </div>
        </div>

        <div className="sap-stat-card success">
          <div className="sap-stat-content">
            <span className="sap-stat-value">{analytics.doctors.total}</span>
            <span className="sap-stat-label">Total Doctors</span>
          </div>
          <div className="sap-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>

        <div className="sap-stat-card info">
          <div className="sap-stat-content">
            <span className="sap-stat-value">{analytics.patients.total}</span>
            <span className="sap-stat-label">Total Patients</span>
          </div>
          <div className="sap-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
        </div>

        <div className="sap-stat-card warning">
          <div className="sap-stat-content">
            <span className="sap-stat-value">{analytics.googleConnected}</span>
            <span className="sap-stat-label">Google Connected</span>
          </div>
          <div className="sap-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="sap-charts-grid">
        {/* Hospital Status */}
        <div className="sap-chart-card">
          <h3>Hospital Status</h3>
          <div className="sap-donut-container">
            <div className="sap-donut">
              <div
                className="sap-donut-segment active"
                style={{
                  '--percentage': analytics.hospitals.total > 0
                    ? (analytics.hospitals.active / analytics.hospitals.total) * 100
                    : 0
                }}
              />
              <div className="sap-donut-center">
                <span className="sap-donut-value">{analytics.hospitals.active}</span>
                <span className="sap-donut-label">Active</span>
              </div>
            </div>
            <div className="sap-donut-legend">
              <div className="sap-legend-item">
                <span className="sap-legend-color active"></span>
                <span>Active ({analytics.hospitals.active})</span>
              </div>
              <div className="sap-legend-item">
                <span className="sap-legend-color inactive"></span>
                <span>Inactive ({analytics.hospitals.inactive})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hospitals by Type */}
        <div className="sap-chart-card">
          <h3>Hospitals by Type</h3>
          <div className="sap-bar-chart">
            {Object.entries(analytics.hospitals.byType).map(([type, count]) => (
              <div key={type} className="sap-bar-item">
                <div className="sap-bar-label">
                  <span className="capitalize">{type}</span>
                  <span>{count}</span>
                </div>
                <div className="sap-bar-track">
                  <div
                    className="sap-bar-fill"
                    style={{
                      width: `${analytics.hospitals.total > 0 ? (count / analytics.hospitals.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(analytics.hospitals.byType).length === 0 && (
              <p className="sap-no-data">No data available</p>
            )}
          </div>
        </div>

        {/* Top Specialties */}
        <div className="sap-chart-card wide">
          <h3>Top Specialties</h3>
          <div className="sap-specialties-chart">
            {topSpecialties.map(([specialty, count]) => (
              <div key={specialty} className="sap-specialty-bar">
                <div className="sap-specialty-info">
                  <span className="sap-specialty-name">{specialty}</span>
                  <span className="sap-specialty-count">{count} hospitals</span>
                </div>
                <div className="sap-specialty-track">
                  <div
                    className="sap-specialty-fill"
                    style={{
                      width: `${topSpecialties[0] ? (count / topSpecialties[0][1]) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
            {topSpecialties.length === 0 && (
              <p className="sap-no-data">No specialties data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Google Calendar Integration Status */}
      <div className="sap-integration-section">
        <h3>Google Calendar Integration</h3>
        <div className="sap-integration-stats">
          <div className="sap-integration-card connected">
            <div className="sap-integration-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
            <div className="sap-integration-info">
              <span className="sap-integration-value">{analytics.googleConnected}</span>
              <span className="sap-integration-label">Connected</span>
            </div>
          </div>
          <div className="sap-integration-card not-connected">
            <div className="sap-integration-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="sap-integration-info">
              <span className="sap-integration-value">{analytics.hospitals.total - analytics.googleConnected}</span>
              <span className="sap-integration-label">Not Connected</span>
            </div>
          </div>
          <div className="sap-integration-progress">
            <div className="sap-progress-label">
              <span>Integration Rate</span>
              <span>
                {analytics.hospitals.total > 0
                  ? Math.round((analytics.googleConnected / analytics.hospitals.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="sap-progress-bar">
              <div
                className="sap-progress-fill"
                style={{
                  width: `${analytics.hospitals.total > 0
                    ? (analytics.googleConnected / analytics.hospitals.total) * 100
                    : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="sap-quick-links">
        <h3>Quick Actions</h3>
        <div className="sap-links-grid">
          <Link to="/super-admin/hospitals" className="sap-link-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
            </svg>
            <span>View All Hospitals</span>
          </Link>
          <Link to="/super-admin/onboard" className="sap-link-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span>Add New Hospital</span>
          </Link>
        </div>
      </div>
      </main>
    </AppLayout>
  );
}

export default SuperAdminAnalyticsPage;
