import { useState, useEffect } from 'react';
import { useAuth } from '../hooks';
import toast from 'react-hot-toast';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';

function HospitalSettings() {
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleStatus, setGoogleStatus] = useState({
    configured: false,
    connected: false,
    calendarId: null
  });
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  useEffect(() => {
    fetchHospitalData();

    // Check for Google callback params
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      toast.success('Google Calendar connected successfully!');
      window.history.replaceState({}, '', '/settings');
    }
    if (params.get('google_error')) {
      toast.error(`Google Calendar error: ${params.get('google_error')}`);
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const fetchHospitalData = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
        return;
      }

      const [hospitalRes, googleRes] = await Promise.all([
        api.get(`/hospitals/${hospitalId}`),
        api.get(`/hospitals/${hospitalId}/google/status`)
      ]);

      setHospital(hospitalRes.data.hospital);
      setGoogleStatus(googleRes.data.googleCalendar);
    } catch (error) {
      console.error('Failed to fetch hospital data:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    const hospitalId = user?.hospitalId?._id || user?.hospitalId;

    if (!hospitalId) {
      toast.error('Hospital not found');
      return;
    }

    setConnectingGoogle(true);
    try {
      const res = await api.get(`/hospitals/${hospitalId}/google/auth`);

      if (res.data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = res.data.authUrl;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to connect Google Calendar');
      setConnectingGoogle(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar?')) {
      return;
    }

    const hospitalId = user?.hospitalId?._id || user?.hospitalId;

    try {
      await api.delete(`/hospitals/${hospitalId}/google/disconnect`);
      toast.success('Google Calendar disconnected');
      setGoogleStatus({ ...googleStatus, connected: false, calendarId: null });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <AppLayout title="Settings" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Settings" subtitle="Manage hospital settings and integrations">
      <main className="settings-page">
        {/* Hospital Profile */}
        <section className="settings-section">
          <div className="section-header">
            <h2>Hospital Profile</h2>
          </div>

          <div className="settings-card">
            {hospital ? (
              <div className="profile-info">
                <div className="profile-row">
                  <span className="label">Hospital Name</span>
                  <span className="value">{hospital.name}</span>
                </div>
                <div className="profile-row">
                  <span className="label">Type</span>
                  <span className="value">{hospital.type || 'Private'}</span>
                </div>
                <div className="profile-row">
                  <span className="label">Email</span>
                  <span className="value">{hospital.email}</span>
                </div>
                <div className="profile-row">
                  <span className="label">Phone</span>
                  <span className="value">{hospital.phone}</span>
                </div>
                {hospital.address && (
                  <div className="profile-row">
                    <span className="label">Address</span>
                    <span className="value">
                      {hospital.address.city}, {hospital.address.state}
                    </span>
                  </div>
                )}
                <div className="profile-row">
                  <span className="label">Registration</span>
                  <span className="value">{hospital.registrationNumber || '--'}</span>
                </div>
              </div>
            ) : (
              <p>Hospital information not available</p>
            )}
          </div>
        </section>

        {/* Google Calendar Integration */}
        <section className="settings-section">
          <div className="section-header">
            <h2>Google Calendar Integration</h2>
            <p>Connect your Google Calendar to sync appointments automatically</p>
          </div>

          <div className="settings-card google-card">
            <div className="integration-header">
              <div className="integration-icon">
                <svg viewBox="0 0 24 24" width="40" height="40">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div className="integration-info">
                <h3>Google Calendar</h3>
                <p>
                  {googleStatus.connected
                    ? 'Connected - Appointments will sync to your calendar'
                    : 'Not connected - Connect to sync appointments'}
                </p>
              </div>
              <div className="integration-status">
                <span className={`status-indicator ${googleStatus.connected ? 'connected' : 'disconnected'}`}>
                  {googleStatus.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            {!googleStatus.configured && (
              <div className="integration-warning">
                <p>Google Calendar is not configured on this server. Please contact the system administrator to set up Google OAuth credentials.</p>
              </div>
            )}

            {googleStatus.configured && (
              <div className="integration-actions">
                {googleStatus.connected ? (
                  <>
                    <div className="connected-info">
                      <p>Calendar ID: {googleStatus.calendarId || 'Primary'}</p>
                      <p>Connected at: {googleStatus.connectedAt ? new Date(googleStatus.connectedAt).toLocaleDateString() : '--'}</p>
                    </div>
                    <button
                      className="btn-danger"
                      onClick={disconnectGoogleCalendar}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-google"
                    onClick={connectGoogleCalendar}
                    disabled={connectingGoogle}
                  >
                    {connectingGoogle ? 'Connecting...' : 'Connect Google Calendar'}
                  </button>
                )}
              </div>
            )}

            <div className="integration-features">
              <h4>Features when connected:</h4>
              <ul>
                <li>Automatic appointment sync to Google Calendar</li>
                <li>Calendar events with patient details</li>
                <li>Reminders and notifications</li>
                <li>Easy rescheduling and cancellations</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Admin Account */}
        <section className="settings-section">
          <div className="section-header">
            <h2>Admin Account</h2>
          </div>

          <div className="settings-card">
            <div className="profile-info">
              <div className="profile-row">
                <span className="label">Name</span>
                <span className="value">{user?.name}</span>
              </div>
              <div className="profile-row">
                <span className="label">Email</span>
                <span className="value">{user?.email}</span>
              </div>
              <div className="profile-row">
                <span className="label">Role</span>
                <span className="value">{user?.role?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default HospitalSettings;
