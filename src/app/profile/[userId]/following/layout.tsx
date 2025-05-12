'use client'

// import ProfileHeader from '@/components/profile/ProfileHeader'
// import { useParams } from 'next/navigation'

export default function FollowingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // const params = useParams()
    // const userId = params.userId as string

    return (
        <div className="flex flex-col min-h-screen">
            {/* <ProfileHeader userId={userId} /> */}
            <main className="flex-grow">
                {children}
            </main>
        </div>
    )
}
