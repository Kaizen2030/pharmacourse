import { useEffect } from "react"
import { initializeHomeInteractions } from "./homeInteractions"

export default function useHomeInteractions() {
  useEffect(() => {
    const root = document.querySelector(".home")
    return initializeHomeInteractions(root)
  }, [])
}