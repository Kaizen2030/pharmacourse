import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { MessageCircle, Send, X } from "lucide-react"
import { FAQ, contextMessage, matchFaq, waLink } from "../lib/whatsappConfig"
import "./ChatWidget.css"

const HIDDEN_ROUTES = /^\/(learn|pos|patient|activate|admin|simulation)/i

export default function ChatWidget() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! Ask me about courses, workshops or our software, or tap a question below." },
  ])
  const [teaser, setTeaser] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem("cw-teaser") === "1" } catch { /* storage unavailable */ }
    if (seen) return undefined
    const timer = setTimeout(() => {
      setTeaser(true)
      try { sessionStorage.setItem("cw-teaser", "1") } catch { /* storage unavailable */ }
    }, 8000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (HIDDEN_ROUTES.test(pathname)) return null

  const handoff = waLink(contextMessage(pathname, document.title))

  function pushBot(message) {
    setMessages((current) => [...current, { from: "bot", ...message }])
  }

  async function ask(question) {
    const text = question.trim().slice(0, 500)
    if (!text) return
    setMessages((current) => [...current, { from: "me", text }])
    setInput("")

    const match = matchFaq(text)
    if (match) {
      pushBot({ text: match.a, link: match.link })
      return
    }

    pushBot({
      text: handoff
        ? "I don't have an answer for that yet. You can ask the general support team on WhatsApp."
        : "I don't have an answer for that yet. Visit the Pharmacourse community for help.",
      wa: Boolean(handoff),
      link: handoff ? null : { to: "/community", label: "Open Community" },
    })
  }

  return (
    <>
      {!open && teaser ? (
        <button type="button" className="cw-teaser" onClick={() => { setTeaser(false); setOpen(true) }}>
          Need help? Ask us here
        </button>
      ) : null}

      {open ? (
        <section className="cw-panel" aria-label="Pharmacourse help chat">
          <header className="cw-head">
            <div>
              <strong>Pharmacourse help</strong>
              <span>Website assistant</span>
            </div>
            <button type="button" className="cw-icon-btn" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </header>

          <div className="cw-list" ref={listRef} aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${index}-${message.from}`} className={`cw-msg ${message.from}`}>
                <p>{message.text}</p>
                {message.link ? <Link to={message.link.to} onClick={() => setOpen(false)}>{message.link.label}</Link> : null}
                {message.wa && handoff ? <a href={handoff} target="_blank" rel="noreferrer">Continue on WhatsApp</a> : null}
              </div>
            ))}
          </div>

          <div className="cw-chips">
            {FAQ.slice(0, 4).concat(FAQ.slice(6, 7)).map((item) => (
              <button key={item.id} type="button" onClick={() => void ask(item.q)}>{item.q}</button>
            ))}
          </div>

          <form className="cw-form" onSubmit={(event) => { event.preventDefault(); void ask(input) }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your question" maxLength={500} aria-label="Type your question" />
            <button type="submit" className="cw-send" disabled={!input.trim()} aria-label="Send question">
              <Send size={16} />
            </button>
          </form>

          {handoff ? (
            <footer className="cw-foot">
              <a href={handoff} target="_blank" rel="noreferrer">Chat with general support</a>
            </footer>
          ) : null}
        </section>
      ) : null}

      <button type="button" className="cw-fab" onClick={() => { setTeaser(false); setOpen((value) => !value) }} aria-label={open ? "Close chat" : "Open chat"} aria-expanded={open}>
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </>
  )
}