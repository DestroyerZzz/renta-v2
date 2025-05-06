'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PublicProfileContent from '@/components/profile/PublicProfileContent'
import { createClient } from '@/utils/supabase'

export default function PublicProfilePage() {
  // Use client-side params hook instead of server component params
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [actualUserId, setActualUserId] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // This can be either a userId or a username
  const profileIdentifier = params.userId as string

  // Determine if we're dealing with a userId or username, and get the actual userId
  useEffect(() => {
    const resolveProfileIdentifier = async () => {
      try {
        setIsLoading(true)

        // First try to find profile by username
        const { data: profileByUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', profileIdentifier)
          .maybeSingle()

        if (profileByUsername) {
          // If found by username, use that user ID
          setActualUserId(profileByUsername.id)
          return
        }

        // If not found by username, try to find by user ID
        const { data: profileById } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', profileIdentifier)
          .maybeSingle()

        if (profileById) {
          // If user has a username, redirect to the username-based URL
          if (profileById.username && profileById.username !== profileIdentifier) {
            router.replace(`/profile/${profileById.username}`)
            return
          }

          // Otherwise just use the user ID
          setActualUserId(profileById.id)
          return
        }

        // If we reach here, no profile was found
        setNotFound(true)
      } catch (error) {
        console.error('Error resolving profile identifier:', error)
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }

    if (profileIdentifier) {
      resolveProfileIdentifier()
    }
  }, [profileIdentifier, supabase, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Профиль не найден</h1>
        <p className="text-lg text-gray-600">
          Пользователь с указанным идентификатором не существует.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    }>
      {actualUserId && <PublicProfileContent userId={actualUserId} />}
    </Suspense>
  )
}