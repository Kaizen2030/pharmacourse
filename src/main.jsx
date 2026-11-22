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

// A tab opened before a deploy asks for page files that no longer exist on Vercel (their names change every build).
// Reload once to pick up the new build instead of showing a broken page. The guard stops a reload loop.
window.addEventListener("vite:preloadError", (event) => {
  let reloaded = false
  try { reloaded = sessionStorage.getItem("pc-chunk-reload") === "1" } catch { /* storage blocked */ }
  if (reloaded) return
  event.preventDefault()
  try { sessionStorage.setItem("pc-chunk-reload", "1") } catch { /* storage blocked */ }
  window.location.reload()
})
window.addEventListener("load", () => {
  // The new build loaded fine: allow one recovery reload again for the next deploy.
  setTimeout(() => { try { sessionStorage.removeItem("pc-chunk-reload") } catch { /* storage blocked */ } }, 10000)
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
