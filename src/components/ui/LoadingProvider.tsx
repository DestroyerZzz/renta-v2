'use client'

import NavigationEventsContent from './NavigationEvents'
import { Suspense } from 'react'

interface LoadingProviderProps {
    color?: string;
    height?: number;
}

/**
 * Client component wrapper for loading bar
 */
export default function LoadingProvider({ color = '#3d82f7', height = 3 }: LoadingProviderProps) {
    return (
        <Suspense fallback={null}>
            <NavigationEventsContent color={color} height={height} />
        </Suspense>
    )
}
