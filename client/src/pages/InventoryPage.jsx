import AppLayout from "../layouts/AppLayout";
import {
  inventoryActivities,
  inventoryCategories,
  inventoryOverviewCards,
  inventoryRows,
  inventoryTrendBars,
} from "../data/navigation";

function InventoryPage() {
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
          <section className="panel inventory-table-card">
            <div className="panel-header">
              <div>
                <h2>Inventory</h2>
              </div>
              <button className="panel-more" type="button" aria-label="Inventory table actions">
                ...
              </button>
            </div>

            <div className="table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th />
                    <th>Photo</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Availability</th>
                    <th>Quantity in Stock</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.map((row) => (
                    <tr key={row.sku}>
                      <td><span className="table-check" aria-hidden="true" /></td>
                      <td><span className="inventory-thumb" aria-hidden="true" /></td>
                      <td>
                        <div className="table-meta">
                          <strong>{row.item}</strong>
                          <p>{row.sku}</p>
                        </div>
                      </td>
                      <td>{row.category}</td>
                      <td>
                        <span className={`status-pill inventory-status inventory-status--${row.availability.toLowerCase().replace(/\s+/g, "-")}`}>
                          {row.availability}
                        </span>
                      </td>
                      <td>
                        <div className="inventory-quantity">
                          <strong>{row.quantity}</strong>
                          <div className="inventory-progress">
                            <span style={{ width: `${row.percent}%` }} />
                          </div>
                          <small>{row.percent}%</small>
                        </div>
                      </td>
                      <td>
                        <div className="table-meta">
                          <strong>{row.status}</strong>
                          <p>{row.state}</p>
                        </div>
                      </td>
                      <td>
                        <button className="inventory-action-button" type="button">{row.action}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
