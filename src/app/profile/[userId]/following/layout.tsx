'use client'

import ProfileHeader from '@/components/profile/ProfileHeader'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'

export default function FollowingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const params = useParams()
    const urlUserId = params.userId as string
    const [actualUserId, setActualUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const resolveUserId = async () => {
            setIsLoading(true)
            try {
                // Always try username first since we want to handle both username and UUID paths
                const { data: profileByUsername } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', urlUserId)
                    .maybeSingle()

                if (profileByUsername?.id) {
                    setActualUserId(profileByUsername.id)
                    setIsLoading(false)
                    return
                }

                // If not found by username, check if it's a valid UUID
                const { data: profileById } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', urlUserId)
                    .maybeSingle()

                if (profileById?.id) {
                    setActualUserId(urlUserId)
                }
            } catch (error) {
                console.error('Error resolving user ID:', error)
            } finally {
                setIsLoading(false)
            }
        }

        resolveUserId()
    }, [urlUserId, supabase])

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="w-full h-64 bg-gray-100 animate-pulse"></div>
                <main className="flex-grow">
                    {children}
                </main>
            </div>
        )
    }

    if (!actualUserId) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="w-full p-4 bg-red-50 text-red-600">
                    Профиль не найден
                </div>
                <main className="flex-grow">
                    {children}
                </main>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen">
            <ProfileHeader userId={actualUserId} />
            <main className="flex-grow">
                {children}
            </main>
        </div>
    )
}
