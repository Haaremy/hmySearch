'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TextInput, Button } from '@cooperateDesign'
import { UserMenu } from './components/UserMenu'

type Result = {
  id: string
  url: string
  title: string
  highlight?: {
    title?: string
    body?: string
  }
  tags?: string[]
}

type SearchMode = 'all' | 'images'

export default function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState('')
  const [mode, setMode] = useState<SearchMode>('all')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [totalResults, setTotalResults] = useState<number>(0)

  async function search(term?: string) {
    const query = (term ?? q).trim()
    if (!query) return

    setLoading(true)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      setResults(Array.isArray(data.hits) ? data.hits : [])
      setTotalResults(typeof data.total === 'number' ? data.total : 0)

      router.replace(`/?q=${encodeURIComponent(query)}`, { scroll: false })
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
      setTotalResults(0)
    } finally {
      setLoading(false)
    }
  }

  /** Initiale Suche aus URL */
  useEffect(() => {
    const urlQ = searchParams.get('q')
    if (urlQ) {
      setQ(urlQ)
      search(urlQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center px-4 py-6">

      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo_nobg.svg"
            alt="logo"
            width={40}
            height={40}
            className="dark:invert"
          />
          <span className="text-2xl font-bold">
            <span className="text-blue-500">my</span>Search
          </span>
        </div>
        <UserMenu />
      </div>

      {/* Suche */}
      <div className="w-full max-w-2xl flex gap-2 mb-4">
        <TextInput
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Suchen…"
          className="flex-1 text-sm px-4 py-2"
        />
        <Button onClick={() => search()}>🔍</Button>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-2xl flex gap-6 border-b mb-4 text-sm">
        {(['all', 'images'] as SearchMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`pb-2 ${
              mode === m
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'all' ? 'Alle' : 'Bilder'}
          </button>
        ))}
      </div>

      {/* Trefferanzahl – CRASH-SAFE */}
      <div className="w-full max-w-2xl text-xs text-gray-500 mb-4">
        {totalResults} Treffer
      </div>

      {/* Ergebnisse */}
      {mode === 'all' && (
        <div className="w-full max-w-2xl grid gap-6">
          {results.map(hit => (
            <div key={hit.id}>
              <a
                href={hit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-blue-700 dark:text-blue-400 hover:underline"
              >
                {hit.highlight?.title || hit.title || hit.url}
              </a>

              <div className="text-sm text-green-700 dark:text-green-400 truncate">
                {hit.url}
              </div>

              {hit.highlight?.body && (
                <p
                  className="text-sm text-gray-700 dark:text-gray-200 mt-1 leading-snug"
                  dangerouslySetInnerHTML={{ __html: hit.highlight.body }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Platzhalter Bildersuche */}
      {mode === 'images' && (
        <div className="text-sm text-gray-500 mt-8">
          Bildersuche folgt im nächsten Schritt
        </div>
      )}

      {loading && (
        <div className="mt-6 text-sm text-gray-500">
          Suche läuft…
        </div>
      )}
    </div>
  )
}
