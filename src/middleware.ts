import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { SUPABASE_CONFIG } from './utils/supabase-config'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Get session to check if user is logged in
    const { data: { session } } = await supabase.auth.getSession()
    
    // Use getUser() which verifies with the Auth server for secure user data
    const { data: { user } } = session ? await supabase.auth.getUser() : { data: { user: null } }
    
    const isAuthenticated = !!session && !!user
    const userId = user?.id

    // Define route types
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                       request.nextUrl.pathname.startsWith('/signup')
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')
    const isPublicProfileRoute = request.nextUrl.pathname.startsWith('/profile/')

    // If accessing home page while authenticated, redirect to dashboard
    if (isAuthenticated && request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Allow public access to profile pages
    if (isPublicProfileRoute) {
      return response
    }

    // If user is not authenticated and trying to access a protected route, redirect to login
    if (!isAuthenticated && isProtectedRoute) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (isAuthenticated && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Add user information to request headers for server components
    if (isAuthenticated && userId) {
      response.headers.set('x-user-id', userId)
    }

    return response
  } catch (e) {
    console.error('Middleware error:', e)
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login?error=auth_error', request.url))
    }
    return response
  }
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/signup', '/profile/:path*'],
}