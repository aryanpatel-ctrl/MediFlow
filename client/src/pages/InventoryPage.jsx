import { useMemo, useState } from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import MediFlowDataTable from "../components/DataTable";
import toast from "react-hot-toast";
import {
  inventoryActivities,
  inventoryCategories,
  inventoryOverviewCards,
  inventoryRows as initialInventoryRows,
  inventoryTrendBars,
} from "../data/navigation";

function InventoryPage() {
  const [inventoryData, setInventoryData] = useState(initialInventoryRows);

  // Handle bulk delete
  const handleBulkDelete = (selectedRows) => {
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} item(s)?`)) {
      return;
    }

    const selectedSkus = selectedRows.map(row => row.sku);
    setInventoryData(prev => prev.filter(item => !selectedSkus.includes(item.sku)));
    toast.success(`${selectedRows.length} item(s) deleted`);
  };

  // Handle single delete
  const handleDelete = (row) => {
    if (!window.confirm(`Are you sure you want to delete "${row.item}"?`)) {
      return;
    }
    setInventoryData(prev => prev.filter(item => item.sku !== row.sku));
    toast.success(`${row.item} deleted`);
  };

  // Define table columns
  const tableColumns = useMemo(() => [
    {
      name: "Item",
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
          <div className="table-user-info">
            <span className="table-user-name">{row.item}</span>
            <span className="table-user-email">{row.sku}</span>
          </div>
        </div>
      ),
      minWidth: "220px",
    },
    {
      name: "Category",
      selector: (row) => row.category,
      sortable: true,
      minWidth: "120px",
    },
    {
      name: "Availability",
      selector: (row) => row.availability,
      sortable: true,
      cell: (row) => (
        <span className={`status-badge ${row.availability.toLowerCase() === 'available' ? 'completed' : row.availability.toLowerCase() === 'low' ? 'canceled' : 'scheduled'}`}>
          {row.availability}
        </span>
      ),
      minWidth: "120px",
    },
    {
      name: "Quantity",
      selector: (row) => row.percent,
      sortable: true,
      cell: (row) => (
        <div className="inventory-quantity">
          <strong>{row.quantity}</strong>
          <div className="inventory-progress">
            <span style={{ width: `${row.percent}%` }} />
          </div>
          <small>{row.percent}%</small>
        </div>
      ),
      minWidth: "150px",
    },
    {
      name: "Expiry",
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <div className="table-user-info">
          <span className="table-user-name">{row.status}</span>
          <span className="table-user-email">{row.state}</span>
        </div>
      ),
      minWidth: "130px",
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="table-actions">
          <button
            className="table-action-btn view"
            onClick={() => toast.success(`Viewing ${row.item}`)}
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            className="table-action-btn edit"
            onClick={() => toast.success(`Editing ${row.item}`)}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="table-action-btn delete"
            onClick={() => handleDelete(row)}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      minWidth: "120px",
    },
  ], []);

  // Table title
  const tableTitle = (
    <div className="datatable-title">
      <h2>Inventory</h2>
      <p>{inventoryData.length} items</p>
    </div>
  );

  return (
    <AppLayout title="Inventory" subtitle="Monitor stock, expiry, and supply movements">
      <main className="inventory-page">
        <section className="inventory-overview">
          {inventoryOverviewCards.map((card) => (
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
                <h2>Inventory Usage Trend</h2>
              </div>
              <button type="button">This Week</button>
            </div>
            <div className="inventory-trend-layout">
              <div className="inventory-trend-summary">
                <strong>+2,6%</strong>
                <p>Inventory Usage Trend normally increase every weeks</p>
              </div>
              <div className="inventory-trend-chart" aria-hidden="true">
                <div className="inventory-trend-axis">
                  {[100, 75, 50, 25, 0].map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                {inventoryTrendBars.map((item) => (
                  <div className="inventory-trend-column" key={item.day}>
                    <small>{item.delta}</small>
                    <div className="inventory-trend-track">
                      <span style={{ height: `${item.value * 1.5}px` }} />
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
              {inventoryCategories.map((item) => (
                <span className={`inventory-category-bar inventory-category-bar--${item.tone}`} key={item.label} />
              ))}
            </div>
            <div className="inventory-category-list">
              {inventoryCategories.map((item) => (
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
              title={tableTitle}
              columns={tableColumns}
              data={inventoryData}
              selectableRows={true}
              onBulkDelete={handleBulkDelete}
              searchable={true}
              searchFields={["item", "sku", "category", "availability"]}
              pagination={true}
              paginationPerPage={10}
              paginationRowsPerPageOptions={[10, 25, 50, 100]}
              noDataMessage="No inventory items found"
            />
          </section>

          <aside className="panel inventory-activity-card">
            <div className="panel-header panel-header--tight">
              <h2>Inventory Activities</h2>
              <button className="panel-more" type="button" aria-label="Inventory activities actions">
                ...
              </button>
            </div>
            <div className="inventory-activity-list">
              {inventoryActivities.map((item, index) => (
                <article className="inventory-activity-item" key={`${item}-${index}`}>
                  <span className={`inventory-activity-icon inventory-activity-icon--${index % 3 === 0 ? "teal" : index % 3 === 1 ? "mint" : "soft"}`} />
                  <div>
                    <strong>{item}</strong>
                    <p>{index < 4 ? "4 hr ago" : index < 7 ? "Yesterday" : "4d ago"}</p>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </AppLayout>
  );
}

export default InventoryPage;
