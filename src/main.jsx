import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import "./index.css"
import App from "./App"

if (import.meta.env.PROD) {
  registerSW({
    immediate: false,
    onNeedRefresh() {
      console.info("PWA update ready. Refresh when convenient to load the latest portal shell.")
    },
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
  document.getElementById('root').innerHTML = `<pre>Error: ${error.message}</pre>`
}
