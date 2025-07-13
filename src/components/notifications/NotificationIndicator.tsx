'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { Bell } from 'lucide-react'

interface NotificationIndicatorProps {
    className?: string
}

export default function NotificationIndicator({ className = '' }: NotificationIndicatorProps) {
    // Create supabase client inside component but cache it
    const supabase = createClient()
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchUnreadCount = async () => {
            setIsLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    setIsLoading(false)
                    return
                }

                const { count, error } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', user.id)
                    .eq('read', false)

                if (error) throw error

                setUnreadCount(count || 0)
            } catch (error) {
                console.error('Error fetching unread notifications count:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchUnreadCount()

        // Set up real-time subscription for new notifications
        const channel = supabase
            .channel('notification-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    fetchUnreadCount()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    fetchUnreadCount()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (isLoading || unreadCount === 0) {
        return (
            <div className={`relative ${className}`}>
                <Bell className="w-4 h-4" />
            </div>
        )
    }

    return (
        <div className={`relative ${className}`}>
            <Bell className="w-4 h-4" />
            <span className="absolute -right-1.5 -top-1.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
        </div>
    )
}
