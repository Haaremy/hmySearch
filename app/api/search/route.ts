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

    const size = Math.min(Number(searchParams.get('size') ?? 20), 50)
    const lastSort = searchParams.get('lastSort') || undefined  // search_after

    const esResult = await es.search<PageDocument>({
      index: 'pages',
      size,
      track_total_hits: false,
      _source: ['url','title','content','tags','meta_keywords','views','updated_at','lang'],
      sort: [{ _id: 'asc' }],
      query: {
        multi_match: {
          query,
          fields: ['title^4','content^2','meta_keywords^3','tags^5'],
          fuzziness: 'AUTO',
          operator: 'or',
        },
      },
      highlight: {
        fields: {
          title: { fragment_size: 100, number_of_fragments: 1 },
          content: { fragment_size: 100, number_of_fragments: 1 },
        },
      },
      ...(lastSort ? { search_after: [lastSort] } : {}),
      timeout: '2s',
    })

    const hitsRaw = esResult.hits.hits.filter(hit => hit._source)
    const hitsMap: Record<string, typeof hitsRaw[0]> = {}
    hitsRaw.forEach(hit => { hitsMap[hit._source!.url] ||= hit })
    const uniqueHits = Object.values(hitsMap)

    // Entity Extraction nur für Top 5
    const topHits = uniqueHits.slice(0, 5)

    const hits = uniqueHits.map((hit, idx) => {
      const src = hit._source!
      const body = src.content ?? ''
      const updatedAt = src.updated_at ? new Date(src.updated_at).getTime() : 0
      const entities = idx < 5 ? extractEntities(body) : []

      const matchScore = hit._score ?? 0
      const popularityScore = Math.log1p(src.views ?? 0)
      const freshnessScore = updatedAt ? 1 / (1 + (Date.now() - updatedAt) / 86400000) : 0
      const tagScore = src.tags?.reduce((acc,t) => (query.toLowerCase().includes(t.toLowerCase()) ? acc + 2 : acc),0) ?? 0
      const keywordScore = src.meta_keywords?.reduce((acc,k) => (query.toLowerCase().includes(k.toLowerCase()) ? acc + 1.5 : acc),0) ?? 0
      const contentLengthScore = Math.min(body.length / 1000,5)
      const entityScore = entities.reduce((acc,e) => (query.toLowerCase().includes(e.text.toLowerCase()) ? acc + 2 : acc),0)

      const finalScore = matchScore*1.5 + popularityScore*2 + freshnessScore*3 + tagScore + keywordScore + contentLengthScore + entityScore

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

    const allKeywords = hits.flatMap(h => [...(h.tags ?? []), ...(h.meta_keywords ?? [])])
    const suggestions = generateSuggestions(query, Array.from(new Set(allKeywords)))

    return NextResponse.json({
      hits,
      suggestions,
      total: typeof esResult.hits.total === 'number' ? esResult.hits.total : esResult.hits.total?.value ?? 0,
      size,
      lastSort: hits[hits.length-1]?.sort ?? null,
    })
  } catch (err) {
    console.error('Search API error:', err)
    return NextResponse.json({ hits: [], suggestions: [], total: 0, size: 0, lastSort: null, error: 'Search failed' }, { status: 500 })
  }
}
