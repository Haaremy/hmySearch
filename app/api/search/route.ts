import { NextRequest, NextResponse } from 'next/server'
import { es } from '@/lib/elasticsearch'
import nlp from 'compromise'
import stringSimilarity from 'string-similarity'

export const runtime = 'nodejs'

type PageDocument = {
  url: string
  canonical?: string
  title?: string
  body?: string
  lang?: string
  views?: number
  updated_at?: string
  meta_description?: string
  meta_keywords?: string[]
  tags?: string[]
}

type Entity = {
  text: string
  type: 'Person' | 'Place' | 'Organization' | 'Number' | 'Other'
}

function extractEntities(text: string): Entity[] {
  const doc = nlp(text)
  const entities: Entity[] = []

  doc.people().out('array').forEach((p) => entities.push({ text: p, type: 'Person' }))
  doc.places().out('array').forEach((p) => entities.push({ text: p, type: 'Place' }))
  doc.organizations().out('array').forEach((o) => entities.push({ text: o, type: 'Organization' }))
  doc.numbers().out('array').forEach((n) => entities.push({ text: n, type: 'Number' }))

  return entities
}

function generateSuggestions(query: string, keywords: string[]): string[] {
  const suggestions: string[] = []

  // Fuzzy similarity für kleine Tippfehler
  keywords.forEach((k) => {
    const similarity = stringSimilarity.compareTwoStrings(query.toLowerCase(), k.toLowerCase())
    if (similarity > 0.6 && !suggestions.includes(k)) suggestions.push(k)
  })

  // Split query in Wörter und kombiniere mit Tags
  const queryWords = query.split(/\s+/)
  keywords.forEach((k) => {
    queryWords.forEach((w) => {
      if (k.toLowerCase().includes(w.toLowerCase()) && !suggestions.includes(k)) suggestions.push(k)
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

    const hits = result.hits.hits
      .filter(
        (hit): hit is { _id: string; _score?: number; _source: PageDocument; highlight?: any } =>
          !!hit._source
      )
      .map((hit) => {
        const source = hit._source

        // ----- Ranking Faktoren -----
        const matchScore = hit._score ?? 0
        const popularityScore = Math.log1p(source.views ?? 0)
        const freshnessScore =
          source.updated_at
            ? 1 / (1 + (Date.now() - new Date(source.updated_at).getTime()) / 86400000)
            : 0
        const tagScore =
          source.tags?.reduce((acc, t) => (query.includes(t) ? acc + 2 : acc), 0) ?? 0
        const keywordScore =
          source.meta_keywords?.reduce((acc, k) => (query.includes(k) ? acc + 1.5 : acc), 0) ?? 0
        const contentLengthScore = Math.min((source.body?.length ?? 0) / 1000, 5)
        const entityScore = extractEntities(source.body ?? '').reduce(
          (acc, e) => (query.includes(e.text) ? acc + 2 : acc),
          0
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
          canonical: source.canonical ?? source.url,
          title: source.title ?? '',
          body: source.body ?? '',
          lang: source.lang ?? 'unknown',
          meta_description: source.meta_description ?? '',
          meta_keywords: source.meta_keywords ?? [],
          tags: source.tags ?? [],
          popularity: source.views ?? 0,
          updated_at: source.updated_at ?? '',
          highlight: {
            title: Array.isArray(hit.highlight?.title) ? hit.highlight.title[0] : null,
            body: Array.isArray(hit.highlight?.body) ? hit.highlight.body[0] : null,
          },
          entities: extractEntities(source.body ?? ''),
          finalScore,
        }
      })
      .sort((a, b) => b.finalScore - a.finalScore)

    // ----- Generiere Vorschläge -----
    const allKeywords = hits.flatMap((h) => [...(h.tags ?? []), ...(h.meta_keywords ?? [])])
    const suggestions = generateSuggestions(query, Array.from(new Set(allKeywords)))

    return NextResponse.json({
      hits,
      suggestions,
      page,
      size,
      total: result.hits.total?.value ?? 0,
    })
  } catch (err) {
    console.error('Elasticsearch error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
