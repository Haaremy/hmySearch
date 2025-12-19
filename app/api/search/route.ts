// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'
import nlp from 'compromise'
import stringSimilarity from 'string-similarity'

export const runtime = 'nodejs'

type PageDocument = {
  url: string
  title?: string
  body?: string
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

  doc.people().out('array').forEach((p: string) => entities.push({ text: p, type: 'Person' }))
  doc.places().out('array').forEach((p: string) => entities.push({ text: p, type: 'Place' }))
  doc.organizations().out('array').forEach((o: string) => entities.push({ text: o, type: 'Organization' }))
  doc.numbers().out('array').forEach((n: string) => entities.push({ text: n, type: 'Number' }))

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
    if (!query || query.length < 2) return NextResponse.json({ hits: [], suggestions: [] })

    const page = Math.max(0, Number(searchParams.get('page') ?? 0))
    const size = Math.min(Number(searchParams.get('size') ?? 10), 50)

    const result = await es.search<PageDocument>({
      index: 'pages',
      from: page * size,
      size,
      query: {
        multi_match: {
          query,
          fields: ['title^4', 'body^2', 'meta_keywords^3', 'tags^5'],
          fuzziness: 'AUTO',
          operator: 'and',
        },
      },
      highlight: {
        fields: {
          title: { fragment_size: 150, number_of_fragments: 1 },
          body: { fragment_size: 150, number_of_fragments: 2 },
        },
      },
      timeout: '2s',
    })

    const hitsRaw = result.hits.hits.filter(hit => hit._source)

    // Deduplication nach URL
    const hitsMap: Record<string, typeof hitsRaw[0]> = {}
    hitsRaw.forEach(hit => {
      const url = hit._source!.url
      if (!hitsMap[url]) hitsMap[url] = hit
    })
    const uniqueHits = Object.values(hitsMap)

    const hits = uniqueHits.map(hit => {
      const source = hit._source!
      const body = source.body ?? ''
      const lang = source.lang ?? 'unknown'
      const updated_at = source.updated_at ?? ''

      const entities = extractEntities(body)
      const matchScore = hit._score ?? 0
      const popularityScore = Math.log1p(source.views ?? 0)
      const freshnessScore = updated_at
        ? 1 / (1 + (Date.now() - new Date(updated_at).getTime()) / 86400000)
        : 0
      const tagScore = source.tags?.reduce(
        (acc, t) => (query.toLowerCase().includes(t.toLowerCase()) ? acc + 2 : acc),
        0,
      ) ?? 0
      const keywordScore = source.meta_keywords?.reduce(
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
        url: source.url,
        title: source.title ?? '',
        body,
        lang,
        updated_at,
        tags: source.tags ?? [],
        meta_keywords: source.meta_keywords ?? [],
        views: source.views ?? 0,
        entities,
        finalScore,
        highlight: {
          title: hit.highlight?.title?.[0] ?? null,
          body: hit.highlight?.body ?? [],
        },
      }
    })

    const allKeywords = hits.flatMap(h => [...(h.tags ?? []), ...(h.meta_keywords ?? [])])
    const suggestions = generateSuggestions(query, Array.from(new Set(allKeywords)))

    const totalHits =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value ?? 0

    return NextResponse.json({ hits, suggestions, page, size, total: totalHits })
  } catch (err) {
    console.error('Search API error:', err)
    return NextResponse.json(
      { hits: [], suggestions: [], page: 0, size: 0, total: 0, error: 'Search failed' },
      { status: 500 },
    )
  }
}
