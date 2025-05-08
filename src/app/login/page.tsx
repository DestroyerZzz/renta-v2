import { Suspense } from 'react'
import SignIn from '@/components/auth/SignIn'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="flex justify-center items-center min-h-[70vh]">Loading...</div>}>
          <SignIn />
        </Suspense>
      </div>
    </div>
  )
}