import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'
import { SUPABASE_CONFIG } from '@/utils/supabase-config'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirectTo = requestUrl.searchParams.get('redirectTo')

    if (code) {
        // Create the response object first
        const response = NextResponse.redirect(new URL('/feed', request.url))

        const supabase = createServerClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        // Set cookies on the response object, not request
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                    },
                    remove(name: string, options: CookieOptions) {
                        // Remove cookies from the response object
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                        })
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Error exchanging code for session:', error)
            return NextResponse.redirect(new URL('/login?error=oauth_error', request.url))
        }

        // Get user info to determine redirect
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            console.log('User authenticated successfully:', user.email)

            // Check if user has a profile/username
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single()

            // Determine redirect URL
            let finalRedirect = '/feed'

            if (redirectTo) {
                finalRedirect = redirectTo
            } else if (profile?.username) {
                finalRedirect = `/profile/${profile.username}`
            }

            // Update the redirect URL and return the response with cookies
            return NextResponse.redirect(new URL(finalRedirect, request.url), response)
        }
    }

    // If something went wrong, redirect to login
    return NextResponse.redirect(new URL('/login?error=oauth_callback_error', request.url))
}
