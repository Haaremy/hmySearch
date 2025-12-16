import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'

export const runtime = 'nodejs'

type PageDocument = {
  url: string
  title?: string
  body?: string
  description?: string
  canonical?: string
  metas?: Record<string, string>
  lang?: string
  crawl_time?: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const q = searchParams.get('q')?.trim() || ''
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const size = Math.min(parseInt(searchParams.get('size') || '10', 10), 50)
    const lang = searchParams.get('lang')
    const explain = searchParams.get('explain') === '1'

    if (q.length < 2) {
      return NextResponse.json({
        hits: [],
        meta: { reason: 'Query too short' },
      })
    }

    const from = (page - 1) * size

    const result = await es.search<PageDocument>({
      index: 'pages',
      from,
      size,
      track_total_hits: true,
      explain,

      query: {
        function_score: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: q,
                    type: 'best_fields',
                    operator: 'and',
                    fuzziness: 'AUTO',
                    fields: [
                      'title^6',
                      'description^5',
                      'metas.og:title^4',
                      'metas.keywords^3',
                      'url^2',
                      'body'
                    ],
                  },
                },
              ],
              filter: lang
                ? [{ term: { lang } }]
                : [],
            },
          },

          functions: [
            // 🕒 Freshness Boost
            {
              gauss: {
                crawl_time: {
                  origin: 'now',
                  scale: '21d',
                  decay: 0.4,
                },
              },
            },

            // 🔑 Short URLs slightly better
            {
              script_score: {
                script: {
                  source: `
                    doc['url.keyword'].size() == 0
                      ? 1
                      : Math.max(1, 80 / doc['url.keyword'].value.length())
                  `,
                },
              },
            },
          ],

          score_mode: 'sum',
          boost_mode: 'sum',
        },
      },

      highlight: {
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        number_of_fragments: 1,
        fragment_size: 180,
        fields: {
          title: {},
          body: {},
          description: {},
        },
      },

      aggs: {
        languages: {
          terms: { field: 'lang.keyword', size: 10 },
        },
      },
    })

    const hits = result.hits.hits.map((hit, index) => ({
      rank: from + index + 1,
      id: hit._id,
      score: hit._score ?? 0,

      url: hit._source.url,
      canonical: hit._source.canonical ?? hit._source.url,

      title:
        hit.highlight?.title?.[0] ??
        hit._source.title ??
        hit._source.metas?.['og:title'] ??
        hit._source.url,

      snippet:
        hit.highlight?.description?.[0] ??
        hit.highlight?.body?.[0] ??
        hit._source.description ??
        hit._source.body?.slice(0, 200) ??
        null,

      meta: {
        lang: hit._source.lang,
        author: hit._source.metas?.author,
        ogImage: hit._source.metas?.['og:image'],
        crawlTime: hit._source.crawl_time,
      },

      explain: explain ? hit._explanation : undefined,
    }))

    return NextResponse.json({
      query: q,
      page,
      size,
      total: result.hits.total?.value ?? 0,

      facets: {
        languages:
          (result.aggregations?.languages as any)?.buckets ?? [],
      },

      hits,
    })
  } catch (err) {
    console.error('[SEARCH API ERROR]', err)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
