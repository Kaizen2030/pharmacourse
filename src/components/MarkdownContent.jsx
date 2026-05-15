function renderInlineMarkdown(text, keyPrefix) {
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  const nodes = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    if (match[2] && match[3]) {
      nodes.push(
        <a key={`${keyPrefix}-link-${match.index}`} href={match[3]} target="_blank" rel="noreferrer">
          {match[2]}
        </a>
      )
    } else if (match[4]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${match.index}`}>{match[4]}</strong>)
    } else if (match[5]) {
      nodes.push(<em key={`${keyPrefix}-em-${match.index}`}>{match[5]}</em>)
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export default function MarkdownContent({ content = "", className = "markdown-content" }) {
  const lines = `${content}`.replace(/\r\n/g, "\n").split("\n")
  const blocks = []
  let paragraphLines = []
  let listItems = []
  let listType = null

  function flushParagraph() {
    if (paragraphLines.length === 0) return
    const text = paragraphLines.join(" ").trim()
    if (text) {
      blocks.push(
        <p key={`paragraph-${blocks.length}`}>
          {renderInlineMarkdown(text, `paragraph-${blocks.length}`)}
        </p>
      )
    }
    paragraphLines = []
  }

  function flushList() {
    if (listItems.length === 0 || !listType) return
    const ListTag = listType
    blocks.push(
      <ListTag key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={`item-${index}`}>{renderInlineMarkdown(item, `list-${blocks.length}-${index}`)}</li>
        ))}
      </ListTag>
    )
    listItems = []
    listType = null
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      return
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const HeadingTag = `h${headingMatch[1].length}`
      blocks.push(
        <HeadingTag key={`heading-${blocks.length}`}>
          {renderInlineMarkdown(headingMatch[2], `heading-${blocks.length}`)}
        </HeadingTag>
      )
      return
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listType && listType !== "ul") flushList()
      listType = "ul"
      listItems.push(unorderedMatch[1])
      return
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType && listType !== "ol") flushList()
      listType = "ol"
      listItems.push(orderedMatch[1])
      return
    }

    const quoteMatch = trimmed.match(/^>\s+(.+)$/)
    if (quoteMatch) {
      flushParagraph()
      flushList()
      blocks.push(
        <blockquote key={`quote-${blocks.length}`}>
          {renderInlineMarkdown(quoteMatch[1], `quote-${blocks.length}`)}
        </blockquote>
      )
      return
    }

    paragraphLines.push(trimmed)
  })

  flushParagraph()
  flushList()

  return <div className={className}>{blocks}</div>
}
