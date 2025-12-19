'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, TextInput } from '@cooperateDesign'
import { UserMenu } from './components/UserMenu'

type Entity = { text: string; type: string }

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
  meta_keywords?: string[]
  entities?: Entity[]
  popularity?: number
  finalScore?: number
  updated_at?: string
  lang?: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTime, setSearchTime] = useState<number | null>(null)
  const [totalResults, setTotalResults] = useState<number | null>(null)

  /** 🔁 Suche */
  async function search(query?: string) {
    const term = query ?? q
    if (!term.trim()) return

    setLoading(true)
    const start = performance.now()

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`)
      const data = await res.json()

      setResults(data.hits ?? [])
      setTotalResults(data.total ?? data.hits?.length ?? 0)
      setSearchTime(performance.now() - start)

      // URL aktualisieren (ohne Reload)
      router.replace(`/?q=${encodeURIComponent(term)}`, { scroll: false })
    } catch (err) {
      console.error('Suche fehlgeschlagen:', err)
    } finally {
      setLoading(false)
    }
  }

  /** 🔗 URL → Suche */
  useEffect(() => {
    const urlQ = searchParams.get('q')
    if (urlQ) {
      setQ(urlQ)
      search(urlQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center w-full px-3 py-4">
      {/* Header */}
      <div className="w-full max-w-5xl flex flex-col md:grid md:grid-cols-3 items-center gap-3 mb-4">
        <div className="hidden md:block" />

        <div className="flex items-center justify-center">
          <Image
            src="/logo_nobg.svg"
            alt="logo"
            className="h-10 w-10 dark:invert"
            width={40}
            height={40}
          />
          <h1 className="text-2xl font-bold ml-1">
            <span className="dark:text-pink-500 text-blue-400">my</span>Search
          </h1>
        </div>

        <div className="flex justify-end w-full md:w-auto">
          <UserMenu />
        </div>
      </div>

      {/* Suche */}
      <div className="w-full max-w-xl flex gap-2 mb-3">
        <TextInput
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Suchen…"
          className="flex-1 px-3 py-2 text-sm"
        />
        <Button onClick={() => search()} className="px-3">
          🔍
        </Button>
      </div>

      {/* Info */}
      {!loading && searchTime !== null && (
        <div className="w-full max-w-xl text-xs text-gray-500 flex justify-between mb-3">
          <span>{totalResults} Treffer</span>
          <span>{searchTime.toFixed(0)} ms</span>
        </div>
      )}

      {/* Ergebnisse */}
      <div className="w-full max-w-3xl grid gap-3">
        {results.map(hit => (
          <div
            key={hit.id}
            className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm flex flex-col"
          >
            {/* Titel */}
            <a
              href={hit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium text-blue-600 dark:text-blue-400 line-clamp-2"
            >
              {hit.title || hit.url}
            </a>

            {/* URL */}
            <p className="text-xs text-gray-400 truncate mb-1">
              {hit.url}
            </p>

            {/* Preview */}
            {hit.highlight?.body ? (
              <p
                className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: hit.highlight.body }}
              />
            ) : (
              <p className="text-xs italic text-gray-400">
                Keine Vorschau verfügbar
              </p>
            )}

            {/* Tags (mobil reduziert) */}
            <div className="flex flex-wrap gap-1 mt-2">
              {hit.tags?.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Desktop-Extras */}
            <div className="hidden md:flex gap-4 text-xs text-gray-500 mt-2">
              <span>Score: {hit.finalScore?.toFixed(2) ?? 'n/a'}</span>
              <span>Lang: {hit.lang ?? 'n/a'}</span>
              <span>
                Updated:{' '}
                {hit.updated_at
                  ? new Date(hit.updated_at).toLocaleDateString()
                  : 'n/a'}
              </span>
            </div>
          </div>
        ))}

        {!loading && results.length === 0 && (
          <p className="text-sm text-gray-500 text-center">
            Keine Ergebnisse gefunden
          </p>
        )}
      </div>
    </div>
  )
}
