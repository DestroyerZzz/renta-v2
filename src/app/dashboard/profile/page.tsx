'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase'
import { v4 as uuidv4 } from 'uuid'
import SupabaseImage from '@/components/ui/SupabaseImage'
import { Edit, Camera, Image} from 'lucide-react'

export default function ProfilePage() {
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)
        
        // Get profile data
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        if (profile) {
          setFullName(profile.full_name || '')
          setAvatarUrl(profile.avatar_url)
          setCoverImageUrl(profile.cover_image_url)
          
          // Debug: Log the avatar URL
          console.log('Avatar URL from database:', profile.avatar_url)
          console.log('Cover Image URL from database:', profile.cover_image_url)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProfile()
  }, [supabase])
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatarFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCoverImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setCoverImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const triggerAvatarInput = () => {
    avatarInputRef.current?.click()
    setShowDropdown(false)
  }
  
  const triggerCoverInput = () => {
    coverInputRef.current?.click()
    setShowDropdown(false)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    
    setIsSaving(true)
    setMessage(null)
    
    try {
      let newAvatarUrl = avatarUrl
      let newCoverImageUrl = coverImageUrl
      
      // Upload new avatar if selected
      if (avatarFile) {
        // Validate file size (max 2MB)
        if (avatarFile.size > 2 * 1024 * 1024) {
          throw new Error('Размер файла аватара не должен превышать 2MB')
        }

        // Create proper file path structure
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const filePath = `${userId}/${fileName}`
        
        console.log('Attempting to upload avatar to:', filePath)
        
        // First ensure the profile exists before uploading
        const { error: profileCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single()
          
        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          // Create profile if it doesn't exist
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: fullName,
              updated_at: new Date().toISOString(),
            })
            
          if (insertError) {
            console.error('Error creating profile:', insertError)
            throw new Error(`Не удалось создать профиль: ${insertError.message}`)
          }
        }
        
        // Now upload the avatar
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          })
          
        if (uploadError) {
          console.error('Upload error details:', uploadError)
          throw new Error(`Ошибка загрузки аватара: ${uploadError.message}`)
        }
        
        // Get public URL after successful upload
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        newAvatarUrl = data.publicUrl
        
        console.log('New avatar URL:', newAvatarUrl)
        
        // Delete old avatar if exists
        if (avatarUrl && !avatarUrl.startsWith('data:')) {
          try {
            const oldAvatarPath = new URL(avatarUrl).pathname.split('/').pop()
            const oldUserId = new URL(avatarUrl).pathname.split('/')[new URL(avatarUrl).pathname.split('/').length - 2]
            
            if (oldAvatarPath && oldUserId === userId) {
              await supabase.storage.from('avatars').remove([`${userId}/${oldAvatarPath}`])
              console.log('Old avatar removed successfully')
            }
          } catch (deleteError) {
            console.error('Error deleting old avatar (non-critical):', deleteError)
            // Don't throw error for this - it's not critical
          }
        }
      }
      
      // Upload new cover image if selected
      if (coverImageFile) {
        // Validate file size (max 5MB)
        if (coverImageFile.size > 5 * 1024 * 1024) {
          throw new Error('Размер файла обложки не должен превышать 5MB')
        }

        // Create proper file path structure
        const fileExt = coverImageFile.name.split('.').pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const filePath = `${userId}/${fileName}`
        
        console.log('Attempting to upload cover image to:', filePath)
        
        // Upload the cover image
        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(filePath, coverImageFile, {
            cacheControl: '3600',
            upsert: true,
          })
          
        if (uploadError) {
          console.error('Upload error details:', uploadError)
          throw new Error(`Ошибка загрузки обложки: ${uploadError.message}`)
        }
        
        // Get public URL after successful upload
        const { data } = supabase.storage.from('covers').getPublicUrl(filePath)
        newCoverImageUrl = data.publicUrl
        
        console.log('New cover image URL:', newCoverImageUrl)
        
        // Delete old cover image if exists
        if (coverImageUrl && !coverImageUrl.startsWith('data:')) {
          try {
            const oldCoverPath = new URL(coverImageUrl).pathname.split('/').pop()
            const oldUserId = new URL(coverImageUrl).pathname.split('/')[new URL(coverImageUrl).pathname.split('/').length - 2]
            
            if (oldCoverPath && oldUserId === userId) {
              await supabase.storage.from('covers').remove([`${userId}/${oldCoverPath}`])
              console.log('Old cover image removed successfully')
            }
          } catch (deleteError) {
            console.error('Error deleting old cover image (non-critical):', deleteError)
            // Don't throw error for this - it's not critical
          }
        }
      }
      
      // Update profile with new avatar URL and/or fullName
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: newAvatarUrl,
          cover_image_url: newCoverImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      
      if (updateError) {
        throw new Error(`Ошибка обновления профиля: ${updateError.message}`)
      }
      
      setMessage({ type: 'success', text: 'Профиль успешно обновлен' })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Неизвестная ошибка' })
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    )
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Ваш профиль</h1>
      
      {message && (
        <div className={`p-4 mb-6 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        {/* Cover and Avatar Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Изображения профиля
          </label>
          
          {/* Modified wrapper to add more bottom margin to account for the avatar */}
          <div className="relative w-full mb-20">
            {/* Cover Image - keeping overflow-hidden for rounded corners */}
            <div className="w-full h-60 rounded-lg overflow-hidden bg-gray-100">
              {coverImageUrl ? (
                coverImageUrl.startsWith('data:') ? (
                  <SupabaseImage
                    src={coverImageUrl}
                    alt="Cover"
                    fill
                    className="object-cover "
                  />
                ) : (
                  <SupabaseImage
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover absolute inset-0 rounded-lg"
                  />
                )
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 opacity-80">
                  <span className="text-white text-lg">Загрузите изображение обложки</span>
                </div>
              )}
              
              {/* Edit dropdown at top right */}
              <div className="absolute top-4 right-4" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
                  aria-label="Edit profile image"
                >
                  <Edit size={18} className="text-gray-700" />
                </button>
                
                {/* Dropdown menu for editing */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={triggerAvatarInput}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Camera size={16} />
                        <span>Изменить аватар</span>
                      </button>
                      <button
                        type="button"
                        onClick={triggerCoverInput}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Image size={16} aria-label="image-icon" />
                        <span>Изменить обложку</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Avatar positioned below the cover image with z-index to ensure it's always visible */}
            <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-12 z-10">
              <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-white bg-white shadow-lg">
                {avatarUrl ? (
                  avatarUrl.startsWith('data:') ? (
                    <SupabaseImage
                      src={avatarUrl}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <SupabaseImage
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  )
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-200">
                    <Camera size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Hidden File Inputs */}
          <input
            ref={avatarInputRef}
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            aria-label="Выберите фотографию профиля"
            className="hidden"
          />
          <input
            ref={coverInputRef}
            id="cover-upload"
            type="file"
            accept="image/*"
            onChange={handleCoverImageChange}
            aria-label="Выберите обложку профиля"
            className="hidden"
          />
        </div>
        
        {/* Full Name Input */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
            ФИО
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Полное имя"
          />
        </div>
        
        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSaving}
            className="cursor-pointer w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
          </button>
        </div>
      </form>
    </div>
  )
}