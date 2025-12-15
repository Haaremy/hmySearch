import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'

export const runtime = 'nodejs'

type PageDocument = {
  url: string
  title?: string
  body?: string
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')

    if (!q || q.length < 2) {
      return NextResponse.json({ hits: [] })
    }

   const result = await es.search<PageDocument>({
  index: 'pages',
  size: 10,
  query: {
    multi_match: {
      query: q,
      fields: ['title^3', 'body'],
    },
  },
  highlight: {
    fields: {
      body: {},
    },
  },
})


    const hits = result.hits.hits.map((hit) => ({
  id: hit._id,
  score: hit._score ?? 0,
  ...hit._source,
  highlight: hit.highlight?.body?.[0] ?? null,
}))


    return NextResponse.json({ hits })
  } catch (err) {
    console.error('Elasticsearch error:', err)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
