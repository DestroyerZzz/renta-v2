import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { SUPABASE_CONFIG } from './utils/supabase-config'

export async function middleware(request: NextRequest) {
  // Create a response early
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
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = session ? await supabase.auth.getUser() : { data: { user: null } }

    const isAuthenticated = !!session && !!user
    const userId = user?.id

    // Define route types
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup')
    const isProtectedRoute = request.nextUrl.pathname.includes('/edit_profile') ||
      request.nextUrl.pathname.startsWith('/notifications')
    const isPublicProfileRoute = request.nextUrl.pathname.startsWith('/profile/')

    // If accessing home page while authenticated, redirect to profile page
    if (isAuthenticated && request.nextUrl.pathname === '/') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

      const redirectPath = profile?.username ? `/profile/${profile.username}` : `/profile/${userId}`
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    // Handle public profile routes - support for both username and userId lookups
    if (isPublicProfileRoute) {
      // Extract the profile identifier (can be username or userId)
      const profileIdentifier = request.nextUrl.pathname.split('/')[2]

      if (profileIdentifier) {
        try {
          // First try to find profile by username
          const { data: profileByUsername } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', profileIdentifier)
            .single()

          if (profileByUsername) {
            // If we found a profile by username, set the user ID in the request headers
            response.headers.set('x-profile-id', profileByUsername.id)
            response.headers.set('x-profile-type', 'username')
            return response
          }

          // If not found by username, try to find by user ID
          const { data: profileById } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', profileIdentifier)
            .single()

          if (profileById) {
            // If user has a username, redirect to the username-based URL
            if (profileById.username) {
              return NextResponse.redirect(new URL(`/profile/${profileById.username}`, request.url))
            }

            // Otherwise just set the user ID in the request headers
            response.headers.set('x-profile-id', profileById.id)
            response.headers.set('x-profile-type', 'userId')
            return response
          }
        } catch (e) {
          console.error('Error in profile lookup middleware:', e)
        }
      }

      return response
    }

    // If user is not authenticated and trying to access a protected route, redirect to login
    if (!isAuthenticated && isProtectedRoute) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated and trying to access auth pages, redirect to their profile
    if (isAuthenticated && isAuthRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

      const redirectPath = profile?.username ? `/profile/${profile.username}` : `/profile/${userId}`
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    // Add user information to request headers for server components
    if (isAuthenticated && userId) {
      response.headers.set('x-user-id', userId)
    }

    return response
  } catch (e) {
    console.error('Middleware error:', e)
    if (request.nextUrl.pathname.includes('/edit_profile')) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }
}

export const config = {
  matcher: ['/', '/login', '/signup', '/profile/:path*', '/notifications', '/notifications/:path*', '/feed', '/feed/:path*'],
}