// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'

export const runtime = 'nodejs'

type PageDocument = {
  url: string
  title?: string
  content?: string
  lang?: string
  crawl_time?: string
  images?: {
    url: string
    alt?: string
    width?: number
    height?: number
  }[]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const query = searchParams.get('q')?.trim()
    const type = searchParams.get('type') ?? 'web'
    const page = Math.max(0, Number(searchParams.get('page') ?? 0))
    const size = Math.min(Number(searchParams.get('size') ?? 20), 20)

    if (!query || query.length < 2) {
      return NextResponse.json({ hits: [], total: 0 })
    }

    /* ----------------------------- WEB SEARCH ---------------------------- */
    if (type === 'web') {
      const result = await es.search<PageDocument>({
        index: 'pages',
        from: page * size,
        size,
        track_total_hits: true,
        query: {
          multi_match: {
            query,
            fields: ['title^4', 'tags^5', 'meta_keywords^3', 'content^2'],
            fuzziness: 'AUTO',
            minimum_should_match: '70%',
          },
        },
        highlight: {
          fields: {
            title: { number_of_fragments: 1 },
            content: { number_of_fragments: 2 },
          },
        },
      })

      const total =
        typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total?.value ?? 0

      const hits = result.hits.hits.map(hit => ({
        id: hit._id,
        url: hit._source?.url,
        title:
          hit.highlight?.title?.[0] ??
          hit._source?.title ??
          '',
        snippet:
          hit.highlight?.content?.join(' ') ??
          hit._source?.content?.slice(0, 300) ??
          '',
      }))

      return NextResponse.json({ hits, total })
    }

    /* ---------------------------- IMAGE SEARCH ---------------------------- */
    if (type === 'image') {
      const result = await es.search<PageDocument>({
        index: 'pages',
        from: page * size,
        size,
        track_total_hits: true,
        query: {
          bool: {
            must: [
              { exists: { field: 'images.url' } },
              {
                multi_match: {
                  query,
                  fields: ['title^2', 'content'],
                },
              },
            ],
          },
        },
      })

      const images = result.hits.hits.flatMap(hit =>
        hit._source?.images?.map(img => ({
          id: `${hit._id}-${img.url}`,
          imageUrl: img.url,
          pageUrl: hit._source?.url,
          alt: img.alt ?? hit._source?.title ?? '',
        })) ?? []
      )

      return NextResponse.json({
        hits: images,
        total: images.length,
      })
    }

    return NextResponse.json({ hits: [], total: 0 })
  } catch (err) {
    console.error('Search API error:', err)
    return NextResponse.json(
      { hits: [], total: 0, error: 'Search failed' },
      { status: 500 }
    )
  }
}
