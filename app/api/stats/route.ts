// app/api/stats/route.ts
import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.POSTGRES_DSN,
})

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status=0) AS pending,
        COUNT(*) FILTER (WHERE status=1) AS crawled,
        COUNT(*) AS total,
        COUNT(DISTINCT domain_id) AS domains
      FROM urls
    `)
    const stats = res.rows[0]
    return NextResponse.json(stats)
  } catch (err) {
    console.error('Stats API error:', err)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
}
