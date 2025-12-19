'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TextInput, Button } from '@cooperateDesign'
import { UserMenu } from './components/UserMenu'

/* =======================
   Types
======================= */

type Highlight = {
  title?: string
  body?: string
}

type Result = {
  id: string
  url: string
  title: string
  highlight?: Highlight
  tags?: string[]
}

/* =======================
   Component
======================= */

export default function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState<number>(0)

  /* =======================
     Search
  ======================= */

  async function search(term?: string) {
    const query = (term ?? q).trim()
    if (!query) return

    setLoading(true)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      setResults(Array.isArray(data.hits) ? data.hits : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)

      router.replace(`/?q=${encodeURIComponent(query)}`, { scroll: false })
    } catch (err) {
      console.error('Search failed', err)
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  /* =======================
     Initial URL search
  ======================= */

  useEffect(() => {
    const urlQ = searchParams.get('q')
    if (urlQ) {
      setQ(urlQ)
      search(urlQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* =======================
     Render
  ======================= */

  return (
    <div className="flex flex-col items-center w-full px-4 py-6">
      {/* ================= Header ================= */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo_nobg.svg"
            alt="logo"
            width={36}
            height={36}
            className="dark:invert"
          />
          <h1 className="text-2xl font-bold">
            <span className="text-blue-400 dark:text-pink-500">my</span>Search
          </h1>
        </div>
        <UserMenu />
      </div>

      {/* ================= Search Box ================= */}
      <div className="w-full max-w-2xl flex gap-2 mb-4">
        <TextInput
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Suchen…"
          className="flex-1 text-sm px-4 py-2"
        />
        <Button onClick={() => search()} className="px-4">
          🔍
        </Button>
      </div>

      {/* ================= Result Count ================= */}
      <div className="w-full max-w-2xl text-xs text-gray-500 mb-4">
        {total.toLocaleString()} Treffer
      </div>

      {/* ================= Sponsored / Recommended ================= */}
      {results.length > 0 && (
        <div className="w-full max-w-2xl mb-6">
          <div className="text-xs uppercase text-gray-400 mb-2">
            Empfohlen
          </div>

          <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-gray-800 p-4">
            <div className="text-xs text-yellow-600 mb-1">
              Gesponsert
            </div>
            <a
              href="#"
              className="text-base font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              Premium-Eintrag: Technik-Jobs & KI-Projekte
            </a>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Sichtbarkeit für hochwertige Inhalte auf mySearch.
            </p>
          </div>
        </div>
      )}

      {/* ================= Results ================= */}
      <div className="w-full max-w-2xl grid gap-4 overflow-hidden">
        {results.map(hit => (
          <div
            key={hit.id}
            className="
              rounded-xl border border-gray-200 dark:border-gray-700
              p-4 transition
              hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800
            "
          >
            {/* Title */}
            <a
              href={hit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                block text-lg font-medium
                text-blue-700 dark:text-blue-400
                hover:underline
                break-words
              "
              dangerouslySetInnerHTML={{
                __html: hit.highlight?.title ?? hit.title,
              }}
            />

            {/* URL */}
            <div className="text-sm text-blue-600 dark:text-blue-300 truncate mt-1">
              {hit.url}
            </div>

            {/* Snippet */}
            {hit.highlight?.body && (
              <p
                className="
                  mt-2 text-sm leading-relaxed
                  text-pink-600 dark:text-pink-500
                  break-words
                "
                dangerouslySetInnerHTML={{
                  __html: hit.highlight.body,
                }}
              />
            )}

            {/* Tags */}
            {hit.tags && hit.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                {hit.tags.map(tag => (
                  <span
                    key={tag}
                    className="
                      bg-blue-100 dark:bg-blue-700
                      text-blue-800 dark:text-blue-100
                      px-2 py-0.5 rounded
                    "
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ================= Loading ================= */}
      {loading && (
        <div className="mt-6 text-sm text-gray-500">
          Suche läuft…
        </div>
      )}
    </div>
  )
}
