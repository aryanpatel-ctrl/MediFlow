import { useEffect, useMemo, useState } from "react";
import { Eye, Edit2, Plus, Search, Trash2 } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import MediFlowDataTable from "../components/DataTable";
import MedicineModal from "../components/MedicineModal";
import MedicineViewModal from "../components/MedicineViewModal";
import toast from "react-hot-toast";
import { useHospitalSettings } from "../hooks";
import api from "../services/api";

const CATEGORY_TONES = ["striped", "soft", "mint", "light", "dark"];

const getCategoryTone = (index) => CATEGORY_TONES[index % CATEGORY_TONES.length];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDateLabel = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function InventoryPage() {
  const { inventoryCategories } = useHospitalSettings();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [viewMedicine, setViewMedicine] = useState(null);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    setLoading(true);

    try {
      const response = await api.get("/medicines", {
        params: { limit: 500 },
      });
      setMedicines(response.data.medicines || []);
    } catch (error) {
      console.error("Failed to fetch medicines:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete "${row.item}"?`)) {
      return;
    }

    setDeletingId(row._id);
    try {
      await api.delete(`/medicines/${row._id}`);
      setMedicines((prev) => prev.filter((medicine) => medicine._id !== row._id));
      toast.success(`${row.item} deleted`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete medicine");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMedicineSaved = (savedMedicine) => {
    setMedicines((current) => {
      const existingIndex = current.findIndex((item) => item._id === savedMedicine._id);

      if (existingIndex === -1) {
        return [savedMedicine, ...current];
      }

      const next = [...current];
      next[existingIndex] = savedMedicine;
      return next;
    });
  };

  const handleBulkDelete = async (selectedRows) => {
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} item(s)?`)) {
      return;
    }

    try {
      await Promise.all(selectedRows.map((row) => api.delete(`/medicines/${row._id}`)));
      const selectedIds = new Set(selectedRows.map((row) => row._id));
      setMedicines((prev) => prev.filter((medicine) => !selectedIds.has(medicine._id)));
      toast.success(`${selectedRows.length} item(s) deleted`);
    } catch (error) {
      toast.error("Failed to delete some medicines");
    }
  };

  const inventoryRows = useMemo(
    () =>
      medicines.map((medicine) => ({
        ...medicine,
        item: medicine.name,
        category: medicine.category,
        typeLabel: medicine.type,
        genericLabel: medicine.genericName || "--",
        strengthLabel: medicine.strength || "--",
        priceLabel: formatCurrency(medicine.pricePerUnit),
        prescriptionLabel: medicine.requiresPrescription ? "Prescription" : "OTC",
        updatedLabel: formatDateLabel(medicine.updatedAt || medicine.createdAt),
      })),
    [medicines]
  );

  const filteredInventoryRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return inventoryRows;
    }

    return inventoryRows.filter((item) =>
      [
        item.item,
        item.genericName,
        item.category,
        item.type,
        item.strength,
        item.manufacturer,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [inventoryRows, searchText]);

  const activeCategories = useMemo(() => {
    const medicineCategories = Array.from(
      new Set(inventoryRows.map((item) => item.category).filter(Boolean))
    );

    return medicineCategories.length ? medicineCategories : inventoryCategories;
  }, [inventoryCategories, inventoryRows]);

  const categoryBreakdown = useMemo(() => {
    const totalItems = inventoryRows.length || 1;

    return activeCategories.map((category, index) => {
      const count = inventoryRows.filter((item) => item.category === category).length;
      const percent = Math.round((count / totalItems) * 100);

      return {
        label: category,
        value: `${percent}%`,
        count: String(count),
        tone: getCategoryTone(index),
      };
    });
  }, [activeCategories, inventoryRows]);

  const overviewCards = useMemo(() => {
    const totalItems = inventoryRows.length;
    const prescriptionItems = inventoryRows.filter((item) => item.requiresPrescription).length;
    const otcItems = totalItems - prescriptionItems;
    const totalCategories = activeCategories.length;
    const averagePrice = totalItems
      ? Math.round(
          inventoryRows.reduce((sum, item) => sum + (item.pricePerUnit || 0), 0) / totalItems
        )
      : 0;

    return [
      {
        label: "Total Medicines",
        value: `${totalItems}`,
        delta: `${totalCategories} active categories`,
        icon: "BX",
        tone: "teal",
      },
      {
        label: "Prescription Items",
        value: `${prescriptionItems}`,
        delta: totalItems ? `${Math.round((prescriptionItems / totalItems) * 100)}% of catalog` : "0% of catalog",
        icon: "RX",
        tone: "mint",
      },
      {
        label: "OTC Items",
        value: `${otcItems}`,
        delta: totalItems ? `${Math.round((otcItems / totalItems) * 100)}% of catalog` : "0% of catalog",
        icon: "OT",
        tone: "soft",
      },
      {
        label: "Average Unit Price",
        value: formatCurrency(averagePrice),
        delta: "Calculated from active medicines",
        icon: "PR",
        tone: "light",
      },
    ];
  }, [activeCategories.length, inventoryRows]);

  const typeDistribution = useMemo(() => {
    const counts = inventoryRows.reduce((accumulator, item) => {
      accumulator[item.type] = (accumulator[item.type] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 7)
      .map(([type, count]) => ({
        day: type,
        value: count,
        delta: `${count} item${count === 1 ? "" : "s"}`,
      }));
  }, [inventoryRows]);

  const maxTypeDistributionValue = useMemo(
    () => Math.max(...typeDistribution.map((item) => item.value), 1),
    [typeDistribution]
  );

  const inventoryActivities = useMemo(
    () =>
      [...inventoryRows]
        .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
        .slice(0, 8),
    [inventoryRows]
  );

  const tableColumns = useMemo(
    () => [
      {
        name: "Medicine",
        selector: (row) => row.item,
        sortable: true,
        cell: (row) => (
          <div className="table-user-cell">
            <div
              className="table-avatar"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--surface-soft)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: "0.65rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {row.item.split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </div>
            <div className="table-user-info inventory-table-user-info">
              <span className="table-user-name inventory-truncate" title={row.item}>{row.item}</span>
              <span className="table-user-email inventory-truncate" title={row.genericLabel}>{row.genericLabel}</span>
            </div>
          </div>
        ),
        minWidth: "220px",
      },
      {
        name: "Category",
        selector: (row) => row.category,
        sortable: true,
        cell: (row) => (
          <span className="inventory-truncate" title={row.category}>
            {row.category}
          </span>
        ),
        minWidth: "140px",
      },
      {
        name: "Type",
        selector: (row) => row.typeLabel,
        sortable: true,
        cell: (row) => (
          <div className="table-user-info inventory-table-user-info">
            <span className="table-user-name inventory-truncate" title={row.typeLabel}>{row.typeLabel}</span>
            <span className="table-user-email inventory-truncate" title={row.strengthLabel}>{row.strengthLabel}</span>
          </div>
        ),
        minWidth: "120px",
      },
      {
        name: "Price",
        selector: (row) => row.pricePerUnit || 0,
        sortable: true,
        cell: (row) => <strong>{row.priceLabel}</strong>,
        minWidth: "130px",
      },
      {
        name: "Prescription",
        selector: (row) => row.prescriptionLabel,
        sortable: true,
        cell: (row) => (
          <span className={`status-badge ${row.requiresPrescription ? "scheduled" : "completed"}`}>
            {row.prescriptionLabel}
          </span>
        ),
        minWidth: "130px",
      },
      {
        name: "Updated",
        selector: (row) => new Date(row.updatedAt || row.createdAt).getTime(),
        sortable: true,
        cell: (row) => row.updatedLabel,
        minWidth: "130px",
      },
      {
        name: "Actions",
        cell: (row) => (
          <div className="table-actions">
            <button
              className="table-action-btn view"
              onClick={() => setViewMedicine(row)}
              title="View"
            >
              <Eye size={16} />
            </button>
            <button
              className="table-action-btn edit"
              onClick={() => {
                setSelectedMedicine(row);
                setShowMedicineModal(true);
              }}
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              className="table-action-btn delete"
              onClick={() => handleDelete(row)}
              title="Delete"
              disabled={deletingId === row._id}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
        ignoreRowClick: true,
        minWidth: "120px",
      },
    ],
    [deletingId]
  );

  const tableTitle = (
      <div className="appointments-table-toolbar">
        <div className="datatable-title">
          <h2>Inventory</h2>
          <p>{filteredInventoryRows.length} medicine records</p>
        </div>
      <div className="datatable-search appointments-table-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="search-input"
        />
        {searchText && (
          <button
            className="search-clear"
            onClick={() => setSearchText("")}
            type="button"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>
      <button
        className="btn-primary appointments-table-add-button"
        type="button"
        onClick={() => {
          setSelectedMedicine(null);
          setShowMedicineModal(true);
        }}
      >
        <Plus size={16} />
        <span>Add Medicine</span>
      </button>
    </div>
  );

  return (
    <AppLayout title="Inventory" subtitle="Monitor medicines, categories, and catalog coverage">
      <main className="inventory-page">
        <section className="inventory-overview">
          {overviewCards.map((card) => (
            <article className={`appointment-card inventory-card inventory-card--${card.tone}`} key={card.label}>
              <div className="appointment-card__top">
                <div className="appointment-card__label">
                  <span>{card.label}</span>
                </div>
                <div className="appointment-card__icon" aria-hidden="true">
                  {card.icon}
                </div>
              </div>
              <div className="appointment-card__body">
                <strong>{card.value}</strong>
              </div>
              <p>{card.delta}</p>
            </article>
          ))}
        </section>

        <section className="inventory-top-grid">
          <section className="panel inventory-trend-card">
            <div className="panel-header">
              <div>
                <h2>Medicine Type Distribution</h2>
              </div>
              <button type="button">Live Data</button>
            </div>
            <div className="inventory-trend-layout">
              <div className="inventory-trend-summary">
                <strong>{inventoryRows.length}</strong>
                <p>Active medicines currently available in the medicine catalog</p>
              </div>
              <div className="inventory-trend-chart" aria-hidden="true">
                <div className="inventory-trend-axis">
                  {[...Array(5)].map((_, index) => {
                    const maxValue = Math.max(...typeDistribution.map((item) => item.value), 0);
                    const tick = Math.round(maxValue - (maxValue / 4) * index);
                    return <span key={`${tick}-${index}`}>{tick}</span>;
                  })}
                </div>
                {typeDistribution.map((item) => (
                  <div className="inventory-trend-column" key={item.day}>
                    <small>{item.delta}</small>
                    <div className="inventory-trend-track">
                      <span
                        style={{
                          height: `${Math.max(18, Math.round((item.value / maxTypeDistributionValue) * 180))}px`,
                        }}
                      />
                    </div>
                    <strong>{item.day}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel inventory-category-card">
            <div className="panel-header">
              <div>
                <h2>Category Breakdown</h2>
              </div>
              <button className="panel-more" type="button" aria-label="Category breakdown actions">
                ...
              </button>
            </div>
            <div className="inventory-category-bars" aria-hidden="true">
              {categoryBreakdown.map((item) => (
                <span className={`inventory-category-bar inventory-category-bar--${item.tone}`} key={item.label} />
              ))}
            </div>
            <div className="inventory-category-list">
              {categoryBreakdown.map((item) => (
                <article className="inventory-category-item" key={item.label}>
                  <strong>{item.label}</strong>
                  <div>
                    <span>{item.value}</span>
                    <small>{item.count}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="inventory-bottom-grid">
          <section className="inventory-table-section">
            <MediFlowDataTable
              className="inventory-datatable"
              title={tableTitle}
              columns={tableColumns}
              data={filteredInventoryRows}
              loading={loading}
              selectableRows={true}
              onBulkDelete={handleBulkDelete}
              searchable={false}
              pagination={true}
              paginationPerPage={10}
              paginationRowsPerPageOptions={[10, 25, 50, 100]}
              noDataMessage="No medicine inventory records found"
            />
          </section>

          <aside className="panel inventory-activity-card">
            <div className="panel-header panel-header--tight">
              <h2>Recent Medicine Updates</h2>
              <button className="panel-more" type="button" aria-label="Inventory activities actions">
                ...
              </button>
            </div>
            <div className="inventory-activity-list">
              {inventoryActivities.length > 0 ? (
                inventoryActivities.map((item, index) => (
                  <article className="inventory-activity-item" key={item._id}>
                    <span className={`inventory-activity-icon inventory-activity-icon--${index % 3 === 0 ? "teal" : index % 3 === 1 ? "mint" : "soft"}`} />
                    <div>
                      <strong>{item.item}</strong>
                      <p>
                        {item.category} | {item.typeLabel} | Updated {item.updatedLabel}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="pd-empty">No medicine updates found</p>
              )}
            </div>
          </aside>
        </section>
      </main>

      <MedicineModal
        isOpen={showMedicineModal}
        medicine={selectedMedicine}
        onClose={() => {
          setShowMedicineModal(false);
          setSelectedMedicine(null);
        }}
        onSuccess={handleMedicineSaved}
      />

      <MedicineViewModal
        isOpen={Boolean(viewMedicine)}
        medicine={viewMedicine}
        onClose={() => setViewMedicine(null)}
      />
    </AppLayout>
  );
}

export default InventoryPage;
