'use client'

import { Button, TextInput } from '@haaremy/hmydesign'
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
    setLoading(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.hits)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">hmySuche</h1>

      <div className="flex gap-2 mb-6">
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          className="border p-2 w-full rounded"
          placeholder="Suchbegriff eingeben…"
        />
        <Button
          onClick={search}
          className="bg-black text-white px-4 rounded"
        >
          🔍
        </Button>
      </div>

      {loading && <p>Suche läuft…</p>}

      <ul className="space-y-4">
        {results.map(r => (
          <li key={r.id} className="border-b pb-3">
            <a href={r.url} className="font-semibold">
              {r.title || r.url}
            </a>
            {r.highlight && (
              <p
                className="text-sm text-gray-700"
                dangerouslySetInnerHTML={{ __html: r.highlight }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}