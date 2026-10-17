import { useLayoutEffect } from "react"
import { setupHomeInteractions } from "./homeInteractions"

/** Call once inside the Home component. Needs the page wrapper to have className "home". */
export default function useHomeInteractions() {
  useLayoutEffect(() => {
    const root = document.querySelector(".home")
    if (!root) return undefined
    return setupHomeInteractions(root)
  }, [])
}
