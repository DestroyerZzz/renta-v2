'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, Suspense } from 'react'
import NProgress from 'nprogress'
import '@/utils/nprogress-config'

interface NavigationEventsProps {
    color?: string;
    height?: number;
}

/**
 * Inner component for the navigation events
 */
function NavigationEventsContent({ color = '#3d82f7', height = 3 }: NavigationEventsProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const prevPathRef = useRef(pathname)
    const prevSearchParamsRef = useRef(searchParams)
    const navigationInProgressRef = useRef(false)
    const manualNavigationRef = useRef(false)
    const navigationStartTimeRef = useRef<number | null>(null)
    const [initialized, setInitialized] = useState(false)

    // Set up CSS styles for the loading bar
    useEffect(() => {
        try {
            const style = document.createElement('style')
            style.textContent = `
                #nprogress {
                    pointer-events: none;
                    z-index: 9999;
                }
                
                #nprogress .bar {
                    background: ${color};
                    position: fixed;
                    z-index: 9999;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: ${height}px;
                }
                
                #nprogress .peg {
                    display: block;
                    position: absolute;
                    right: 0px;
                    width: 100px;
                    height: 100%;
                    box-shadow: 0 0 10px ${color}, 0 0 5px ${color};
                    opacity: 1.0;
                    transform: rotate(3deg) translate(0px, -4px);
                }
            `
            document.head.appendChild(style)

            return () => {
                document.head.removeChild(style)
            }
        } catch (error) {
            console.error('Error applying NProgress styles:', error)
        }
    }, [color, height])    // Handle route changes
    useEffect(() => {
        if (!initialized) {
            setInitialized(true)
            return
        }

        const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
        const prevPath = prevPathRef.current +
            (prevSearchParamsRef.current?.toString() ? `?${prevSearchParamsRef.current.toString()}` : '')

        if (currentPath !== prevPath) {
            // If this is a real navigation (not just a back/forward or hash change)
            const isNewNavigation = currentPath.split('#')[0] !== prevPath.split('#')[0]

            if (isNewNavigation) {
                prevPathRef.current = pathname
                prevSearchParamsRef.current = searchParams

                // Only show progress bar for navigations taking longer than 100ms
                if (!navigationInProgressRef.current) {
                    navigationStartTimeRef.current = Date.now()
                    navigationInProgressRef.current = true

                    const timer = setTimeout(() => {
                        if (navigationInProgressRef.current) {
                            NProgress.start()
                        }
                    }, 100)

                    return () => {
                        clearTimeout(timer)
                    }
                } else {
                    // Navigation completed
                    const navigationTime = navigationStartTimeRef.current
                        ? Date.now() - navigationStartTimeRef.current
                        : 0

                    // If navigation was quick, show a brief progress indicator 
                    if (navigationTime < 100) {
                        NProgress.set(0.3)
                        setTimeout(() => {
                            NProgress.done()
                            navigationInProgressRef.current = false
                        }, 200)
                    } else {
                        NProgress.done()
                        navigationInProgressRef.current = false
                    }

                    navigationStartTimeRef.current = null
                }
            }
        }
    }, [pathname, searchParams, initialized])// Handle manual navigation initiated through router
    useEffect(() => {
        // Create an event handler for navigation actions
        const handleNavigationStart = () => {
            if (!navigationInProgressRef.current) {
                manualNavigationRef.current = true
                navigationStartTimeRef.current = Date.now()
                navigationInProgressRef.current = true

                // Delay showing the progress bar by 100ms to avoid flickering
                const timer = setTimeout(() => {
                    if (manualNavigationRef.current) {
                        NProgress.start()
                    }
                }, 100)

                return () => {
                    clearTimeout(timer)
                }
            }
        }

        const clickHandler = (e: MouseEvent) => {
            try {
                // Check if the click is on an anchor tag or a button that might trigger navigation
                const target = e.target as HTMLElement;
                if (!target) return;

                const anchor = target.closest('a');
                const button = target.closest('button');

                if ((anchor && anchor.href && !anchor.target && !anchor.href.startsWith('#')) ||
                    (button && button.getAttribute('data-navigation'))) {
                    handleNavigationStart();
                }
            } catch (error) {
                console.error('Error in navigation click handler:', error);
            }
        }

        // Make sure we're in a browser environment
        if (typeof document !== 'undefined') {
            document.addEventListener('click', clickHandler);

            return () => {
                document.removeEventListener('click', clickHandler);
            }
        }

        return () => { };
    }, [])

    // Ensure NProgress cleans up on unmount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!initialized && navigationInProgressRef.current) {
                NProgress.done()
                navigationInProgressRef.current = false
            }
        }, 500)

        return () => {
            clearTimeout(timer)
            NProgress.done()
        }
    }, [initialized])
    // This component doesn't render anything visible itself
    return null
}

/**
 * A component that triggers the loading bar for page transitions
 * This uses internal Next.js events and hooks to ensure it works reliably
 */
export default function NavigationEvents(props: NavigationEventsProps) {
    return (
        <Suspense fallback={null}>
            <NavigationEventsContent {...props} />
        </Suspense>
    );
}
