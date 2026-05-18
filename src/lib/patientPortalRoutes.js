const PATIENT_ROUTE_QUERY_KEYS = ["pharmacy", "branch_name", "branch_location"]

export function buildPatientRouteSearch(searchParamsLike) {
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

  const serialized = nextParams.toString()
  return serialized ? `?${serialized}` : ""
}

export function buildPatientRouteUrl(pathname, searchParamsLike) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`
  return `${normalizedPath}${buildPatientRouteSearch(searchParamsLike)}`
}
