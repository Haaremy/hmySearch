'use client'

import { useState } from 'react'
import { Button, Main } from '@haaremy/hmydesign'

type Entity = { text: string; type: string }

type Result = {
  id: string
  url: string
  canonical: string
  title: string
  body: string
  highlight?: { title?: string; body?: string }
  lang: string
  meta_description: string
  meta_keywords: string[]
  tags: string[]
  popularity: number
  updated_at: string
  entities: Entity[]
  finalScore: number
}

export default function Home() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [total, setTotal] = useState(0)
  const [suggestions, setSuggestions] = useState<string[]>([])

  async function search(newPage = 0) {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&page=${newPage}&size=${size}`
      )
      const data = await res.json()
      setResults(data.hits || [])
      setSuggestions(data.suggestions || [])
      setPage(data.page || 0)
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Fehler bei der Suche:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Main>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">hmySuche</h1>

        {/* Suchfeld */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search(0)}
            placeholder="Suchbegriff eingeben…"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
          />
          <Button onClick={() => search(0)}>🔍</Button>
        </div>

        {/* Vorschläge */}
        {suggestions.length > 0 && (
          <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
            Vorschläge:{' '}
            {suggestions.map((s) => (
              <button
                key={s}
                className="text-blue-600 dark:text-blue-400 hover:underline mr-2"
                onClick={() => setQ(s) || search(0)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Ladeanzeige */}
        {loading && <p className="text-gray-700 dark:text-gray-300 mb-4">Suche läuft…</p>}

        {/* Ergebnisse */}
        <ul className="space-y-6">
          {results.map((r) => (
            <li
              key={r.id}
              className="border border-gray-200 dark:border-gray-700 rounded p-4"
            >
              <a
                href={r.canonical}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 dark:text-blue-400 text-lg hover:underline"
              >
                {r.title || r.url}
              </a>
              {r.highlight?.body && (
                <p
                  className="text-sm text-gray-700 dark:text-gray-300 mt-2"
                  dangerouslySetInnerHTML={{ __html: r.highlight.body }}
                />
              )}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div>URL: {r.url}</div>
                <div>Sprache: {r.lang}</div>
                <div>Meta Description: {r.meta_description}</div>
                <div>
                  Meta Keywords:{' '}
                  {r.meta_keywords.map((k) => (
                    <span key={k} className="mr-1 bg-gray-200 dark:bg-gray-700 px-1 rounded">
                      {k}
                    </span>
                  ))}
                </div>
                <div>
                  Tags:{' '}
                  {r.tags.map((t) => (
                    <span key={t} className="mr-1 bg-blue-100 dark:bg-blue-700 px-1 rounded">
                      {t}
                    </span>
                  ))}
                </div>
                <div>Popularity (Views): {r.popularity}</div>
                <div>Aktualisiert: {r.updated_at}</div>
                <div>
                  Entities:{' '}
                  {r.entities.map((e) => (
                    <span key={e.text} className="mr-1 bg-green-100 dark:bg-green-700 px-1 rounded">
                      {e.text} ({e.type})
                    </span>
                  ))}
                </div>
                <div>Ranking Score: {r.finalScore.toFixed(2)}</div>
              </div>
            </li>
          ))}
        </ul>

        {/* Pagination */}
        {total > size && (
          <div className="flex justify-between mt-6">
            <Button disabled={page === 0} onClick={() => search(page - 1)}>
              ← Zurück
            </Button>
            <span className="text-gray-700 dark:text-gray-300">
              Seite {page + 1} von {Math.ceil(total / size)}
            </span>
            <Button
              disabled={(page + 1) * size >= total}
              onClick={() => search(page + 1)}
            >
              Weiter →
            </Button>
          </div>
        )}
      </div>
    </Main>
  )
}
