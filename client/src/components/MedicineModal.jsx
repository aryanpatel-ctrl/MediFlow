import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const INITIAL_FORM = {
  name: "",
  genericName: "",
  category: "",
  type: "",
  strength: "",
  manufacturer: "",
  composition: "",
  commonDosages: "",
  frequencies: "",
  timings: "",
  sideEffects: "",
  contraindications: "",
  warnings: "",
  pricePerUnit: "",
  requiresPrescription: true,
  storageInstructions: "",
  isActive: true,
};

const toCommaSeparated = (value) => (Array.isArray(value) ? value.join(", ") : "");
const toArray = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function MedicineModal({ isOpen, onClose, onSuccess, medicine }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(medicine?._id);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData({
      name: medicine?.name || "",
      genericName: medicine?.genericName || "",
      category: medicine?.category || "",
      type: medicine?.type || "",
      strength: medicine?.strength || "",
      manufacturer: medicine?.manufacturer || "",
      composition: medicine?.composition || "",
      commonDosages: toCommaSeparated(medicine?.commonDosages),
      frequencies: toCommaSeparated(medicine?.frequencies),
      timings: toCommaSeparated(medicine?.timings),
      sideEffects: toCommaSeparated(medicine?.sideEffects),
      contraindications: toCommaSeparated(medicine?.contraindications),
      warnings: toCommaSeparated(medicine?.warnings),
      pricePerUnit: medicine?.pricePerUnit ?? "",
      requiresPrescription: medicine?.requiresPrescription ?? true,
      storageInstructions: medicine?.storageInstructions || "",
      isActive: medicine?.isActive ?? true,
    });
  }, [isOpen, medicine]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [categoriesRes, typesRes] = await Promise.all([
          api.get("/medicines/categories"),
          api.get("/medicines/types"),
        ]);

        const nextCategories = categoriesRes.data.categories || [];
        const nextTypes = typesRes.data.types || [];

        setCategories(nextCategories);
        setTypes(nextTypes);

        setFormData((current) => ({
          ...current,
          category: current.category || nextCategories[0] || "",
          type: current.type || nextTypes[0] || "",
        }));
      } catch (error) {
        toast.error("Failed to load medicine options");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [isOpen]);

  const modalTitle = useMemo(
    () => (isEditMode ? "Edit Medicine" : "Add New Medicine"),
    [isEditMode]
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.genericName.trim() || !formData.category || !formData.type || !formData.strength.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        genericName: formData.genericName.trim(),
        strength: formData.strength.trim(),
        manufacturer: formData.manufacturer.trim(),
        composition: formData.composition.trim(),
        storageInstructions: formData.storageInstructions.trim(),
        commonDosages: toArray(formData.commonDosages),
        frequencies: toArray(formData.frequencies),
        timings: toArray(formData.timings),
        sideEffects: toArray(formData.sideEffects),
        contraindications: toArray(formData.contraindications),
        warnings: toArray(formData.warnings),
        pricePerUnit: Number(formData.pricePerUnit) || 0,
      };

      const response = isEditMode
        ? await api.put(`/medicines/${medicine._id}`, payload)
        : await api.post("/medicines", payload);

      toast.success(isEditMode ? "Medicine updated" : "Medicine added");
      onSuccess?.(response.data.medicine);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save medicine");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content medicine-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{modalTitle}</h2>
          <button className="modal-close" onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Medicine Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="medicine-name">Medicine Name *</label>
                <input id="medicine-name" name="name" value={formData.name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="medicine-generic">Generic Name *</label>
                <input id="medicine-generic" name="genericName" value={formData.genericName} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="medicine-category">Category *</label>
                <select
                  id="medicine-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={loadingOptions}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="medicine-type">Type *</label>
                <select
                  id="medicine-type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={loadingOptions}
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="medicine-strength">Strength *</label>
                <input id="medicine-strength" name="strength" value={formData.strength} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="medicine-price">Price Per Unit</label>
                <input
                  id="medicine-price"
                  name="pricePerUnit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricePerUnit}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="medicine-manufacturer">Manufacturer</label>
                <input id="medicine-manufacturer" name="manufacturer" value={formData.manufacturer} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="medicine-rx">Prescription Required</label>
                <select
                  id="medicine-rx"
                  name="requiresPrescription"
                  value={formData.requiresPrescription ? "true" : "false"}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      requiresPrescription: event.target.value === "true",
                    }))
                  }
                >
                  <option value="true">Prescription</option>
                  <option value="false">OTC</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="medicine-composition">Composition</label>
              <textarea
                id="medicine-composition"
                name="composition"
                rows="3"
                value={formData.composition}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="medicine-dosages">Common Dosages</label>
              <textarea
                id="medicine-dosages"
                name="commonDosages"
                rows="2"
                value={formData.commonDosages}
                onChange={handleChange}
              />
              <small>Separate multiple values with commas</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="medicine-frequencies">Frequencies</label>
                <textarea
                  id="medicine-frequencies"
                  name="frequencies"
                  rows="2"
                  value={formData.frequencies}
                  onChange={handleChange}
                />
                <small>Example: Once daily, Twice daily</small>
              </div>
              <div className="form-group">
                <label htmlFor="medicine-timings">Timings</label>
                <textarea
                  id="medicine-timings"
                  name="timings"
                  rows="2"
                  value={formData.timings}
                  onChange={handleChange}
                />
                <small>Example: After food, At bedtime</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="medicine-side-effects">Side Effects</label>
                <textarea
                  id="medicine-side-effects"
                  name="sideEffects"
                  rows="3"
                  value={formData.sideEffects}
                  onChange={handleChange}
                />
                <small>Separate multiple values with commas</small>
              </div>
              <div className="form-group">
                <label htmlFor="medicine-contraindications">Contraindications</label>
                <textarea
                  id="medicine-contraindications"
                  name="contraindications"
                  rows="3"
                  value={formData.contraindications}
                  onChange={handleChange}
                />
                <small>Separate multiple values with commas</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="medicine-warnings">Warnings</label>
                <textarea
                  id="medicine-warnings"
                  name="warnings"
                  rows="3"
                  value={formData.warnings}
                  onChange={handleChange}
                />
                <small>Separate multiple values with commas</small>
              </div>
              <div className="form-group">
                <label htmlFor="medicine-active">Status</label>
                <select
                  id="medicine-active"
                  name="isActive"
                  value={formData.isActive ? "true" : "false"}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      isActive: event.target.value === "true",
                    }))
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="medicine-storage">Storage Instructions</label>
              <textarea
                id="medicine-storage"
                name="storageInstructions"
                rows="3"
                value={formData.storageInstructions}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || loadingOptions}>
              {saving ? "Saving..." : isEditMode ? "Save Changes" : "Add Medicine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MedicineModal;
