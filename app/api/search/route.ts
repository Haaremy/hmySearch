// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'

export const runtime = 'nodejs'

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
    if (!query || query.length < 2) {
      return NextResponse.json({
        hits: [],
        suggestions: [],
        total: 0,
        page: 0,
        size: 0,
      })
    }

    const page = Math.max(0, Number(searchParams.get('page') ?? 0))
    const size = Math.min(Number(searchParams.get('size') ?? 20), 20)

    // 🌍 Sprache aus Browser ableiten (default: de)
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
                    operator: 'and',
                  },
                },
              ],
              should: [
                // 🔥 Phrase-Boost für Titel
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
              filter: { term: { lang: preferredLang } },
              weight: 2.5,
            },

            // 👀 Popularität (Views)
            {
              field_value_factor: {
                field: 'views',
                factor: 0.1,
                missing: 1,
              },
            },

            // 🕒 Aktualität
            {
              gauss: {
                updated_at: {
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
          title: {
            fragment_size: 150,
            number_of_fragments: 1,
          },
          content: {
            fragment_size: 150,
            number_of_fragments: 2,
          },
        },
      },
    })

    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value ?? 0

    const hits = result.hits.hits.map(hit => {
      const rawContent = hit._source?.content ?? ''
      const cleanContent = rawContent.replace(/<[^>]+>/g, '')
      const truncatedContent =
        cleanContent.length > 500
          ? cleanContent.slice(0, 500) + '…'
          : cleanContent

      return {
        id: hit._id,
        score: hit._score,
        url: hit._source?.url ?? '',
        title:
          hit.highlight?.title?.[0] ??
          hit._source?.title ??
          '',
        body:
          hit.highlight?.content?.join(' ') ??
          truncatedContent,
        lang: hit._source?.lang ?? 'unknown',
        updated_at: hit._source?.updated_at ?? '',
      }
    })

    return NextResponse.json({
      hits,
      suggestions: [],
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    })
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Search API error:', err.message)
    } else {
      console.error('Search API unknown error:', err)
    }

    return NextResponse.json(
      {
        hits: [],
        suggestions: [],
        total: 0,
        error: 'Search failed',
      },
      { status: 500 }
    )
  }
}
