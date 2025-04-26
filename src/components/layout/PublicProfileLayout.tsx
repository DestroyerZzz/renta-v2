'use client'

import Link from 'next/link'
// import Image from 'next/image'
import { LogIn, UserPlus, Menu, X, Home } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  
  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
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
      {/* Enhanced Navigation - now sticky with transition effects */}
      <nav 
        className={` top-0 left-0 right-0 z-10 transition-all duration-300 ${
          scrolled 
            ? 'bg-white shadow-md text-indigo-700' 
            : 'bg-indigo-600 text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Mobile menu button - moved to left side but kept visible on small screens */}
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`inline-flex items-center justify-center p-2 rounded-md ${
                  scrolled
                    ? 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100'
                    : 'text-white hover:text-white hover:bg-indigo-700'
                } focus:outline-none transition-colors duration-300`}
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
            
            {/* Left side links - hidden on mobile */}
            <div className="hidden sm:flex items-center space-x-6">
              <Link 
                href="/" 
                className={`px-2 py-1 text-sm font-medium rounded-md flex items-center space-x-1 ${
                  scrolled 
                    ? 'text-indigo-600 hover:text-indigo-800' 
                    : 'text-white hover:text-indigo-100'
                } transition-colors duration-300`}
              >
                <Home className="w-4 h-4" />
                <span>Главная</span>
              </Link>
            </div>
            
            {/* Centered logo */}
            <div className="flex-1 flex items-center justify-center">
              <Link href="/" className="flex items-center">
                {/* <div className="relative w-8 h-8 mr-2">
                  <Image 
                    src="/logo.png" 
                    alt="Renta Logo" 
                    fill 
                    className="object-contain"
                  />
                </div> */}
                <span className={`text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${
                  scrolled 
                    ? 'from-indigo-700 via-blue-600 to-indigo-700' 
                    : 'from-blue-200 via-white to-blue-200'
                } animate-gradient bg-size-200 transition-colors duration-300`}>
                  Open Mind
                </span>
              </Link>
            </div>
            
            {/* Right side menu items */}
            <div className="flex items-center">
              <div className="hidden sm:flex items-center space-x-3">
                <Link 
                  href="/login" 
                  className={`px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-2 ${
                    scrolled 
                      ? 'text-indigo-600 hover:text-indigo-800' 
                      : 'text-white hover:text-indigo-100'
                  } transition-colors duration-300`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Войти</span>
                </Link>
                <Link
                  href="/signup"
                  className={`px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-2 ${
                    scrolled 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-indigo-700 hover:bg-indigo-800'
                  } transition-colors duration-300`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Регистрация</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu, show/hide based on menu state */}
        <div 
          id="mobile-menu"
          className={`sm:hidden transition-all duration-300 ease-in-out transform ${
            mobileMenuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className={`px-2 pt-2 pb-3 space-y-1 shadow-lg ${
            scrolled ? 'bg-white' : 'bg-indigo-700'
          }`}>
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 ${
                scrolled 
                  ? 'text-indigo-600 hover:bg-indigo-100' 
                  : 'text-white hover:bg-indigo-600'
              } transition-colors duration-300`}
            >
              <Home className="w-5 h-5" />
              <span>Главная</span>
            </Link>
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 ${
                scrolled 
                  ? 'text-indigo-600 hover:bg-indigo-100' 
                  : 'text-white hover:bg-indigo-600'
              } transition-colors duration-300`}
            >
              <LogIn className="w-5 h-5" />
              <span>Войти</span>
            </Link>
            <Link 
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className={`block w-full text-left px-3 py-3 text-base font-medium rounded-md flex items-center space-x-3 ${
                scrolled 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-white hover:bg-indigo-600'
              } transition-colors duration-300`}
            >
              <UserPlus className="w-5 h-5" />
              <span>Регистрация</span>
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Main Content - Added padding to account for fixed navbar */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pt-20">
        {children}
      </main>
    </div>
  )
}