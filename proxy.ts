// middleware.ts (oder .js) im root Verzeichnis oder `app/`-Ordner

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()

  // Vergleiche Pfad mit seiner lowercased Version
  const lowercasedPath = url.pathname.toLowerCase()

  if (url.pathname !== lowercasedPath) {
    url.pathname = lowercasedPath
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
