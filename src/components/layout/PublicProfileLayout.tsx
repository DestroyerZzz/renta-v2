'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogIn, UserPlus, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Mobile menu button */}
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 focus:outline-none transition-colors duration-300"
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
            
            <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center">
                  <div className="relative w-8 h-8 mr-2">
                    <Image 
                      src="/logo.png" 
                      alt="Renta Logo" 
                      fill 
                      className="object-contain"
                    />
                  </div>
                  <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-700">
                    Renta
                  </span>
                </Link>
              </div>
            </div>
            
            {/* Desktop navigation */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
              <div className="hidden sm:flex items-center space-x-4">
                <Link 
                  href="/login" 
                  className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 rounded-md flex items-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Войти</span>
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center space-x-2"
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
          className={`sm:hidden transition-all duration-300 ease-in-out transform ${
            mobileMenuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 shadow-lg bg-white">
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-100 rounded-md flex items-center space-x-3 transition-colors duration-300"
            >
              <LogIn className="w-5 h-5" />
              <span>Войти</span>
            </Link>
            <Link 
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-3 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center space-x-3 transition-colors duration-300"
            >
              <UserPlus className="w-5 h-5" />
              <span>Регистрация</span>
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}