import { useEffect } from 'react'

interface PwaIdentity {
  title: string
  manifestHref: string
  themeColor: string
  appleTitle: string
}

const IDENTITIES: Record<'manager' | 'menage', PwaIdentity> = {
  manager: {
    title: 'Séjours & ménage',
    manifestHref: '/manifest.json',
    themeColor: '#4f46e5',
    appleTitle: 'Séjours',
  },
  menage: {
    title: 'Ménage — Mes missions',
    manifestHref: '/manifest-menage.json',
    themeColor: '#059669',
    appleTitle: 'Ménage',
  },
}

function setLinkHref(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
}

function setMetaContent(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = name
    document.head.appendChild(meta)
  }
  meta.content = content
}

/**
 * Points the page's manifest / theme-color / apple-mobile-web-app-title at
 * either the Manager or the Ménage identity, so "Add to Home Screen" from
 * "/" and from "/menage" installs two distinct, independent icons rather
 * than both pointing at the same app. iOS Safari ignores the Web Manifest
 * for this entirely and reads apple-mobile-web-app-title/apple-touch-icon
 * instead, so both are kept in sync here.
 */
export function usePwaIdentity(kind: 'manager' | 'menage') {
  useEffect(() => {
    const identity = IDENTITIES[kind]

    document.title = identity.title
    setLinkHref('manifest', identity.manifestHref)
    setMetaContent('theme-color', identity.themeColor)
    setMetaContent('apple-mobile-web-app-title', identity.appleTitle)
  }, [kind])
}
