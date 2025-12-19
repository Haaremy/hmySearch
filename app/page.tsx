import { Suspense } from 'react'
import SearchClient from './SearchClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Lade Suche…</div>}>
      <SearchClient />
    </Suspense>
  )
}
