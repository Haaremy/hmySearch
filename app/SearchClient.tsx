'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, TextInput } from '@cooperateDesign'
import { UserMenu } from './components/UserMenu'

type Result = {
  id: string
  url: string
  title: string
  highlight?: { title?: string; body?: string }
  tags?: string[]
}

export default function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [totalResults, setTotalResults] = useState<number | null>(null)

  async function search(term?: string) {
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
  }, [])

  return (
    <div className="flex flex-col items-center w-full px-3 py-4">
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Image src="/logo_nobg.svg" alt="logo" width={40} height={40} className="dark:invert" />
          <h1 className="text-2xl font-bold ml-2"><span className="text-blue-400 dark:text-pink-500">my</span>Search</h1>
        </div>
        <UserMenu />
      </div>

      {/* Suche */}
      <div className="w-full max-w-xl flex gap-2 mb-3">
        <TextInput
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Suchen…"
          className="flex-1 text-sm px-3 py-2"
        />
        <Button onClick={() => search()}>🔍</Button>
      </div>

 

      {/* Ergebnisse */}
      <div className="w-full max-w-xl grid gap-3">
        {results.map(hit => (
          <div key={hit.id} className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm">
            <a
              href={hit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium text-blue-600 dark:text-blue-400 line-clamp-2"
            >
              {hit.highlight?.title ?? hit.title ?? hit.url}
            </a>
            {hit.highlight?.body && typeof hit.highlight.body === 'string' && (
              <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-3" dangerouslySetInnerHTML={{ __html: hit.highlight.body }} />
            )}
            {hit.tags && hit.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                {hit.tags.map(tag => (
                  <span key={tag} className="bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && <p className="mt-4 text-gray-500">Suche läuft…</p>}
    </div>
  )
}
