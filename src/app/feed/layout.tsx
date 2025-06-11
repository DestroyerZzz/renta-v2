import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Лента интересов | OpenMind',
    description: 'Просмотр последних добавленных интересов от всех пользователей OpenMind.',
}

export default function FeedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>{children}</>
    )
}
