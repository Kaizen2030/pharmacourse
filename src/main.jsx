import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

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
