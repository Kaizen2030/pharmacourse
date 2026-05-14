function buildPageNumbers(currentPage, totalPages) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
}

function buttonStyle(disabled, active = false) {
  return {
    minWidth: "2.4rem",
    padding: "0.55rem 0.8rem",
    borderRadius: "0.7rem",
    border: active ? "1px solid #0F6E56" : "1px solid var(--gray-300, #d1d5db)",
    background: active ? "#0F6E56" : "#fff",
    color: active ? "#fff" : disabled ? "var(--text-300, #94a3b8)" : "var(--gray-700, #374151)",
    fontSize: "0.88rem",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  }
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  label = "items",
}) {
  if (!totalPages || totalPages <= 1) return null

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)
  const pages = buildPageNumbers(currentPage, totalPages)

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
        marginTop: "1.5rem",
      }}
    >
      <p style={{ margin: 0, color: "var(--text-500)", fontSize: "0.88rem" }}>
        Showing {startItem}-{endItem} of {totalItems} {label}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1} style={buttonStyle(currentPage === 1)}>
          First
        </button>
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={buttonStyle(currentPage === 1)}>
          Previous
        </button>

        {pages.map((page, index) => {
          const previousPage = pages[index - 1]
          const showGap = previousPage && page - previousPage > 1

          return (
            <span key={page} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              {showGap && <span style={{ color: "var(--text-500)", fontSize: "0.9rem" }}>...</span>}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
                style={buttonStyle(false, page === currentPage)}
              >
                {page}
              </button>
            </span>
          )
        })}

        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={buttonStyle(currentPage === totalPages)}>
          Next
        </button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} style={buttonStyle(currentPage === totalPages)}>
          Last
        </button>
      </div>
    </div>
  )
}
