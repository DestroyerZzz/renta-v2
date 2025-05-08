'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (signInData.user) {
        // Check for redirectTo parameter
        const redirectTo = searchParams.get('redirectTo')

        if (redirectTo) {
          // If we have a redirectTo URL, use it
          router.push(redirectTo)
        } else {
          // Otherwise, get user's profile and redirect to their profile page
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', signInData.user.id)
            .single()

          const redirectPath = profile?.username ? `/profile/${profile.username}` : `/profile/${signInData.user.id}`
          router.push(redirectPath)
        }
        router.refresh()
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Войти</h1>
          <p className="mt-2 text-sm text-gray-600">
            Добро пожаловать обратно! Войдите в свой аккаунт
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Адрес электронной почты
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block text-black w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Адрес электронной почты"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Пароль
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full text-black pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Пароль"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Вход в систему...' : 'Войти'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            У вас нет учетной записи?{' '}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}