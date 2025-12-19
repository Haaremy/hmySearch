'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, TextInput } from '@cooperateDesign'

type Result = {
  id: string
  url: string
  title: string
}

export default function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [totalResults, setTotalResults] = useState<number | null>(null)

  const search = async (term?: string) => {
    const query = term ?? q
    if (!query.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.hits ?? [])
      setTotalResults(data.total ?? data.hits?.length ?? 0)
      router.replace(`/?q=${encodeURIComponent(query)}`, { scroll: false })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const urlQ = searchParams.get('q')
    if (urlQ) {
      setQ(urlQ)
      search(urlQ)
    }
  }, [searchParams])

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Suchen…" />
        <Button onClick={() => search()}>🔍</Button>
      </div>

      {totalResults !== null && <p>{totalResults} Treffer</p>}
      {loading && <p>Suche läuft…</p>}

      <ul>
        {results.map(r => (
          <li key={r.id}>
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              {r.title || r.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
