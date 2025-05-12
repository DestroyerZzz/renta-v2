import PublicProfileLayout from '@/components/layout/PublicProfileLayout'
import NotificationsContent from '../../components/notifications/NotificationsContent'

export default function NotificationsPage() {
    return (
        <PublicProfileLayout>
            <div className="mx-auto max-w-3xl">
                <NotificationsContent />
            </div>
        </PublicProfileLayout>
    )
}