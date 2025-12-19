// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'

type PageDocument = {
  url: string
  title?: string
  content?: string
  lang?: string
  updated_at?: string
  meta_keywords?: string[]
  tags?: string[]
  views?: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()
    if (!query || query.length < 2)
      return NextResponse.json({ hits: [], suggestions: [], total: 0 })

    const page = Math.max(0, Number(searchParams.get('page') ?? 0))
    const size = Math.min(Number(searchParams.get('size') ?? 20), 20)

    const result = await es.search<PageDocument>({
      index: 'pages', // unbedingt Index prüfen!
      from: page * size,
      size,
      query: {
        multi_match: {
          query,
          fields: ['title^4', 'content^2', 'meta_keywords^3', 'tags^5'],
          fuzziness: 'AUTO',
          operator: 'and',
        },
      },
      highlight: {
        fields: {
          title: { fragment_size: 150, number_of_fragments: 1 },
          content: { fragment_size: 150, number_of_fragments: 2 },
        },
      },
    })

    const hits = result.hits.hits.map(hit => ({
      id: hit._id,
      url: hit._source?.url ?? '',
      title: hit._source?.title ?? '',
      body: hit._source?.content ?? '',
      lang: hit._source?.lang ?? 'unknown',
      updated_at: hit._source?.updated_at ?? '',
      tags: hit._source?.tags ?? [],
      meta_keywords: hit._source?.meta_keywords ?? [],
      views: hit._source?.views ?? 0,
      highlight: {
        title: hit.highlight?.title?.[0] ?? null,
        body: hit.highlight?.content?.join(' ') ?? null, // Array → String
      }
    }))

    return NextResponse.json({
      hits,
      suggestions: [],
      total: result.hits.total as number,
    })
  } catch (err: unknown) {
    if (err instanceof Error) console.error('Search API error:', err.message)
    else console.error('Search API unknown error:', err)
    return NextResponse.json(
      { hits: [], suggestions: [], total: 0, error: 'Search failed' },
      { status: 500 }
    )
  }
}
