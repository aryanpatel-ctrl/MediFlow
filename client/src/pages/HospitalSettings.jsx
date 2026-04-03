import { useEffect, useMemo, useState } from "react";
import { Boxes, CalendarRange, Plus, Stethoscope, Trash2 } from "lucide-react";
import { useAuth } from "../hooks";
import toast from "react-hot-toast";
import api from "../services/api";
import AppLayout from "../layouts/AppLayout";

const DEFAULT_APPOINTMENT_TYPES = ["Consultation", "Follow-up", "Surgery", "Telemedicine"];
const DEFAULT_INVENTORY_CATEGORIES = ["Medicines", "Equipment", "Supplies"];
const DEFAULT_SPECIALTIES = ["General Medicine"];

const settingTabs = [
  {
    id: "appointmentTypes",
    label: "Appointment Type",
    description: "Manage bookable appointment types used by the hospital.",
    icon: CalendarRange,
    field: "appointmentTypes",
    inputLabel: "Appointment Type",
    inputPlaceholder: "Add appointment type",
    emptyMessage: "No appointment types added yet.",
  },
  {
    id: "inventoryCategories",
    label: "Inventory",
    description: "Define inventory groups to organize stock and supplies.",
    icon: Boxes,
    field: "inventoryCategories",
    inputLabel: "Inventory Category",
    inputPlaceholder: "Add inventory category",
    emptyMessage: "No inventory categories added yet.",
  },
  {
    id: "specialties",
    label: "Department",
    description: "Maintain the departments available in your hospital setup.",
    icon: Stethoscope,
    field: "specialties",
    inputLabel: "Department",
    inputPlaceholder: "Add department",
    emptyMessage: "No departments added yet.",
  },
];

const normalizeItems = (items, fallback) => {
  const values = Array.isArray(items) ? items : fallback;
  return values.filter(Boolean);
};

function HospitalSettings() {
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("appointmentTypes");
  const [draftValue, setDraftValue] = useState("");
  const [settingsData, setSettingsData] = useState({
    appointmentTypes: DEFAULT_APPOINTMENT_TYPES,
    inventoryCategories: DEFAULT_INVENTORY_CATEGORIES,
    specialties: DEFAULT_SPECIALTIES,
  });
  const [googleStatus, setGoogleStatus] = useState({
    configured: false,
    connected: false,
    calendarId: null,
  });
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  useEffect(() => {
    fetchHospitalData();

    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      toast.success("Google Calendar connected successfully!");
      window.history.replaceState({}, "", "/settings");
    }
    if (params.get("google_error")) {
      toast.error(`Google Calendar error: ${params.get("google_error")}`);
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const activeConfig = useMemo(
    () => settingTabs.find((tab) => tab.id === activeTab) || settingTabs[0],
    [activeTab],
  );

  const fetchHospitalData = async () => {
    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
        return;
      }

      const [hospitalRes, googleRes] = await Promise.all([
        api.get(`/hospitals/${hospitalId}`),
        api.get(`/hospitals/${hospitalId}/google/status`),
      ]);

      const nextHospital = hospitalRes.data.hospital;
      setHospital(nextHospital);
      setSettingsData({
        appointmentTypes: normalizeItems(nextHospital?.appointmentTypes, DEFAULT_APPOINTMENT_TYPES),
        inventoryCategories: normalizeItems(nextHospital?.inventoryCategories, DEFAULT_INVENTORY_CATEGORIES),
        specialties: normalizeItems(nextHospital?.specialties, DEFAULT_SPECIALTIES),
      });
      setGoogleStatus(googleRes.data.googleCalendar);
    } catch (error) {
      console.error("Failed to fetch hospital data:", error);
      toast.error("Failed to load hospital settings");
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    const hospitalId = user?.hospitalId?._id || user?.hospitalId;

    if (!hospitalId) {
      toast.error("Hospital not found");
      return;
    }

    setConnectingGoogle(true);
    try {
      const res = await api.get(`/hospitals/${hospitalId}/google/auth`);

      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to connect Google Calendar");
      setConnectingGoogle(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!window.confirm("Are you sure you want to disconnect Google Calendar?")) {
      return;
    }

    const hospitalId = user?.hospitalId?._id || user?.hospitalId;

    try {
      await api.delete(`/hospitals/${hospitalId}/google/disconnect`);
      toast.success("Google Calendar disconnected");
      setGoogleStatus({ ...googleStatus, connected: false, calendarId: null });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to disconnect");
    }
  };

  const handleAddItem = () => {
    const value = draftValue.trim();
    if (!value) {
      return;
    }

    const field = activeConfig.field;
    const existingItems = settingsData[field];
    const exists = existingItems.some((item) => item.toLowerCase() === value.toLowerCase());

    if (exists) {
      toast.error(`${activeConfig.inputLabel} already exists`);
      return;
    }

    setSettingsData((currentValue) => ({
      ...currentValue,
      [field]: [...currentValue[field], value],
    }));
    setDraftValue("");
  };

  const handleRemoveItem = (field, valueToRemove) => {
    setSettingsData((currentValue) => ({
      ...currentValue,
      [field]: currentValue[field].filter((item) => item !== valueToRemove),
    }));
  };

  const handleSaveSettings = async () => {
    const hospitalId = user?.hospitalId?._id || user?.hospitalId;

    if (!hospitalId) {
      toast.error("Hospital not found");
      return;
    }

    setSavingSettings(true);
    try {
      const payload = {
        appointmentTypes: settingsData.appointmentTypes,
        inventoryCategories: settingsData.inventoryCategories,
        specialties: settingsData.specialties,
      };

      const res = await api.put(`/hospitals/${hospitalId}`, payload);
      setHospital(res.data.hospital);
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
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
    <AppLayout title="Settings" subtitle="Manage hospital configuration and dynamic lists">
      <main className="settings-page">
        <section className="settings-hero-card">
          <div>
            <p className="settings-eyebrow">Hospital Settings</p>
            <h2>{hospital?.name || "Hospital Workspace"}</h2>
            <p className="settings-hero-copy">
              Configure the dynamic values used across bookings, stock management, and hospital specialties.
            </p>
          </div>
          <button className="btn-primary" type="button" onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save Changes"}
          </button>
        </section>

        <section className="settings-builder">
          <aside className="settings-tabs-panel">
            {settingTabs.map((tab) => {
              const Icon = tab.icon;
              const count = settingsData[tab.field]?.length || 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`settings-tab-button${activeTab === tab.id ? " is-active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setDraftValue("");
                  }}
                >
                  <span className="settings-tab-button__icon">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span className="settings-tab-button__content">
                    <strong>{tab.label}</strong>
                    <small>{count} items</small>
                  </span>
                </button>
              );
            })}
          </aside>

          <section className="settings-editor-panel">
            <div className="settings-editor-header">
              <div>
                <h3>{activeConfig.label}</h3>
                <p>{activeConfig.description}</p>
              </div>
            </div>

            <div className="settings-inline-form">
              <label className="settings-inline-form__field">
                <span>{activeConfig.inputLabel}</span>
                <input
                  type="text"
                  value={draftValue}
                  placeholder={activeConfig.inputPlaceholder}
                  onChange={(event) => setDraftValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddItem();
                    }
                  }}
                />
              </label>
              <button className="btn-primary settings-inline-form__action" type="button" onClick={handleAddItem}>
                <Plus size={16} strokeWidth={2} />
                Add
              </button>
            </div>

            <div className="settings-chip-grid">
              {settingsData[activeConfig.field]?.length > 0 ? (
                settingsData[activeConfig.field].map((item) => (
                  <div className="settings-chip-card" key={item}>
                    <span>{item}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${item}`}
                      onClick={() => handleRemoveItem(activeConfig.field, item)}
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="settings-empty-message">{activeConfig.emptyMessage}</p>
              )}
            </div>
          </section>
        </section>

        <section className="settings-grid">
          <section className="settings-section">
            <div className="section-header">
              <h2>Google Calendar Integration</h2>
              <p>Connect your Google Calendar to sync appointments automatically.</p>
            </div>

            <div className="settings-card google-card">
              <div className="integration-header">
                <div className="integration-icon">
                  <svg viewBox="0 0 24 24" width="40" height="40">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div className="integration-info">
                  <h3>Google Calendar</h3>
                  <p>
                    {googleStatus.connected
                      ? "Connected - Appointments will sync to your calendar"
                      : "Not connected - Connect to sync appointments"}
                  </p>
                </div>
                <div className="integration-status">
                  <span className={`status-indicator ${googleStatus.connected ? "connected" : "disconnected"}`}>
                    {googleStatus.connected ? "Connected" : "Not Connected"}
                  </span>
                </div>
              </div>

              {!googleStatus.configured && (
                <div className="integration-warning">
                  <p>
                    Google Calendar is not configured on this server. Please contact the system administrator to set up Google OAuth credentials.
                  </p>
                </div>
              )}

              {googleStatus.configured && (
                <div className="integration-actions">
                  {googleStatus.connected ? (
                    <>
                      <div className="connected-info">
                        <p>Calendar ID: {googleStatus.calendarId || "Primary"}</p>
                        <p>Connected at: {googleStatus.connectedAt ? new Date(googleStatus.connectedAt).toLocaleDateString() : "--"}</p>
                      </div>
                      <button className="btn-danger" onClick={disconnectGoogleCalendar}>
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button className="btn-google" onClick={connectGoogleCalendar} disabled={connectingGoogle}>
                      {connectingGoogle ? "Connecting..." : "Connect Google Calendar"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

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
                    <span className="value">{hospital.type || "Private"}</span>
                  </div>
                  <div className="profile-row">
                    <span className="label">Email</span>
                    <span className="value">{hospital.email}</span>
                  </div>
                  <div className="profile-row">
                    <span className="label">Phone</span>
                    <span className="value">{hospital.phone}</span>
                  </div>
                  <div className="profile-row">
                    <span className="label">Admin</span>
                    <span className="value">{user?.name}</span>
                  </div>
                </div>
              ) : (
                <p>Hospital information not available</p>
              )}
            </div>
          </section>
        </section>
      </main>
    </AppLayout>
  );
}

export default HospitalSettings;
