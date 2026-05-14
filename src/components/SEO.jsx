import { useEffect } from "react"
import { getCanonicalUrl, SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME } from "../lib/siteConfig"

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement("meta")
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })

  return element
}

function ensureLink(selector, attributes) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement("link")
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })

  return element
}

export default function SEO({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  image = SITE_IMAGE,
  type = "website",
  noindex = false,
  jsonLd,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const canonicalUrl = getCanonicalUrl(path)
    const robotsValue = noindex ? "noindex, nofollow" : "index, follow"

    document.title = fullTitle

    ensureMeta('meta[name="description"]', {
      name: "description",
      content: description,
    })

    ensureMeta('meta[name="robots"]', {
      name: "robots",
      content: robotsValue,
    })

    ensureMeta('meta[property="og:title"]', {
      property: "og:title",
      content: fullTitle,
    })

    ensureMeta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    })

    ensureMeta('meta[property="og:type"]', {
      property: "og:type",
      content: type,
    })

    ensureMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    })

    ensureMeta('meta[property="og:image"]', {
      property: "og:image",
      content: image,
    })

    ensureMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    })

    ensureMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: fullTitle,
    })

    ensureMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    })

    ensureMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: image,
    })

    ensureLink('link[rel="canonical"]', {
      rel: "canonical",
      href: canonicalUrl,
    })

    let jsonLdScript = document.getElementById("seo-jsonld")
    if (jsonLd) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement("script")
        jsonLdScript.type = "application/ld+json"
        jsonLdScript.id = "seo-jsonld"
        document.head.appendChild(jsonLdScript)
      }
      jsonLdScript.textContent = JSON.stringify(jsonLd)
    } else if (jsonLdScript) {
      jsonLdScript.remove()
    }

    return () => {
      if (jsonLdScript) {
        jsonLdScript.remove()
      }
    }
  }, [description, image, jsonLd, noindex, path, title, type])

  return null
}
