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
            // Use response.cookies instead of request.cookies for setting cookies
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            // Use response.cookies instead of request.cookies for removing cookies
            response.cookies.set({
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
      
      // If we reach here, we couldn't find a valid profile
      // We'll continue to the profile page which can handle displaying a "not found" state
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