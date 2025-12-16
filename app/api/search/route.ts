import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'

export const runtime = 'nodejs'

type PageDocument = {
  url: string
  canonical?: string
  title?: string
  body?: string
  language?: string
  popularity?: number
  [key: string]: any // für weitere Metadaten
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
      .filter((hit): hit is { _source: PageDocument; _id: string; _score?: number; highlight?: any } => !!hit._source)
      .map((hit) => ({
        id: hit._id,
        score: hit._score ?? 0,
        url: hit._source.url,
        canonical: hit._source.canonical ?? hit._source.url,
        title: hit._source.title ?? '',
        body: hit._source.body ?? '',
        language: hit._source.language ?? null,
        popularity: hit._source.popularity ?? null,
        highlight: hit.highlight?.body?.[0] ?? hit.highlight?.title?.[0] ?? null,
      }))

    return NextResponse.json({ hits })
  } catch (err) {
    console.error('Elasticsearch error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
