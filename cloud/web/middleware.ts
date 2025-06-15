import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // If accessing get.homix.dev (root path), serve the installer
  if (hostname.startsWith('get.homix.dev') && url.pathname === '/') {
    url.pathname = '/api/installer'
    return NextResponse.rewrite(url)
  }
  
  // For app.homix.dev, redirect to /app
  if (hostname.startsWith('app.homix.dev') && url.pathname === '/') {
    url.pathname = '/app'
    return NextResponse.rewrite(url)
  }
  
  // For docs.homix.dev, redirect to /docs
  if (hostname.startsWith('docs.homix.dev') && url.pathname === '/') {
    url.pathname = '/docs'
    return NextResponse.rewrite(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/'
}