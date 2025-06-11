import { NotFoundPage } from '@/components/pages/page_not_found_404'
import { Suspense } from 'react'

export default function NotFound() {
  // Ensure the 404 page is wrapped with Suspense to handle any client-side hooks like useSearchParams
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NotFoundPage />
    </Suspense>
  )
}