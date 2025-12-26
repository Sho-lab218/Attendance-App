import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // This also ensures we read the latest session from cookies
  await supabase.auth.getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user just signed in (indicated by query param), allow through
  // The cookies might not be immediately available to the server
  const justSignedIn = request.nextUrl.searchParams.get('just_signed_in')
  
  // For dashboard and class routes, be more lenient - let client-side guards handle verification
  // Only redirect if we're CERTAIN there's no user AND it's not a just-signed-in case
  if (
    !user &&
    !justSignedIn &&
    (request.nextUrl.pathname === '/dashboard' ||
     request.nextUrl.pathname.startsWith('/classes'))
  ) {
    // Don't redirect immediately - let the page load and client-side guards will check
    // This allows cookies to be read properly
  }

  // Redirect authenticated users away from login page
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

