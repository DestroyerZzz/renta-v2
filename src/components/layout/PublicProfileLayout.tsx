'use client'

import Link from 'next/link'
import { LogIn, UserPlus, Menu, X, Home, Settings, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const supabase = createClient()

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [supabase])

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Close mobile menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640 && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileMenuOpen])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors duration-300"
                aria-controls="mobile-menu"
                aria-expanded={mobileMenuOpen ? "true" : "false"}
                aria-label="Main menu"
              >
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="hidden sm:flex items-center space-x-6 flex-1">
              <Link
                href="/"
                className="px-2 py-1 text-sm font-medium rounded-md flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors duration-300"
              >
                <Home className="w-4 h-4" />
                <span>Главная</span>
              </Link>
            </div>

            <div className="flex items-center justify-center">
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-extrabold">
                  <span className="text-green-600">Open</span>
                  <span className="text-red-600">Mind</span>
                </span>
              </Link>
            </div>

            <div className="flex items-center flex-1 justify-end">
              <div className="hidden sm:flex items-center space-x-3">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/edit_profile"
                      className="px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-2 text-[#3d82f7] hover:text-[#2d6ce0] hover:bg-gray-200 transition-colors duration-300"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Настройки</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-2 bg-[#3d82f7] text-white hover:bg-[#2d6ce0] transition-colors duration-300 disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isLoggingOut ? 'Выход...' : 'Выйти'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-2 text-[#3d82f7] hover:text-[#2d6ce0] hover:bg-gray-200 transition-colors duration-300"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Войти</span>
                    </Link>
                    <Link
                      href="/signup"
                      className="px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-2 bg-[#3d82f7] text-white hover:bg-[#2d6ce0] transition-colors duration-300"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Регистрация</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`sm:hidden transition-all duration-300 ease-in-out transform ${mobileMenuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
            }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 shadow-lg bg-white">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-300"
            >
              <Home className="w-5 h-5" />
              <span>Главная</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  href="/edit_profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-300"
                >
                  <Settings className="w-5 h-5" />
                  <span>Настройки</span>
                </Link>
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false)
                    await handleLogout()
                  }}
                  disabled={isLoggingOut}
                  className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-red-600 hover:bg-red-50 transition-colors duration-300 disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{isLoggingOut ? 'Выход...' : 'Выйти'}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-300"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Войти</span>
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 bg-gray-800 text-white transition-colors duration-300"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Регистрация</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}