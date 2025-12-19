import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'
import nlp from 'compromise'
import stringSimilarity from 'string-similarity'

export const runtime = 'nodejs'

/* =======================
   Types
======================= */

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

/* =======================
   NLP / Helpers
======================= */

function extractEntities(text: string): Entity[] {
  const doc = nlp(text)
  const entities: Entity[] = []

  return entities
}

function generateSuggestions(query: string, keywords: string[]): string[] {
  const q = query.toLowerCase()
  return keywords
    .filter(k => {
      const kl = k.toLowerCase()
      return (
        stringSimilarity.compareTwoStrings(q, kl) > 0.6 ||
        q.split(/\s+/).some(w => kl.includes(w))
      )
    })
    .slice(0, 5)
}

/* =======================
   API Handler
======================= */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()
    if (!query || query.length < 2) {
      return NextResponse.json({ hits: [], suggestions: [], total: 0 })
    }

    const size = Math.min(Number(searchParams.get('size') ?? 20), 50)
    const lastSort = searchParams.get('lastSort') || undefined
    const queryTerms = query.toLowerCase().split(/\s+/)

    /* =======================
       Elasticsearch Query
    ======================= */

    const esResult = await es.search<PageDocument>({
      index: 'pages',
      size,
      track_total_hits: true,
      _source: [
        'url',
        'title',
        'content',
        'tags',
        'meta_keywords',
        'views',
        'updated_at',
        'lang',
      ],
      sort: [{ _id: 'asc' }],
      query: {
        bool: {
          should: [
            {
              match: {
                title: {
                  query,
                  boost: 4,
                  fuzziness: 'AUTO',
                },
              },
            },
            {
              match: {
                content: {
                  query,
                  boost: 2,
                  fuzziness: 'AUTO',
                },
              },
            },
            {
              terms: {
                tags: queryTerms,
                boost: 5,
              },
            },
            {
              terms: {
                meta_keywords: queryTerms,
                boost: 3,
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      highlight: {
        fields: {
          title: {},
          content: { fragment_size: 120, number_of_fragments: 2 },
        },
      },
      ...(lastSort ? { search_after: [lastSort] } : {}),
      timeout: '2s',
    })

    /* =======================
       Result Processing
    ======================= */

    const rawHits = esResult.hits.hits.filter(h => h._source)

    // Dedup by URL
    const dedupMap: Record<string, typeof rawHits[0]> = {}
    rawHits.forEach(h => {
      dedupMap[h._source!.url] ||= h
    })

    const uniqueHits = Object.values(dedupMap)

    const hits = uniqueHits.map((hit, idx) => {
      const src = hit._source!
      const body = src.content ?? ''
      const updatedAt = src.updated_at ? new Date(src.updated_at).getTime() : 0
      const entities = idx < 5 ? extractEntities(body) : []

      const matchScore = hit._score ?? 0
      const popularityScore = Math.log1p(src.views ?? 0)
      const freshnessScore = updatedAt
        ? 1 / (1 + (Date.now() - updatedAt) / 86400000)
        : 0
      const tagScore =
        src.tags?.reduce(
          (acc, t) => (query.toLowerCase().includes(t.toLowerCase()) ? acc + 2 : acc),
          0,
        ) ?? 0
      const keywordScore =
        src.meta_keywords?.reduce(
          (acc, k) => (query.toLowerCase().includes(k.toLowerCase()) ? acc + 1.5 : acc),
          0,
        ) ?? 0
      const contentLengthScore = Math.min(body.length / 1000, 5)
      const entityScore = entities.reduce(
        (acc, e) => (query.toLowerCase().includes(e.text.toLowerCase()) ? acc + 2 : acc),
        0,
      )

      const finalScore =
        matchScore * 1.5 +
        popularityScore * 2 +
        freshnessScore * 3 +
        tagScore +
        keywordScore +
        contentLengthScore +
        entityScore

      return {
        id: hit._id,
        url: src.url,
        title: src.title ?? '',
        body,
        lang: src.lang ?? 'unknown',
        updated_at: src.updated_at ?? '',
        tags: src.tags ?? [],
        meta_keywords: src.meta_keywords ?? [],
        views: src.views ?? 0,
        entities,
        finalScore,
        highlight: {
          title: hit.highlight?.title?.[0] ?? null,
          body: hit.highlight?.content ?? [],
        },
        sort: hit.sort?.[0] ?? null,
      }
    })

    const allKeywords = hits.flatMap(h => [...h.tags, ...h.meta_keywords])
    const suggestions = generateSuggestions(query, Array.from(new Set(allKeywords)))

    return NextResponse.json({
      hits,
      suggestions,
      total:
        typeof esResult.hits.total === 'number'
          ? esResult.hits.total
          : esResult.hits.total?.value ?? 0,
      size,
      lastSort: hits[hits.length - 1]?.sort ?? null,
    })
  } catch (err) {
    console.error('Search API error:', err)
    return NextResponse.json(
      { hits: [], suggestions: [], total: 0, error: 'Search failed' },
      { status: 500 },
    )
  }
}
