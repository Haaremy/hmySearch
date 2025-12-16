'use client'

import { useState } from 'react'
import { Button, Main } from '@haaremy/hmydesign'

type Entity = {
  text: string
  type: string
}

type Result = {
  id: string
  url: string
  title: string
  highlight?: string
  tags?: string[]
  entities?: Entity[]
  popularity?: number
  finalScore?: number
  updated_at?: string
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>(['Politik', 'Sport', 'Technik', 'Wirtschaft'])

  async function search() {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.hits)
    } catch (err) {
      console.error('Fehler bei der Suche:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Main>
      <div className="max-w-xl mx-auto p-4">
        {/* Überschrift */}
        <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">hmySuche</h1>

        {/* Suchfeld */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Suchbegriff eingeben…"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 text-sm"
          />
          <Button onClick={search}>🔍</Button>
        </div>

        {/* Vorschläge */}
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map(s => (
            <Button
              key={s}
              variant="secondary"
              onClick={() => { setQ(s); search() }}
              className="text-xs px-2 py-1"
            >
              {s}
            </Button>
          ))}
        </div>

        {/* Loading */}
        {loading && <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm">Suche läuft…</p>}

        {/* Trefferliste */}
        <div className="space-y-4">
          {results.map(hit => (
            <div key={hit.id} className="border rounded p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              {/* Titel + URL */}
              <a
                href={hit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline line-clamp-2"
              >
                {hit.title || hit.url}
              </a>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{hit.url}</p>

              {/* Highlight / Snippet */}
              {hit.highlight && (
                <p
                  className="mt-1 text-gray-800 dark:text-gray-200 text-sm"
                  dangerouslySetInnerHTML={{ __html: hit.highlight }}
                />
              )}

              {/* Tags */}
              {hit.tags && hit.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {hit.tags.map(tag => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-0.5 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Entities */}
              {hit.entities && hit.entities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {hit.entities.slice(0, 8).map(e => (
                    <span
                      key={e.text + e.type}
                      className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full text-xs"
                    >
                      {e.text} ({e.type})
                    </span>
                  ))}
                  {hit.entities.length > 8 && <span className="text-gray-500 text-xs">+{hit.entities.length - 8} weitere</span>}
                </div>
              )}

              {/* Statistiken */}
              <div className="flex flex-wrap justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Clicks: {hit.popularity ?? 0}</span>
                <span>Score: {hit.finalScore?.toFixed(2) ?? 'n/a'}</span>
                <span>Updated: {hit.updated_at ? new Date(hit.updated_at).toLocaleDateString() : 'n/a'}</span>
              </div>
            </div>
          ))}

          {!loading && results.length === 0 && (
            <p className="text-gray-700 dark:text-gray-300 text-sm">Keine Ergebnisse gefunden.</p>
          )}
        </div>
      </div>
    </Main>
  )
}
