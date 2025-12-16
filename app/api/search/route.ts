import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'
import { SearchHit } from '@elastic/elasticsearch/lib/api/types'

export const runtime = 'nodejs'

type PageDocument = {
  url: string
  canonical?: string
  title?: string
  body?: string
  language?: string
  popularity?: number
  [key: string]: any
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
          title: {},
        },
      },
    })

    const hits = result.hits.hits
      .filter((hit) => hit._source) // einfache Filterung
      .map((hit) => {
        const source = hit._source as PageDocument
        return {
          id: hit._id,
          score: hit._score ?? 0,
          url: source.url,
          canonical: source.canonical ?? source.url,
          title: source.title ?? '',
          body: source.body ?? '',
          language: source.language ?? null,
          popularity: source.popularity ?? null,
          highlight: hit.highlight?.body?.[0] ?? hit.highlight?.title?.[0] ?? null,
        }
      })

    return NextResponse.json({ hits })
  } catch (err) {
    console.error('Elasticsearch error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
