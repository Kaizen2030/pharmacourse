const PATIENT_ROUTE_QUERY_KEYS = ["pharmacy", "branch_name", "branch_location", "redirect"]

export function buildPatientRouteSearch(searchParamsLike, extraParams = {}) {
  const source =
    searchParamsLike instanceof URLSearchParams
      ? searchParamsLike
      : new URLSearchParams(
          typeof searchParamsLike === "string"
            ? searchParamsLike
            : typeof window !== "undefined"
              ? window.location.search
              : "",
        )

  const nextParams = new URLSearchParams()

  PATIENT_ROUTE_QUERY_KEYS.forEach((key) => {
    const value = source.get(key)?.trim()
    if (value) {
      nextParams.set(key, value)
    }
  })

  Object.entries(extraParams || {}).forEach(([key, value]) => {
    const normalizedValue = String(value || "").trim()
    if (normalizedValue) {
      nextParams.set(key, normalizedValue)
    }
  })

  const serialized = nextParams.toString()
  return serialized ? `?${serialized}` : ""
}

export function buildPatientRouteUrl(pathname, searchParamsLike, extraParams = {}) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`
  return `${normalizedPath}${buildPatientRouteSearch(searchParamsLike, extraParams)}`
}

export function getSafePatientRedirectPath(searchParamsLike, fallbackPath = "/patient") {
  const source =
    searchParamsLike instanceof URLSearchParams
      ? searchParamsLike
      : new URLSearchParams(
          typeof searchParamsLike === "string"
            ? searchParamsLike
            : typeof window !== "undefined"
              ? window.location.search
              : "",
        )

  const redirect = source.get("redirect")?.trim()
  if (!redirect) {
    return fallbackPath
  }

  try {
    const resolved = new URL(redirect, "https://remedacarePOS.local")

    if (resolved.origin !== "https://remedacarePOS.local") {
      return fallbackPath
    }

    if (!resolved.pathname.startsWith("/patient")) {
      return fallbackPath
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallbackPath
  }
}
