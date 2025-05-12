
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase'
import toast from 'react-hot-toast'
import { UserPlus, UserMinus } from 'lucide-react'

interface FollowButtonProps {
    targetUserId: string
    className?: string
}

// Create supabase client OUTSIDE the component so it's referentially stable
const supabase = createClient()

export default function FollowButton({ targetUserId, className = '' }: FollowButtonProps) {
    const [isFollowing, setIsFollowing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    const checkFollowStatus = useCallback(
        async (userId: string) => {
            try {
                const { data } = await supabase
                    .from('follows')
                    .select('*')
                    .eq('follower_id', userId)
                    .eq('following_id', targetUserId)
                    .maybeSingle()

                setIsFollowing(!!data)
            } catch (error) {
                console.error('Error checking follow status:', error)
            }
        },
        [targetUserId], // supabase is now stable, so only targetUserId is needed here
    )

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data } = await supabase.auth.getUser()
                if (data.user) {
                    setCurrentUserId(data.user.id)
                    await checkFollowStatus(data.user.id)
                }
            } catch (error) {
                console.error('Error in checkAuth:', error)
            }
        }

        checkAuth()
    }, [targetUserId, checkFollowStatus]) // No supabase.auth dependency needed anymore

    const handleFollow = async () => {
        if (!currentUserId) {
            toast.error('Необходимо войти в систему, чтобы подписаться')
            return
        }

        if (currentUserId === targetUserId) {
            toast.error('Вы не можете подписаться на себя')
            return
        }

        setIsLoading(true)

        try {
            if (isFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .match({ follower_id: currentUserId, following_id: targetUserId })

                if (error) throw error

                setIsFollowing(false)
                toast.success('Вы отписались')
            } else {
                // Follow
                const { error } = await supabase
                    .from('follows')
                    .insert({
                        follower_id: currentUserId,
                        following_id: targetUserId,
                    })

                if (error) throw error

                setIsFollowing(true)
                toast.success('Вы подписались')
            }
        } catch (error) {
            console.error('Error toggling follow status:', error)
            toast.error('Не удалось обновить статус подписки')
        } finally {
            setIsLoading(false)
        }
    }

    if (!currentUserId || currentUserId === targetUserId) {
        return null
    }

    return (
        <button
            className={`cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isFollowing
                ? 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                } ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} flex items-center gap-1.5`}
            onClick={handleFollow}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Загрузка...</span>
                </>
            ) : isFollowing ? (
                <>
                    <UserMinus size={14} />
                    <span>Отписаться</span>
                </>
            ) : (
                <>
                    <UserPlus size={14} />
                    <span>Подписаться</span>
                </>
            )}
        </button>
    )
}
