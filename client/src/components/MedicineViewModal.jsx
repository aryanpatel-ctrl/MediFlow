const formatList = (items) => {
  if (!items || items.length === 0) {
    return "Not provided";
  }

  return items.join(", ");
};

function MedicineViewModal({ isOpen, onClose, medicine }) {
  if (!isOpen || !medicine) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content medicine-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Medicine Details</h2>
          <button className="modal-close" onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <div className="modal-form medicine-view-modal">
          <div className="form-section">
            <h3>{medicine.name}</h3>
            <p className="medicine-view-subtitle">{medicine.genericName}</p>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <div className="medicine-view-value">{medicine.category}</div>
              </div>
              <div className="form-group">
                <label>Type</label>
                <div className="medicine-view-value">{medicine.type}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Strength</label>
                <div className="medicine-view-value">{medicine.strength}</div>
              </div>
              <div className="form-group">
                <label>Price Per Unit</label>
                <div className="medicine-view-value">{medicine.pricePerUnit ?? 0}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Manufacturer</label>
                <div className="medicine-view-value">{medicine.manufacturer || "Not provided"}</div>
              </div>
              <div className="form-group">
                <label>Prescription Required</label>
                <div className="medicine-view-value">
                  {medicine.requiresPrescription ? "Yes" : "No"}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Composition</label>
              <div className="medicine-view-value">{medicine.composition || "Not provided"}</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Common Dosages</label>
                <div className="medicine-view-value">{formatList(medicine.commonDosages)}</div>
              </div>
              <div className="form-group">
                <label>Frequencies</label>
                <div className="medicine-view-value">{formatList(medicine.frequencies)}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Timings</label>
                <div className="medicine-view-value">{formatList(medicine.timings)}</div>
              </div>
              <div className="form-group">
                <label>Warnings</label>
                <div className="medicine-view-value">{formatList(medicine.warnings)}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Side Effects</label>
                <div className="medicine-view-value">{formatList(medicine.sideEffects)}</div>
              </div>
              <div className="form-group">
                <label>Contraindications</label>
                <div className="medicine-view-value">{formatList(medicine.contraindications)}</div>
              </div>
            </div>

            <div className="form-group">
              <label>Storage Instructions</label>
              <div className="medicine-view-value">{medicine.storageInstructions || "Not provided"}</div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MedicineViewModal;
