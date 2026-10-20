import { useEffect, useRef, useState } from "react"
import { registerDialogHost } from "../lib/dialog"

export default function DialogHost() {
  const [dialog, setDialog] = useState(null)
  const confirmRef = useRef(null)

  useEffect(() => registerDialogHost(setDialog), [])

  useEffect(() => {
    if (!dialog) return undefined
    const previous = document.activeElement
    confirmRef.current?.focus()
    const onKey = (event) => { if (event.key === "Escape") close(false) }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      if (previous instanceof HTMLElement) previous.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog])

  function close(result) {
    if (!dialog) return
    const { resolve } = dialog
    setDialog(null)
    resolve(result)
  }

  if (!dialog) return null
  return (
    <div className="dialog-backdrop" onClick={() => close(false)}>
      <div className="dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="dialog-title" className="dialog-title">{dialog.title}</h2>
        {dialog.message ? <p className="dialog-message">{dialog.message}</p> : null}
        <div className="dialog-actions">
          {dialog.kind === "confirm" ? <button type="button" className="btn btn-outline" onClick={() => close(false)}>{dialog.cancelLabel}</button> : null}
          <button ref={confirmRef} type="button" className={`btn ${dialog.danger ? "btn-danger" : "btn-primary"}`} onClick={() => close(true)}>{dialog.confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
