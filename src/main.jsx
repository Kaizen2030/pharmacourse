import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import "./index.css"
import App from "./App"

if (import.meta.env.PROD) {
  // autoUpdate (vite.config.js): when a new deploy is found on load, the new worker takes over and the page reloads
  // onto it once, so visitors never stay on an old build.
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info("Patient portal is ready for offline shell access.")
    },
    onRegisterError(error) {
      console.error("PWA registration error:", error)
    },
  })
} else if ("serviceWorker" in navigator) {
  // Remove a worker left by an older local preview so localhost cannot mask code changes.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister())
  })
}

// Wipe every offline copy this site saved (page copies, file copies and the offline precache) and remove the service
// worker, so the next load comes straight from the server. Sign-in is not affected (it lives in localStorage).
function resetOfflineStorage() {
  const wipeCaches = "caches" in window
    ? caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))).catch(() => {})
    : Promise.resolve()
  const removeWorker = navigator.serviceWorker?.getRegistrations?.()
    .then((regs) => Promise.all(regs.map((r) => r.unregister()))).catch(() => {}) || Promise.resolve()
  return Promise.race([Promise.all([wipeCaches, removeWorker]), new Promise((resolve) => setTimeout(resolve, 2500))])
}

// One-time clean-up: an older offline copy could hold a web page saved under a style file's name (broken styles).
try {
  if ("caches" in window && localStorage.getItem("pc-cache-clean") !== "3") {
    localStorage.setItem("pc-cache-clean", "3") // set first: never more than one reload
    caches.keys().then((names) => {
      if (names.length === 0) return
      resetOfflineStorage().then(() => window.location.reload())
    }).catch(() => {})
  }
} catch { /* storage blocked */ }

// A file the page needs failed to load (usually right after a deploy): wipe offline copies and reload.
// At most one try per 30 seconds, so a real outage cannot cause a reload loop.
window.addEventListener("vite:preloadError", (event) => {
  let last = 0
  try { last = Number(sessionStorage.getItem("pc-chunk-reload") || 0) } catch { /* storage blocked */ }
  if (Date.now() - last < 30000) return
  event.preventDefault()
  try { sessionStorage.setItem("pc-chunk-reload", String(Date.now())) } catch { /* storage blocked */ }
  resetOfflineStorage().finally(() => window.location.reload())
})

// Error handler for debugging
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

try {
  createRoot(document.getElementById("root")).render(
    <StrictMode><App /></StrictMode>
  )
} catch (error) {
  console.error('React render error:', error)
  // textContent, never innerHTML: an error message must not be able to inject markup.
  const pre = document.createElement('pre')
  pre.textContent = 'Something went wrong while loading Pharmacourse. Please refresh the page.'
  document.getElementById('root').replaceChildren(pre)
}
