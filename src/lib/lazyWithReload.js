import { lazy } from "react"

const FLAG = "pc-chunk-reloaded"

// React.lazy that survives a new deploy: if the old JS chunk no longer exists
// (404 after you publish), reload the page once to pick up the new build.
export default function lazyWithReload(factory) {
  return lazy(() =>
    factory()
      .then((module) => {
        try { sessionStorage.removeItem(FLAG) } catch { /* private mode */ }
        return module
      })
      .catch((error) => {
        let alreadyReloaded = true
        try { alreadyReloaded = sessionStorage.getItem(FLAG) === "1" } catch { /* private mode */ }
        if (!alreadyReloaded) {
          try { sessionStorage.setItem(FLAG, "1") } catch { /* private mode */ }
          window.location.reload()
          return new Promise(() => {})
        }
        throw error
      }),
  )
}
