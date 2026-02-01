import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Redirect to favicon.svg using request URL as base
  const url = new URL('/favicon.svg', request.url)
  return NextResponse.redirect(url, 301)
}
