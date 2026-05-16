import DOMPurify from "dompurify"
import MarkdownContent from "./MarkdownContent"

function looksLikeHtml(content) {
  return /<[^>]+>/.test(`${content || ""}`)
}

export default function BlogContentRenderer({ content = "", className = "markdown-content" }) {
  const normalizedContent = `${content || ""}`.trim()

  if (!normalizedContent) return null

  if (!looksLikeHtml(normalizedContent)) {
    return <MarkdownContent content={normalizedContent} className={className} />
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(normalizedContent, {
          FORBID_ATTR: ["style"],
        }),
      }}
    />
  )
}
