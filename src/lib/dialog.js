// Promise-based replacements for window.confirm / window.alert.
//   if (!(await confirmDialog({ title: "Delete tip?", danger: true }))) return
//   await alertDialog("Could not save", error.message)
let host = null

export function registerDialogHost(open) {
  host = open
  return () => { if (host === open) host = null }
}

export function confirmDialog({ title, message = "", confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}) {
  return new Promise((resolve) => {
    if (!host) { resolve(window.confirm([title, message].filter(Boolean).join("\n\n"))); return }
    host({ kind: "confirm", title, message, confirmLabel, cancelLabel, danger, resolve })
  })
}

export function alertDialog(title, message = "") {
  return new Promise((resolve) => {
    if (!host) { window.alert([title, message].filter(Boolean).join("\n\n")); resolve(true); return }
    host({ kind: "alert", title, message, confirmLabel: "OK", resolve })
  })
}
