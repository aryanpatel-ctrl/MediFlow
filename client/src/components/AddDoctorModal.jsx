import { useEffect } from "react";
import { doctorWorkDays } from "../data/navigation";

function AddDoctorModal({ onClose }) {
  const appointmentLimits = ["10", "20", "30"];
  const consultationTypes = ["Offline", "Online"];

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.classList.add("modal-open");

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.classList.remove("modal-open");
    };
  }, []);

  return (
    <div className="add-doctor-modal" role="dialog" aria-modal="true" aria-labelledby="add-doctor-title">
      <div className="add-doctor-modal__backdrop" onClick={onClose} />

      <section className="add-doctor-card">
        <header className="add-doctor-card__header">
          <div className="add-doctor-card__title">
            <h2 id="add-doctor-title">Add New Doctor</h2>
          </div>
          <div className="add-doctor-card__actions">
            <button className="close-button" type="button" aria-label="Close add doctor form" onClick={onClose}>
              ×
            </button>
            <button className="doctor-action ghost doctor-action--compact" type="button">
              Status
            </button>
            <button className="doctor-action primary doctor-action--compact" type="button">
              Add New Doctor
            </button>
          </div>
        </header>

        <div className="add-doctor-card__tabbar">
          <button className="add-doctor-card__tab is-active" type="button">
            Personal Info
          </button>
        </div>

        <form className="doctor-form">
          <section className="doctor-form-section">
            <div className="doctor-form-intro">
              <div className="doctor-form-profile">
                <div className="doctor-form-photo doctor-form-photo--emerald" aria-hidden="true">
                  <div className="doctor-illustration doctor-illustration--female" />
                </div>
                <button className="upload-avatar-button" type="button" aria-label="Edit profile photo">
                  ⌁
                </button>
              </div>

              <div className="doctor-form-intro__body">
                <div className="doctor-form-grid doctor-form-grid--two">
                  <label className="form-field">
                    <span>Full Name</span>
                    <input defaultValue="Dr. Elena Morales" />
                  </label>
                  <fieldset className="form-field form-radio-group">
                    <legend>Gender</legend>
                    <label><input type="radio" name="gender" defaultChecked /> Female</label>
                    <label><input type="radio" name="gender" /> Male</label>
                    <label><input type="radio" name="gender" /> Other</label>
                  </fieldset>
                  <label className="form-field">
                    <span>Date of Birth</span>
                    <input defaultValue="17 October 1985" />
                  </label>
                  <label className="form-field">
                    <span>Doctor ID</span>
                    <input defaultValue="DR-1025" />
                  </label>
                </div>

                <label className="form-field">
                  <span>About</span>
                  <textarea defaultValue="Dr. Elena is a board-certified endocrinologist with a focus on diabetes and thyroid disorders, known for her clear explanations and patient-centered treatment plans." />
                </label>
              </div>
            </div>
          </section>

          <section className="doctor-form-section">
            <h3>Contact Info</h3>
            <div className="doctor-form-grid doctor-form-grid--three">
              <label className="form-field is-invalid">
                <span>Phone Number</span>
                <input placeholder="Input your phone number" />
              </label>
              <label className="form-field">
                <span>Email Address</span>
                <input defaultValue="elena.morales@medlinkhospital.com" />
              </label>
              <label className="form-field doctor-form-grid__full">
                <span>Address</span>
                <input defaultValue="Jl. Harmoni Raya No. 22, Jakarta, Indonesia" />
              </label>
              <label className="form-field">
                <span>Emergency Contact</span>
                <input defaultValue="Miguel Morales" />
              </label>
              <label className="form-field">
                <span>Phone Number</span>
                <input defaultValue="+62 813 7700 1198" />
              </label>
            </div>
          </section>

          <section className="doctor-form-section">
            <h3>Professional Info</h3>
            <div className="doctor-form-grid doctor-form-grid--two">
              <label className="form-field">
                <span>Department</span>
                <select defaultValue="Endocrinology">
                  <option>Endocrinology</option>
                  <option>Cardiology</option>
                  <option>Pediatrics</option>
                </select>
              </label>
              <label className="form-field">
                <span>Specialization</span>
                <select defaultValue="Diabetes & Metabolic Disorders">
                  <option>Diabetes & Metabolic Disorders</option>
                  <option>Thyroid Disorders</option>
                </select>
              </label>
              <fieldset className="form-field form-radio-group">
                <legend>Work Type</legend>
                <label><input type="radio" name="workType" defaultChecked /> Full Time</label>
                <label><input type="radio" name="workType" /> Part Time</label>
              </fieldset>
              <label className="form-field">
                <span>Employment Start Date</span>
                <input defaultValue="01 April 2031" />
              </label>
              <label className="form-field doctor-form-grid__full">
                <span>Salary</span>
                <div className="salary-field">
                  <input defaultValue="IDR 38,000,000" />
                  <small>/ month</small>
                </div>
              </label>
            </div>
          </section>

          <section className="doctor-form-section">
            <h3>License & Certifications</h3>
            <div className="doctor-form-grid doctor-form-grid--two">
              <label className="form-field">
                <span>Medical License Number</span>
                <input defaultValue="MD-MED-EN-459721" />
              </label>
              <label className="form-field upload-field">
                <span>Certificate Uploads</span>
                <div className="upload-dropzone">
                  <strong>Drag and Drop or Browse File</strong>
                  <small>Max size 10 MB</small>
                </div>
                <div className="upload-files">
                  <span>Medical_License_FinalReview.pdf</span>
                  <span>Board_Cert_Endocrinology_Endocrinologists.pdf</span>
                </div>
              </label>
              <label className="form-field">
                <span>License Expiry Date</span>
                <input defaultValue="30 September 2040" />
              </label>
            </div>
          </section>

          <section className="doctor-form-section">
            <h3>Schedule</h3>
            <div className="schedule-editor">
              {doctorWorkDays.map((item) => (
                <div className="schedule-editor__row" key={item.day}>
                  <label className="schedule-editor__toggle">
                    <input type="checkbox" defaultChecked={item.enabled} />
                    <span>{item.day}</span>
                  </label>
                  <div className="schedule-time-pair">
                    <input defaultValue={item.start} />
                    <span>:</span>
                    <input defaultValue="00" />
                  </div>
                  <div className="schedule-time-pair">
                    <input defaultValue={item.end} />
                    <span>:</span>
                    <input defaultValue="00" />
                  </div>
                </div>
              ))}
            </div>

            <div className="appointment-duration-row">
              <div>
                <span>Max Appointment Per Day</span>
                <div className="toggle-pills">
                  {appointmentLimits.map((item) => (
                    <button type="button" className={item === "30" ? "is-active" : ""} key={item}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span>Consultation Type</span>
                <div className="toggle-pills">
                  {consultationTypes.map((item) => (
                    <button type="button" className={item === "Offline" ? "is-active" : ""} key={item}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="doctor-form-footer">
            <button className="footer-button ghost" type="button">Save Draft</button>
            <button className="footer-button primary" type="submit">Add Doctor</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AddDoctorModal;
