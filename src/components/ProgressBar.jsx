export default function ProgressBar({ percent, label }) {
  return (
    <div>
      {label && (
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:" .3rem" }}>
          <span style={{ fontSize:" .82rem", color:"var(--text-500)" }}>{label}</span>
          <span style={{ fontSize:" .82rem", fontWeight:600, color:"var(--green)" }}>{percent}%</span>
        </div>
      )}
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width:`${percent}%` }} />
      </div>
    </div>
  )
}
