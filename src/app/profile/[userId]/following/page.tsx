'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase'
import Link from 'next/link'
import SupabaseImage from '@/components/ui/SupabaseImage'
import FollowButton from '@/components/profile/FollowButton'
import { UserPlus } from 'lucide-react'

interface Profile {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
}

interface FollowingData {
    following_id: string;
    following: {
        id: string;
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    }[]; // Note: following is now an array
}

export default function FollowingPage() {
    const params = useParams()
    const userId = params.userId as string
    const [following, setFollowing] = useState<Profile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchFollowing = async () => {
            setIsLoading(true)

            try {
                // First resolve the user ID if it's a username
                let actualUserId = userId

                const { data: profileByUsername } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', userId)
                    .maybeSingle()

                if (profileByUsername) {
                    actualUserId = profileByUsername.id
                }

                // Get following
                const { data: followingData, error } = await supabase
                    .from('follows')
                    .select(`
                        following_id,
                        following:profiles!following_id(
                            id,
                            full_name,
                            username,
                            avatar_url
                        )
                    `)
                    .eq('follower_id', actualUserId)
                    .order('created_at', { ascending: false })

                if (error) throw error

                if (followingData && Array.isArray(followingData)) {
                    const profiles = followingData.map((item: FollowingData) => {
                        // Match notification pattern for data handling
                        const followingUser = Array.isArray(item.following)
                            ? (item.following[0] || { id: '', full_name: null, username: null, avatar_url: null })
                            : (item.following || { id: '', full_name: null, username: null, avatar_url: null })

                        return {
                            id: followingUser.id ?? '',
                            full_name: followingUser.full_name ?? '',
                            username: followingUser.username ?? '',
                            avatar_url: followingUser.avatar_url ?? ''
                        }
                    })

                    setFollowing(profiles)
                }
            } catch (error) {
                console.error('Error fetching following:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchFollowing()
    }, [userId, supabase])

    if (isLoading) {
        return (
            <div className="w-full max-w-2xl mx-auto p-4">
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-gray-700" />
                    Подписки
                </h1>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center p-4 border rounded-lg animate-pulse">
                            <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            <h1 className="text-gray-800 text-2xl font-bold mb-6 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-gray-700" />
                Подписки
            </h1>

            {following.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Нет подписок</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {following.map(profile => (
                        <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <Link href={`/profile/${profile.username || profile.id}`} className="flex items-center flex-1">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 mr-4">
                                    {profile.avatar_url ? (
                                        <SupabaseImage
                                            src={profile.avatar_url}
                                            alt={profile.full_name || 'Пользователь'}
                                            className="w-full h-full object-cover"
                                            fallback={
                                                <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-600 text-lg font-bold">
                                                    {(profile.full_name?.[0] || profile.username?.[0] || 'П').toUpperCase()}
                                                </div>
                                            }
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-600 text-lg font-bold">
                                            {(profile.full_name?.[0] || profile.username?.[0] || 'П').toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{profile.full_name || 'Пользователь'}</p>
                                    {profile.username && <p className="text-sm text-gray-500">@{profile.username}</p>}
                                </div>
                            </Link>
                            <FollowButton targetUserId={profile.id} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
