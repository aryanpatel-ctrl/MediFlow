import { useState, useMemo } from "react";
import DataTable from "react-data-table-component";
import { Search, Trash2, ChevronDown } from "lucide-react";

// Custom styles to match MediFlow design
const customStyles = {
  table: {
    style: {
      backgroundColor: "var(--surface)",
      borderRadius: "var(--radius-md)",
    },
  },
  tableWrapper: {
    style: {
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    },
  },
  header: {
    style: {
      backgroundColor: "var(--surface)",
      minHeight: "56px",
      paddingLeft: "16px",
      paddingRight: "16px",
    },
  },
  headRow: {
    style: {
      backgroundColor: "var(--surface-soft)",
      borderBottomWidth: "1px",
      borderBottomColor: "var(--border)",
      borderBottomStyle: "solid",
      minHeight: "48px",
    },
  },
  headCells: {
    style: {
      fontSize: "0.75rem",
      fontWeight: "600",
      color: "var(--text-soft)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      paddingLeft: "16px",
      paddingRight: "16px",
    },
  },
  rows: {
    style: {
      backgroundColor: "var(--surface)",
      borderBottomWidth: "1px",
      borderBottomColor: "var(--border)",
      borderBottomStyle: "solid",
      minHeight: "56px",
      "&:hover": {
        backgroundColor: "var(--surface-soft)",
        cursor: "pointer",
      },
    },
    selectedHighlightStyle: {
      backgroundColor: "rgba(42, 157, 143, 0.1)",
      borderBottomColor: "var(--accent)",
    },
  },
  cells: {
    style: {
      fontSize: "0.875rem",
      color: "var(--text)",
      paddingLeft: "16px",
      paddingRight: "16px",
    },
  },
  pagination: {
    style: {
      backgroundColor: "var(--surface)",
      borderTopWidth: "1px",
      borderTopColor: "var(--border)",
      borderTopStyle: "solid",
      minHeight: "56px",
    },
    pageButtonsStyle: {
      borderRadius: "var(--radius-sm)",
      height: "32px",
      width: "32px",
      padding: "4px",
      margin: "0 4px",
      cursor: "pointer",
      transition: "0.15s",
      color: "var(--text)",
      fill: "var(--text)",
      backgroundColor: "transparent",
      "&:disabled": {
        cursor: "not-allowed",
        color: "var(--text-soft)",
        fill: "var(--text-soft)",
      },
      "&:hover:not(:disabled)": {
        backgroundColor: "var(--surface-soft)",
      },
    },
  },
  noData: {
    style: {
      padding: "40px",
      color: "var(--text-soft)",
      backgroundColor: "var(--surface)",
    },
  },
};

function MediFlowDataTable({
  className = "",
  title,
  columns,
  data,
  loading = false,
  selectableRows = false,
  onSelectedRowsChange,
  onRowClicked,
  onBulkDelete,
  searchable = true,
  searchFields = [],
  pagination = true,
  paginationPerPage = 10,
  paginationRowsPerPageOptions = [10, 25, 50, 100],
  actions,
  noDataMessage = "No records found",
}) {
  const [searchText, setSearchText] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [toggleCleared, setToggleCleared] = useState(false);
  const hasSubHeader = searchable || Boolean(actions);

  const normalizedColumns = useMemo(
    () =>
      columns.map((column) => {
        const { minWidth, style, ...restColumn } = column;

        if (!minWidth) {
          return column;
        }

        return {
          ...restColumn,
          style: {
            ...style,
            minWidth,
          },
        };
      }),
    [columns]
  );

  // Filter data based on search text
  const filteredData = useMemo(() => {
    if (!searchText) return data;

    return data.filter((item) => {
      // Search in specified fields or all string fields
      const fieldsToSearch = searchFields.length > 0 ? searchFields : Object.keys(item);

      return fieldsToSearch.some((field) => {
        const value = field.split(".").reduce((obj, key) => obj?.[key], item);
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchText.toLowerCase());
      });
    });
  }, [data, searchText, searchFields]);

  // Handle row selection
  const handleRowSelected = (state) => {
    setSelectedRows(state.selectedRows);
    onSelectedRowsChange?.(state);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    onBulkDelete?.(selectedRows);
    setToggleCleared(!toggleCleared);
    setSelectedRows([]);
  };

  // Context actions for selected rows
  const contextActions = useMemo(() => {
    if (!onBulkDelete || selectedRows.length === 0) return null;

    return (
      <button
        className="bulk-delete-btn"
        onClick={handleBulkDelete}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 16px",
          backgroundColor: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.875rem",
          fontWeight: "500",
          cursor: "pointer",
        }}
      >
        <Trash2 size={16} />
        Delete ({selectedRows.length})
      </button>
    );
  }, [selectedRows, toggleCleared]);

  // Subheader with search and actions
  const subHeaderComponent = useMemo(() => {
    return (
      <div className="datatable-subheader">
        {searchable && (
          <div className="datatable-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
            />
            {searchText && (
              <button
                className="search-clear"
                onClick={() => setSearchText("")}
                type="button"
              >
                &times;
              </button>
            )}
          </div>
        )}
        {actions && <div className="datatable-actions">{actions}</div>}
      </div>
    );
  }, [searchText, searchable, actions]);

  return (
    <div className={`datatable-container ${className}`.trim()}>
      <DataTable
        title={title}
        noHeader={!title}
        columns={normalizedColumns}
        data={filteredData}
        customStyles={customStyles}
        progressPending={loading}
        progressComponent={
          <div className="datatable-loading">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        }
        selectableRows={selectableRows}
        onSelectedRowsChange={handleRowSelected}
        clearSelectedRows={toggleCleared}
        contextActions={contextActions}
        onRowClicked={onRowClicked}
        pagination={pagination}
        paginationPerPage={paginationPerPage}
        paginationRowsPerPageOptions={paginationRowsPerPageOptions}
        paginationComponentOptions={{
          rowsPerPageText: "Rows per page:",
          rangeSeparatorText: "of",
          noRowsPerPage: false,
          selectAllRowsItem: true,
          selectAllRowsItemText: "All",
        }}
        subHeader={hasSubHeader}
        subHeaderComponent={subHeaderComponent}
        sortIcon={<ChevronDown size={14} />}
        noDataComponent={
          <div className="datatable-empty">
            <p>{noDataMessage}</p>
          </div>
        }
        highlightOnHover
        pointerOnHover={!!onRowClicked}
        responsive
        dense={false}
      />
    </div>
  );
}

export default MediFlowDataTable;
