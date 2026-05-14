function stripTrailingSlash(url) {
  return url.replace(/\/+$/, "")
}

export function getAppBaseUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL?.trim()

  if (configuredUrl) {
    return stripTrailingSlash(configuredUrl)
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return stripTrailingSlash(window.location.origin)
  }

  return ""
}

export function getAuthRedirectUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getAppBaseUrl()}${normalizedPath}`
}
