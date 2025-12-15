'use client'

import { useState } from 'react'

type Result = {
  id: string
  url: string
  title: string
  highlight?: string
}

export default function Home() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

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
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">🔍 hmySuche</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Suchbegriff eingeben…"
          className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          onClick={search}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          🔍
        </button>
      </div>

      {loading && <p className="text-gray-700 dark:text-gray-300 mb-4">Suche läuft…</p>}

      <ul className="space-y-4">
        {results.map(r => (
          <li key={r.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {r.title || r.url}
            </a>
            {r.highlight && (
              <p
                className="text-sm text-gray-700 dark:text-gray-300 mt-1"
                dangerouslySetInnerHTML={{ __html: r.highlight }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
