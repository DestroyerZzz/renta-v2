'use client'

import PublicProfileLayout from '@/components/layout/MainNavbar'
import FeedContent from '@/components/feed/FeedContent'

export default function FeedPage() {
    return (
        <PublicProfileLayout>
            <div className="mx-auto max-w-3xl">
                <h1 className="text-gray-700 text-2xl font-bold mb-6">Лента интересов</h1>
                <FeedContent />
            </div>
        </PublicProfileLayout>
    )
}
