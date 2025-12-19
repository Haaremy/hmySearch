'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, TextInput } from '@cooperateDesign'

type Result = {
  id: string
  url?: string
  title: string
  snippet?: string
}

function getFavicon(url?: string) {
  if (!url) return null
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
  } catch {
    return null
  }
}

export default function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  async function search(term?: string) {
    const query = term ?? q
    if (!query.trim()) return

    setLoading(true)

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=web`
      )
      const data = await res.json()

      setResults(Array.isArray(data.hits) ? data.hits : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)

      router.replace(`/?q=${encodeURIComponent(query)}`, { scroll: false })
    } catch (err) {
      console.error('Search error', err)
    } finally {
      setLoading(false)
    }
  }

  // Initiale URL-Suche
  useEffect(() => {
    const urlQ = searchParams.get('q')
    if (urlQ) {
      setQ(urlQ)
      search(urlQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center w-full px-4 py-6">
      {/* Suche */}
      <div className="w-full max-w-2xl flex gap-2 mb-4">
        <TextInput
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Suchen…"
          className="flex-1"
        />
        <Button onClick={() => search()}>Suchen</Button>
      </div>

      {/* Trefferanzahl */}
      {total > 0 && (
        <div className="w-full max-w-2xl text-xs text-gray-500 mb-4">
          {total.toLocaleString()} Treffer
        </div>
      )}

      {/* Ergebnisse */}
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {results.map(hit => {
          const favicon = getFavicon(hit.url)

          return (
            <div
              key={hit.id}
              className="group rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {/* URL + Favicon */}
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1 truncate">
                {favicon && (
                  <img
                    src={favicon}
                    alt=""
                    className="w-4 h-4 rounded"
                    loading="lazy"
                  />
                )}
                <span className="truncate">{hit.url}</span>
              </div>

              {/* Titel */}
              <a
                href={hit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-base font-medium text-pink-500 dark:text-pink-400 leading-snug mb-1"
                dangerouslySetInnerHTML={{ __html: hit.title }}
              />

              {/* Snippet */}
              {hit.snippet && (
                <p
                  className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: hit.snippet }}
                />
              )}
            </div>
          )
        })}
      </div>

      {loading && (
        <div className="mt-6 text-sm text-gray-500">Suche läuft…</div>
      )}
    </div>
  )
}
