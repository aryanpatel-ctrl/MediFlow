import { Facebook, Instagram, Linkedin, X, Youtube } from "lucide-react";
import { useState } from "react";

const modalContent = {
  privacy: {
    title: "Privacy Policy",
    body: "This demo footer uses placeholder legal content. Replace this copy with your organization privacy policy before launch.",
  },
  terms: {
    title: "Terms and Conditions",
    body: "These terms are placeholder content for the dashboard footer modal. Add your actual service terms and compliance language here.",
  },
  contact: {
    title: "Contact",
    body: "Contact us at support@mediflow.ai or +91 99999 99999. Update these placeholders with your real support details.",
  },
};

const socialLinks = [
  { label: "Facebook", href: "#", icon: Facebook },
  { label: "X", href: "#", icon: X },
  { label: "Instagram", href: "#", icon: Instagram },
  { label: "YouTube", href: "#", icon: Youtube },
  { label: "LinkedIn", href: "#", icon: Linkedin },
];

function DashboardFooter() {
  const [activeModal, setActiveModal] = useState(null);

  const currentModal = activeModal ? modalContent[activeModal] : null;

  return (
    <>
      <footer className="dashboard-footer">
        <div className="dashboard-footer__links">
          <span className="dashboard-footer__copyright">Copyright © 2025 Peterdraw</span>
          <button type="button" onClick={() => setActiveModal("privacy")}>
            Privacy Policy
          </button>
          <button type="button" onClick={() => setActiveModal("terms")}>
            Term and conditions
          </button>
          <button type="button" onClick={() => setActiveModal("contact")}>
            Contact
          </button>
        </div>

        <div className="dashboard-footer__social">
          {socialLinks.map((item) => {
            const Icon = item.icon;

            return (
              <a key={item.label} href={item.href} aria-label={item.label}>
                <Icon size={18} strokeWidth={1.8} />
              </a>
            );
          })}
        </div>
      </footer>

      {currentModal ? (
        <div className="dashboard-footer-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-footer-modal-title">
          <button
            className="dashboard-footer-modal__backdrop"
            type="button"
            aria-label="Close dialog"
            onClick={() => setActiveModal(null)}
          />
          <div className="dashboard-footer-modal__card">
            <div className="dashboard-footer-modal__header">
              <h2 id="dashboard-footer-modal-title">{currentModal.title}</h2>
              <button type="button" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
            <p>{currentModal.body}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default DashboardFooter;
