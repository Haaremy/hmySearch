// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'
import nlp from 'compromise'
import stringSimilarity from 'string-similarity'

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

type Entity = { text: string; type: 'Person' | 'Place' | 'Organization' | 'Number' | 'Other' }

function extractEntities(text: string): Entity[] {
  const doc = nlp(text)
  const entities: Entity[] = []

  return entities
}

function generateSuggestions(query: string, keywords: string[]): string[] {
  const suggestions: string[] = []
  const lowerQuery = query.toLowerCase()

  keywords.forEach(k => {
    const lowerK = k.toLowerCase()
    const similarity = stringSimilarity.compareTwoStrings(lowerQuery, lowerK)
    if (similarity > 0.6 && !suggestions.includes(k)) suggestions.push(k)
    lowerQuery.split(/\s+/).forEach(w => {
      if (lowerK.includes(w) && !suggestions.includes(k)) suggestions.push(k)
    })
  })

  return suggestions.slice(0, 5)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()
    if (!query || query.length < 2) return NextResponse.json({ hits: [], suggestions: [], total: 0 })

    const page = Math.max(0, Number(searchParams.get('page') ?? 0))
    const size = Math.min(Number(searchParams.get('size') ?? 20), 20) // max 20

    const result = await es.search<PageDocument>({
      index: 'pages',
      from: page * size,
      size,
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
                  origin: 'now',
                  scale: '30d',
                },
              },
              weight: 3,
            },
          ],
          boost_mode: 'sum',
        },
      },
      highlight: {
        fields: {
          title: { fragment_size: 150, number_of_fragments: 1 },
          content: { fragment_size: 150, number_of_fragments: 2 },
        },
      },
      timeout: '2s',
    })

    const hitsRaw = result.hits.hits.filter(hit => hit._source)

    const hits = hitsRaw.map(hit => {
      const source = hit._source!
      const body = source.content ?? ''
      const entities = extractEntities(body)
      const updated_at = source.updated_at ?? ''
      const finalScore = hit._score ?? 0

      return {
        id: hit._id,
        url: source.url,
        title: source.title ?? '',
        body,
        lang: source.lang ?? 'unknown',
        updated_at,
        tags: source.tags ?? [],
        meta_keywords: source.meta_keywords ?? [],
        views: source.views ?? 0,
        entities,
        finalScore,
        highlight: {
          title: hit.highlight?.title?.[0] ?? null,
          body: hit.highlight?.content?.join(' ') ?? null,
        },
      }
    })

    const allKeywords = hits.flatMap(h => [...h.tags, ...h.meta_keywords])
    const suggestions = generateSuggestions(query, Array.from(new Set(allKeywords)))
    const totalHits = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0

    return NextResponse.json({ hits, suggestions, total: totalHits })
  } catch (err: unknown) {
    if (err instanceof Error) console.error('Search API error:', err.message)
    else console.error('Search API unknown error:', err)

    return NextResponse.json(
      { hits: [], suggestions: [], total: 0, error: 'Search failed' },
      { status: 500 }
    )
  }
}
