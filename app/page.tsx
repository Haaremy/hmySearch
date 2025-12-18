'use client'

import { useState } from 'react'
import { Button } from '@cooperateDesign'

type Entity = { text: string; type: string }
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
      setResults(data.hits ?? [])
    } catch (err) {
      console.error('Suche fehlgeschlagen:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 flex flex-col items-center">
      {/* Header */}
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">hmySuche</h1>

      {/* Sucheingabe */}
      <div className="w-full max-w-2xl flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Suchbegriff eingeben…"
          className="flex-1 rounded px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <Button onClick={search} className="px-4 py-3 w-full md:w-auto">🔍</Button>
      </div>

      {/* Vorschläge */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {suggestions.map(s => (
          <Button
            key={s}
            variant="primary"
            onClick={() => { setQ(s); search() }}
            className="text-xs px-3 py-1"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {loading && <p className="text-gray-600 dark:text-gray-300 mb-4">Suche läuft…</p>}

      {/* Trefferliste */}
      <div className="w-full max-w-2xl space-y-4">
        {results.map(hit => (
          <div
            key={hit.id}
            className="bg-white dark:bg-gray-800 rounded shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            {/* Titel + URL */}
            <a
              href={hit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-lg md:text-xl font-medium text-blue-600 dark:text-blue-400 hover:underline mb-1 line-clamp-2"
            >
              {hit.title || hit.url}
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{hit.url}</p>

            {/* Snippet */}
            {hit.highlight && (
              <p className="text-gray-700 dark:text-gray-200 text-sm mb-2" dangerouslySetInnerHTML={{ __html: hit.highlight }} />
            )}

            {/* Tags */}
            {hit.tags && hit.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {hit.tags.map(tag => (
                  <span key={tag} className="bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Entities */}
            {hit.entities && hit.entities.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {hit.entities.slice(0, 5).map(e => (
                  <span key={e.text + e.type} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded text-xs">
                    {e.text} ({e.type})
                  </span>
                ))}
                {hit.entities.length > 5 && <span className="text-gray-500 text-xs">+{hit.entities.length - 5} weitere</span>}
              </div>
            )}

            {/* Statistiken */}
            <div className="flex flex-wrap justify-start gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Clicks: {hit.popularity ?? 0}</span>
              <span>Score: {hit.finalScore?.toFixed(2) ?? 'n/a'}</span>
              <span>Updated: {hit.updated_at ? new Date(hit.updated_at).toLocaleDateString() : 'n/a'}</span>
            </div>
          </div>
        ))}

        {!loading && results.length === 0 && (
          <p className="text-gray-600 dark:text-gray-300 text-sm text-center">Keine Ergebnisse gefunden.</p>
        )}
      </div>
    </div>
  )
}
