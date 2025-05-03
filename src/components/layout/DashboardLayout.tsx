'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
// import Image from 'next/image'
import { createClient } from '@/utils/supabase'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Share2, LogOut, Settings, Menu, X, Home, UserCircle, Compass, AlertCircle } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
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

  // Get user ID and username on mount
  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Get username from profile with better error handling
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('Error fetching profile:', error)
          } else if (profile?.username) {
            setUsername(profile.username)
            // console.log('Username loaded:', profile.username)
          } else {
            // console.log('No username found for user')
          }
        } catch (err) {
          console.error('Exception when fetching profile:', err)
        }
      }
    }
    
    getUserData()
    
    // Set up subscription to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new?.username) {
            setUsername(payload.new.username)
            // console.log('Username updated via subscription:', payload.new.username)
          }
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])
  
  // Separate function to fetch username specifically for share functionality
  const fetchUsernameForShare = async () => {
    if (userId) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single()
        
        if (error) {
          console.error('Error fetching username for share:', error)
          return username
        }
        
        if (profile?.username) {
          // Update the state if we found a username
          if (username !== profile.username) {
            setUsername(profile.username)
          }
          return profile.username
        }
      } catch (err) {
        console.error('Error fetching username for share:', err)
      }
    }
    return username
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error('Не удалось выйти из системы')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleShare = async () => {
    try {
      // Always fetch the latest username first
      const currentUsername = await fetchUsernameForShare()
      
      // Check if user has a username set
      if (currentUsername) {
        // Use username for sharing
        const shareUrl = `${window.location.origin}/profile/${currentUsername}`
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Ссылка на профиль скопирована!')
      } else if (userId) {
        // Fallback to userId if no username
        const shareUrl = `${window.location.origin}/profile/${userId}`
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Ссылка на профиль скопирована!')
        
        // Show info about setting username
        toast.custom(
          (t) => (
            <div 
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-blue-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-blue-800">
                      Совет
                    </p>
                    <p className="mt-1 text-sm text-blue-700">
                      Настройте имя пользователя в профиле для более запоминающейся ссылки.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-blue-200">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push('/dashboard/profile');
                  }}
                  className="cursor-pointer w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 hover:bg-blue-100 transition-colors duration-150 focus:outline-none"
                >
                  Настроить
                </button>
              </div>
            </div>
          ),
          { 
            duration: 5000, 
            position: 'top-center',
          }
        );
      }
      setMobileMenuOpen(false)
    } catch (error) {
      console.error('Error sharing profile:', error)
      toast.error('Не удалось скопировать ссылку на профиль')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar - removed sticky positioning */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Mobile menu button - only visible on small screens */}
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors duration-300"
                aria-controls="mobile-menu"
                aria-expanded={mobileMenuOpen}
                aria-label="Main menu"
              >
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
            
            {/* Left side links - hidden on mobile, visible on desktop */}
            <div className="hidden sm:flex items-center space-x-6 flex-1">
              <Link 
                href="/dashboard" 
                className="px-2 py-1 text-sm font-medium rounded-md flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors duration-300"
              >
                <Home className="w-4 h-4" />
                <span>Главная</span>
              </Link>
              <Link 
                // href="/explore" 
                href="/404" 
                className="px-2 py-1 text-sm font-medium rounded-md flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors duration-300"
              >
                <Compass className="w-4 h-4" />
                <span>Открытие</span>
              </Link>
            </div>
            
            {/* Centered logo with Open in green and Mind in red */}
            <div className="flex items-center justify-center">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-2xl font-extrabold">
                  <span className="text-green-600">Open</span>
                  <span className="text-red-600">Mind</span>
                </span>
              </Link>
            </div>
            
            {/* Right side menu items */}
            <div className="flex items-center flex-1 justify-end">
              <div className="hidden sm:flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="cursor-pointer px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-1 text-[#3d82f7] hover:text-[#2d6ce0] hover:bg-gray-200 transition-colors duration-300"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Поделиться</span>
                </button>
                <Link 
                  href="/dashboard/profile" 
                  className="p-2 rounded-md flex items-center justify-center text-gray-700 hover:text-[#2d6ce0] hover:bg-gray-200 transition-colors duration-300"
                  aria-label="Настройки профиля"
                  title="Настройки профиля"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="cursor-pointer px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-2 bg-[#3d82f7] text-white hover:bg-[#2d6ce0] disabled:opacity-50 transition-colors duration-300"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoggingOut ? 'Выход...' : 'Выйти'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu, show/hide based on menu state */}
        <div 
          id="mobile-menu"
          className={`sm:hidden transition-all duration-300 ease-in-out transform ${
            mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 shadow-lg bg-white">
            <Link 
              href="/dashboard" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-300"
            >
              <Home className="w-5 h-5" />
              <span>Главная</span>
            </Link>
            <Link 
              href="/explore" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-300"
            >
              <Compass className="w-5 h-5" />
              <span>Открытие</span>
            </Link>
            <Link 
              href="/dashboard/profile" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-300"
            >
              <UserCircle className="w-5 h-5" />
              <span>Профиль</span>
            </Link>
            <button
              type="button"
              onClick={handleShare}
              className="cursor-pointer block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-300"
            >
              <Share2 className="w-5 h-5" />
              <span>Поделиться</span>
            </button>
            <Link 
              href="/dashboard/profile" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-300"
            >
              <Settings className="w-5 h-5" />
              <span>Настройки</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="cursor-pointer block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 text-red-600 hover:bg-red-50 transition-colors duration-300 disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              <span>{isLoggingOut ? 'Выход из системы...' : 'Выйти'}</span>
            </button>
          </div>
        </div>
      </nav>
      
      {/* Main Content - Updated padding to remove extra space that was needed for sticky navbar */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}