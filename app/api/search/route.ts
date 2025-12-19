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
  meta_keywords?: string[]
  tags?: string[]
  views?: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const query = searchParams.get('q')?.trim()
    if (!query || query.length < 2) {
      return NextResponse.json({
        hits: [],
        total: 0,
        page: 0,
        size: 0,
      })
    }

    const page = Math.max(0, Number(searchParams.get('page') ?? 0))
    const size = Math.min(Number(searchParams.get('size') ?? 20), 20)

    // 🌍 bevorzugte Sprache
    const acceptLang = req.headers.get('accept-language') ?? ''
    const preferredLang = acceptLang.startsWith('de') ? 'de' : 'en'

    const result = await es.search<PageDocument>({
      index: 'pages',
      from: page * size,
      size,
      track_total_hits: true,

      query: {
        function_score: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: [
                      'tags^5',
                      'title^4',
                      'meta_keywords^3',
                      'content^2',
                    ],
                    fuzziness: 'AUTO',
                    minimum_should_match: '70%',
                  },
                },
              ],
              should: [
                {
                  match_phrase: {
                    title: {
                      query,
                      boost: 6,
                    },
                  },
                },
              ],
            },
          },

          functions: [
            // 🌍 Sprach-Boost
            {
              filter: { term: { 'lang.keyword': preferredLang } },
              weight: 2.5,
            },

            // 🕒 Aktualität
            {
              gauss: {
                crawl_time: {
                  origin: 'now',
                  scale: '30d',
                  decay: 0.5,
                },
              },
            },
          ],

          score_mode: 'sum',
          boost_mode: 'multiply',
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

    const hits = result.hits.hits.map(hit => {
      const cleanContent =
        hit._source?.content?.replace(/<[^>]+>/g, '') ?? ''

      return {
        id: hit._id,
        score: hit._score,
        url: hit._source?.url,
        title:
          hit.highlight?.title?.[0] ??
          hit._source?.title ??
          '',
        snippet:
          hit.highlight?.content?.join(' ') ??
          cleanContent.slice(0, 300),
        lang: hit._source?.lang,
      }
    })

    return NextResponse.json({
      hits,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    })
  } catch (err) {
    console.error('Search API error:', err)
    return NextResponse.json(
      { hits: [], total: 0, error: 'Search failed' },
      { status: 500 }
    )
  }
}
