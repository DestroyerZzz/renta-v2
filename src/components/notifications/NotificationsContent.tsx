'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import Link from 'next/link'
import SupabaseImage from '@/components/ui/SupabaseImage'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Bell, Check, UserPlus, FileText, ThumbsUp, ThumbsDown } from 'lucide-react'
import toast from 'react-hot-toast'
import FollowButton from '@/components/profile/FollowButton'

interface Profile {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
}

interface Interest {
    id: string
    title: string
    display_section: 'left' | 'right'
}

interface Notification {
    id: string
    receiver_id: string
    sender_id: string
    sender: Profile
    type: 'follow' | 'post' | 'interest'
    content: string
    entity_id: string | null
    read: boolean
    created_at: string
    interest?: Interest | null
    is_like?: boolean
}

// Create supabase client OUTSIDE the component so it's referentially stable
const supabase = createClient()

export default function NotificationsContent() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    // Mark all notifications as read on mount
    useEffect(() => {
        const markAllAsRead = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                setCurrentUserId(user.id)

                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('receiver_id', user.id)
                    .eq('read', false)
            } catch (error) {
                console.error('Error marking notifications as read:', error)
            }
        }

        markAllAsRead()
    }, [])

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setIsLoading(false)
                    return
                }

                const { data: initialData, error } = await supabase
                    .from('notifications')
                    .select(`
                        *,
                        sender:profiles!sender_id (
                            id,
                            full_name,
                            username,
                            avatar_url
                        )
                    `)
                    .eq('receiver_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50)

                if (error) throw error

                // Fetch interest details for 'interest' type notifications
                if (initialData) {
                    let processedData = [...initialData] as Notification[]
                    const interestNotifications = processedData.filter(
                        (n: Notification) => n.type === 'interest' && n.entity_id
                    )

                    if (interestNotifications.length > 0) {
                        const { data: interests, error: interestError } = await supabase
                            .from('products')
                            .select('id, title, display_section')
                            .in('id', interestNotifications.map(n => n.entity_id))

                        if (interestError) throw interestError

                        // Map interests to notifications
                        processedData = processedData.map((notification: Notification) => {
                            if (notification.type === 'interest' && notification.entity_id) {
                                const interest = interests?.find(i => i.id === notification.entity_id)
                                return {
                                    ...notification,
                                    interest: interest || null,
                                    is_like: interest?.display_section === 'left'
                                }
                            }
                            return notification
                        })
                    }

                    const formattedData = processedData.map(item => ({
                        ...item,
                        sender: Array.isArray(item.sender)
                            ? (item.sender[0] || { id: '', full_name: null, username: null, avatar_url: null })
                            : (item.sender || { id: '', full_name: null, username: null, avatar_url: null })
                    })) as Notification[]

                    setNotifications(formattedData)
                }
            } catch (error) {
                console.error('Error fetching notifications:', error)
                toast.error('Ошибка при загрузке уведомлений')
            } finally {
                setIsLoading(false)
            }
        }

        fetchNotifications()

        // Real-time subscription
        const channel = supabase
            .channel('new-notifications')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                () => fetchNotifications()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Helpers
    const getNotificationIcon = (type: string, isLike?: boolean) => {
        switch (type) {
            case 'follow': return <UserPlus className="w-5 h-5 text-blue-500" />
            case 'post': return <FileText className="w-5 h-5 text-green-500" />
            case 'interest': return isLike ?
                <ThumbsUp className="w-5 h-5 text-green-500" /> :
                <ThumbsDown className="w-5 h-5 text-red-500" />
            default: return <Bell className="w-5 h-5 text-gray-500" />
        }
    }

    const getNotificationLink = (notification: Notification) => {
        const username = notification.sender?.username || notification.sender?.id
        switch (notification.type) {
            case 'follow':
                return `/profile/${username}`
            case 'post':
                return notification.entity_id
                    ? `/profile/${username}/posts#post-${notification.entity_id}`
                    : `/profile/${username}/posts`
            case 'interest':
                return notification.entity_id
                    ? `/profile/${username}#intrests-${notification.entity_id}`
                    : `/profile/${username}`
            default:
                return `/profile/${username}`
        }
    }

    const getNotificationMessage = (notification: Notification) => {
        const name = notification.sender?.full_name
            || notification.sender?.username
            || 'Пользователь'
        switch (notification.type) {
            case 'follow': return `${name} подписался на вас`
            case 'post': return `${name} опубликовал новый пост`
            case 'interest': {
                const section = notification.is_like ? 'Нравится' : 'Не нравится'
                return notification.interest
                    ? `${name} добавил "${notification.interest.title}" в раздел ${section}`
                    : `${name} добавил новый интерес`
            }
            default: return `${name} ${notification.content}`
        }
    }

    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Уведомления</h1>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-start p-4 border rounded-lg animate-pulse">
                            <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-gray-800 text-2xl font-bold">Уведомления</h1>
                {notifications.length > 0 && (
                    <button
                        onClick={async () => {
                            try {
                                if (!currentUserId) return
                                const { error } = await supabase
                                    .from('notifications')
                                    .update({ read: true })
                                    .eq('receiver_id', currentUserId)
                                if (error) throw error
                                setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))
                                toast.success('Все уведомления отмечены как прочитанные')
                            } catch (error) {
                                console.error('Error marking all as read:', error)
                                toast.error('Ошибка при обновлении уведомлений')
                            }
                        }}
                        className="cursor-pointer flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-gray-600 font-medium transition-colors"
                    >
                        <Check className="w-4 h-4" />
                        <span>Отметить все как прочитанные</span>
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-500 mb-4">
                        <Bell className="w-7 h-7" />
                    </div>
                    <p className="text-gray-500 font-medium">У вас нет уведомлений</p>
                    <p className="text-gray-400 text-sm mt-1">Все новые уведомления будут появляться здесь</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`flex items-start p-4 border rounded-lg hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50 border-blue-100' : ''}`}
                        >
                            <Link
                                href={getNotificationLink(notification)}
                                className="flex-shrink-0 mr-4"
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                                    {notification.sender?.avatar_url ? (
                                        <SupabaseImage
                                            src={notification.sender.avatar_url}
                                            alt={notification.sender.full_name || 'Пользователь'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-600 text-lg font-bold">
                                            {(notification.sender?.full_name?.[0] || notification.sender?.username?.[0] || 'П').toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </Link>

                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <Link
                                        href={getNotificationLink(notification)}
                                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                    >
                                        {getNotificationMessage(notification)}
                                    </Link>
                                    <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(notification.created_at), {
                                            addSuffix: true,
                                            locale: ru
                                        })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                    <div className={`p-1.5 rounded-full ${notification.type === 'interest'
                                        ? notification.is_like
                                            ? 'bg-green-100'
                                            : 'bg-red-100'
                                        : 'bg-gray-100'
                                        }`}>
                                        {getNotificationIcon(notification.type, notification.is_like)}
                                    </div>

                                    {notification.type === 'follow' && (
                                        <FollowButton targetUserId={notification.sender.id} />
                                    )}

                                    {notification.type !== 'follow' && (
                                        <Link
                                            href={getNotificationLink(notification)}
                                            className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${notification.type === 'interest'
                                                ? notification.is_like
                                                    ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                                }`}
                                        >
                                            Посмотреть
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}