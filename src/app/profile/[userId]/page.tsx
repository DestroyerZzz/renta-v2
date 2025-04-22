'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import PublicProfileContent from '@/components/profile/PublicProfileContent'

export default function PublicProfilePage() {
  // Use client-side params hook instead of server component params
  const params = useParams()
  const userId = params.userId as string

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    }>
      <PublicProfileContent userId={userId} />
    </Suspense>
  )
}