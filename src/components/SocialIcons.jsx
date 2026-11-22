import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { NETWORK_NAMES } from "../lib/socialNetworks"

// Simple brand marks drawn inline (no extra icon package). 24x24 viewBox, filled with currentColor.
const PATHS = {
  facebook: "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z",
  instagram: "M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4.8-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 3.6c2.7 0 3 0 4.1.1 2.7.1 4 1.4 4.1 4.1.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.4 4-4.1 4.1-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4-1.4-4.1-4.1C3.7 15 3.6 14.7 3.6 12s0-3 .1-4.1c.1-2.7 1.4-4 4.1-4.1 1.1-.1 1.4-.1 4.2-.1zM12 2c-2.7 0-3.1 0-4.2.1-3.6.2-5.6 2.2-5.7 5.7C2 8.9 2 9.3 2 12s0 3.1.1 4.2c.2 3.6 2.2 5.6 5.7 5.7 1.1.1 1.5.1 4.2.1s3.1 0 4.2-.1c3.6-.2 5.6-2.2 5.7-5.7.1-1.1.1-1.5.1-4.2s0-3.1-.1-4.2c-.2-3.6-2.2-5.6-5.7-5.7C15.1 2 14.7 2 12 2z",
  tiktok: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z",
  linkedin: "M6.9 8.8H3.6V20h3.3V8.8zM5.2 3.5a1.9 1.9 0 1 0 0 3.9 1.9 1.9 0 0 0 0-3.9zM20.4 13.6c0-3-.6-5.1-4.1-5.1-1.7 0-2.8.9-3.2 1.8h-.1V8.8H9.9V20h3.3v-5.5c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.3v-6.4z",
  x: "M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z",
  youtube: "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z",
  whatsapp: "M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1a8.2 8.2 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4l-.8-.5zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3z",
}

export function BrandIcon({ network, size = 18 }) {
  const d = PATHS[network]
  if (!d) return null
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={d} /></svg>
}

// Footer row of channel icons, from Admin > Blog & site > Social > Channels.
export default function SocialLinks({ className = "" }) {
  const [links, setLinks] = useState([])
  useEffect(() => {
    let active = true
    supabase.from("site_social_links").select("network, url, show_in_footer, display_order").order("display_order")
      .then(({ data }) => { if (active) setLinks((data || []).filter((l) => l.url && l.show_in_footer)) })
    return () => { active = false }
  }, [])
  if (!links.length) return null
  return (
    <ul className={`social-links ${className}`} aria-label="Pharmacourse on social media">
      {links.map((l) => (
        <li key={l.network}>
          <a href={l.url} target="_blank" rel="noopener noreferrer me" aria-label={`Pharmacourse on ${NETWORK_NAMES[l.network]}`} title={NETWORK_NAMES[l.network]}>
            <BrandIcon network={l.network} />
          </a>
        </li>
      ))}
    </ul>
  )
}
