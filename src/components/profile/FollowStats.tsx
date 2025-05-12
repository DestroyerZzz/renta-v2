'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { UserPlus, Users } from 'lucide-react'
import Link from 'next/link'

interface FollowStatsProps {
    userId: string
    className?: string
    username?: string
}

interface FollowCounts {
    followers: number
    following: number
}

export default function FollowStats({ userId, username, className = '' }: FollowStatsProps) {
    const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 })
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    // Create the base path for profile links
    const baseProfilePath = username ? `/profile/${username}` : `/profile/${userId}`

    useEffect(() => {
        const fetchFollowCounts = async () => {
            setIsLoading(true)

            try {
                // Get followers count
                const { count: followersCount, error: followersError } = await supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('following_id', userId)

                // Get following count
                const { count: followingCount, error: followingError } = await supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('follower_id', userId)

                if (followersError) throw followersError
                if (followingError) throw followingError

                setCounts({
                    followers: followersCount || 0,
                    following: followingCount || 0
                })
            } catch (error) {
                console.error('Error fetching follow counts:', error)
            } finally {
                setIsLoading(false)
            }
        }
        if (userId) {
            fetchFollowCounts()
        }
    }, [userId, supabase])

    if (isLoading) {
        return (
            <div className={`flex gap-4 text-sm ${className}`}>
                <div className="animate-pulse h-5 w-16 bg-gray-200/50 rounded"></div>
                <div className="animate-pulse h-5 w-16 bg-gray-200/50 rounded"></div>
            </div>
        )
    } return (
        <div className={`flex gap-6 text-sm font-medium ${className}`}>
            <Link href={`${baseProfilePath}/followers`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <Users size={14} />
                <span className="font-bold">{counts.followers}</span>
                <span>{counts.followers === 1 ? 'Подписчик' : 'Подписчики'}</span>
            </Link>
            <Link href={`${baseProfilePath}/following`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <UserPlus size={14} />
                <span className="font-bold">{counts.following}</span>
                <span>Подписки</span>
            </Link>
        </div>
    )
}
