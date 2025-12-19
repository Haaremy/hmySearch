// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'
import nlp from 'compromise'
import stringSimilarity from 'string-similarity'

export const runtime = 'nodejs'

/* =========================
   Types
========================= */

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

type Entity = {
  text: string
  type: 'Person' | 'Place' | 'Organization' | 'Number'
}

/* =========================
   Optional Entity Extraction
========================= */

function extractEntities(text: string): Entity[] {
  const doc = nlp(text)
  const entities: Entity[] = []

doc.people().out('array').forEach((p: string) => entities.push({ text: p, type: 'Person' }))
doc.places().out('array').forEach((p: string) => entities.push({ text: p, type: 'Place' }))
doc.organizations().out('array').forEach((o: string) => entities.push({ text: o, type: 'Organization' }))
doc.numbers().out('array').forEach((n: string) => entities.push({ text: n, type: 'Number' }))

  return entities
}

/* =========================
   Suggestions
========================= */

function generateSuggestions(query: string, keywords: string[]): string[] {
  const q = query.toLowerCase()
  const suggestions = new Set<string>()

  for (const k of keywords) {
    const lk = k.toLowerCase()
    if (stringSimilarity.compareTwoStrings(q, lk) > 0.6) {
      suggestions.add(k)
      continue
    }
    for (const w of q.split(/\s+/)) {
      if (lk.includes(w)) suggestions.add(k)
    }
  }

  return Array.from(suggestions).slice(0, 5)
}

/* =========================
   GET Handler
========================= */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const query = searchParams.get('q')?.trim()
    if (!query || query.length < 2) {
      return NextResponse.json({ hits: [], suggestions: [], total: 0 })
    }

    const page = Math.max(0, Number(searchParams.get('page') ?? 0))
    const size = Math.min(Number(searchParams.get('size') ?? 20), 50)
    const withEntities = searchParams.get('entities') === '1'

    /* =========================
       Elasticsearch Query
    ========================= */

    const result = await es.search<PageDocument>({
      index: 'pages',
      from: page * size,
      size,

      _source: [
        'url',
        'title',
        'lang',
        'updated_at',
        'meta_keywords',
        'tags',
        'views',
      ],

      query: {
        function_score: {
          query: {
            multi_match: {
              query,
              fields: ['title^4', 'content^2', 'meta_keywords^3', 'tags^5'],
              fuzziness: 'AUTO',
              operator: 'and',
            },
          },
          functions: [
            {
              field_value_factor: {
                field: 'views',
                modifier: 'log1p',
                factor: 2,
              },
            },
            {
              gauss: {
                updated_at: {
                  scale: '30d',
                  origin: 'now',
                },
              },
              weight: 3,
            },
          ],
          boost_mode: 'sum',
        },
      },

      collapse: {
        field: 'url.keyword',
      },

      highlight: {
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        fields: {
          title: { number_of_fragments: 1, fragment_size: 150 },
          content: { number_of_fragments: 1, fragment_size: 160 },
        },
      },

      timeout: '1s',
    })

    /* =========================
       Transform Hits
    ========================= */

    const hits = result.hits.hits.map(hit => {
      const source = hit._source!
      const highlightTitle = hit.highlight?.title?.[0] ?? null
      const highlightBody = hit.highlight?.content?.[0] ?? null

      return {
        id: hit._id,
        url: source.url,
        title: source.title ?? '',
        lang: source.lang ?? 'unknown',
        updated_at: source.updated_at ?? null,
        tags: source.tags ?? [],
        meta_keywords: source.meta_keywords ?? [],
        views: source.views ?? 0,
        finalScore: hit._score ?? 0,

        highlight: highlightTitle || highlightBody
          ? {
              title: highlightTitle,
              body: highlightBody,
            }
          : null,

        entities: withEntities && highlightBody
          ? extractEntities(highlightBody)
          : [],
      }
    })

    /* =========================
       Suggestions
    ========================= */

    const allKeywords = hits.flatMap(h => [
      ...(h.tags ?? []),
      ...(h.meta_keywords ?? []),
    ])

    const suggestions = generateSuggestions(
      query,
      Array.from(new Set(allKeywords)),
    )

    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value ?? 0

    return NextResponse.json({
      hits,
      suggestions,
      page,
      size,
      total,
    })
  } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Search API error:', err.message)
      } else {
        console.error('Search API unknown error:', err)
      }
    }

}
