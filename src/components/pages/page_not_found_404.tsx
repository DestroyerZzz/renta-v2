"use client";

import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import { Suspense } from 'react'
// import Link from 'next/link'

function NotFoundContent() {
  const router = useRouter()
  return (
    <section className="bg-white font-sans min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <div className="w-full sm:w-10/12 md:w-8/12 text-center">
            <div
              className="bg-[url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)] h-[250px] sm:h-[350px] md:h-[400px] bg-center bg-no-repeat bg-contain"
              aria-hidden="true"
            >
              <h1 className="text-center text-green-700 text-6xl sm:text-7xl md:text-8xl pt-6 sm:pt-8 font-bold">
                404
              </h1>
            </div>

            <div className="mt-[-50px]  p-8 rounded-lg ">
              <h3 className="text-2xl text-green-800 sm:text-3xl font-bold mb-4">
                Похоже, вы заблудились
              </h3>
              <p className="mb-6 text-gray-600 sm:mb-5 text-lg">
                Страница, которую вы ищете, недоступна!
              </p>

              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center px-6 py-3 text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
                type="button"
                aria-label="На главную"
              >
                <Home size={18} className="mr-2" />
                На главную
              </button>            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  );
}
