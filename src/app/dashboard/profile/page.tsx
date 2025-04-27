'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase'
import { v4 as uuidv4 } from 'uuid'
import SupabaseImage from '@/components/ui/SupabaseImage'
import { Edit, Camera, Image, User, Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { debounce } from 'lodash'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [originalUsername, setOriginalUsername] = useState<string | null>(null)
  
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
        // Check if we have profile data in session storage from recent registration
        let sessionProfile;
        try {
          const profileData = sessionStorage.getItem('userProfile');
          if (profileData) {
            sessionProfile = JSON.parse(profileData);
            // console.log('Found profile data in session storage:', sessionProfile);
          }
        } catch (storageError) {
          console.error('Error reading from session storage:', storageError);
        }

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
          
          // Set username and keep track of original username for change detection
          if (profile.username) {
            setUsername(profile.username)
            setOriginalUsername(profile.username)
          }
          
          // Debug: Log the avatar URL
          // console.log('Avatar URL from database:', profile.avatar_url)
          // console.log('Cover Image URL from database:', profile.cover_image_url)
          // console.log('Username from database:', profile.username)
        } else if (sessionProfile) {
          // Use data from session storage if profile not found in database
          setFullName(sessionProfile.full_name || '')
          if (sessionProfile.username) {
            setUsername(sessionProfile.username)
            setOriginalUsername(sessionProfile.username)
          }
          
          // console.log('Using profile data from session storage', sessionProfile);
          
          // Save this data to the database to ensure consistency
          const profileData = {
            id: user.id,
            full_name: sessionProfile.full_name || '',
            username: sessionProfile.username || null,
            updated_at: new Date().toISOString(),
          };
          
          const { error: updateError } = await supabase
            .from('profiles')
            .upsert(profileData, { 
              onConflict: 'id',
              ignoreDuplicates: false
            });
            
          if (updateError) {
            console.error('Error saving session profile data to database:', updateError);
          } else {
            // console.log('Successfully saved session profile data to database');
            // Clear session storage after successful database save
            sessionStorage.removeItem('userProfile');
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProfile()
  }, [supabase])
  
  // Validate username format (only allow letters, numbers, underscores, and hyphens)
  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    return usernameRegex.test(username);
  };

  // Check if username exists in the database
  const checkUsernameExists = async (username: string) => {
    // Don't check availability if username hasn't changed
    if (username === originalUsername) {
      setIsUsernameAvailable(true);
      setUsernameError(null);
      return;
    }
    
    if (!username.trim() || username.trim().length < 3) {
      setIsUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    // Validate username format
    if (!validateUsername(username)) {
      setUsernameError('Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы.');
      setIsUsernameAvailable(false);
      return;
    } else {
      setUsernameError(null);
    }

    setIsCheckingUsername(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .neq('id', userId || '') // Exclude current user's profile
        .limit(1);
      
      if (error) throw error;
      
      // Username is available if no matching profiles were found
      const isAvailable = !data || data.length === 0;
      setIsUsernameAvailable(isAvailable);
    } catch (err) {
      console.error('Error checking username:', err);
      // Don't block if username check fails
      setIsUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Debounced function to avoid too many database queries while typing
  const debouncedCheckUsername = debounce(checkUsernameExists, 500);

  // Effect to check username when it changes
  useEffect(() => {
    if (username) {
      debouncedCheckUsername(username);
    } else {
      setIsUsernameAvailable(null);
      setUsernameError(null);
    }
    
    return () => {
      debouncedCheckUsername.cancel();
    };
  }, [username]);
  
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
  
  // Function to render username availability indicator
  const renderUsernameAvailability = () => {
    if (!username || username.trim().length < 3) return null;
    
    if (isCheckingUsername) {
      return (
        <div className="flex items-center mt-1 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin mr-1" />
          <span>Проверка доступности...</span>
        </div>
      );
    }
    
    if (usernameError) {
      return (
        <div className="flex items-center mt-1 text-xs text-red-500">
          <X size={14} className="mr-1" />
          <span>{usernameError}</span>
        </div>
      );
    }
    
    if (isUsernameAvailable === true) {
      return (
        <div className="flex items-center mt-1 text-xs text-green-600">
          <Check size={14} className="mr-1" />
          <span>{username === originalUsername ? 'Текущее имя пользователя' : 'Имя пользователя доступно'}</span>
        </div>
      );
    }
    
    if (isUsernameAvailable === false && !usernameError) {
      return (
        <div className="flex items-center mt-1 text-xs text-red-500">
          <AlertCircle size={14} className="mr-1" />
          <span>Имя пользователя уже занято</span>
        </div>
      );
    }
    
    return null;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    
    setIsSaving(true)
    setMessage(null)
    
    // Validate username before saving
    if (username && username !== originalUsername) {
      if (!validateUsername(username)) {
        setMessage({ 
          type: 'error', 
          text: 'Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы.' 
        });
        setIsSaving(false);
        return;
      }
      
      if (username.length < 3) {
        setMessage({ 
          type: 'error', 
          text: 'Имя пользователя должно содержать не менее 3 символов.' 
        });
        setIsSaving(false);
        return;
      }
      
      if (isUsernameAvailable === false) {
        setMessage({ 
          type: 'error', 
          text: 'Это имя пользователя уже занято. Пожалуйста, выберите другое.' 
        });
        setIsSaving(false);
        return;
      }
      
      // Do final check for username availability
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .neq('id', userId)
        .limit(1);
        
      if (existingUsers && existingUsers.length > 0) {
        setMessage({ 
          type: 'error', 
          text: 'Это имя пользователя уже занято. Пожалуйста, выберите другое.' 
        });
        setIsSaving(false);
        return;
      }
    }
    
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
        
        // console.log('Attempting to upload avatar to:', filePath)
        
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
        
        // console.log('New avatar URL:', newAvatarUrl)
        
        // Delete old avatar if exists
        if (avatarUrl && !avatarUrl.startsWith('data:')) {
          try {
            const oldAvatarPath = new URL(avatarUrl).pathname.split('/').pop()
            const oldUserId = new URL(avatarUrl).pathname.split('/')[new URL(avatarUrl).pathname.split('/').length - 2]
            
            if (oldAvatarPath && oldUserId === userId) {
              await supabase.storage.from('avatars').remove([`${userId}/${oldAvatarPath}`])
              // console.log('Old avatar removed successfully')
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
        
        // console.log('Attempting to upload cover image to:', filePath)
        
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
        
        // console.log('New cover image URL:', newCoverImageUrl)
        
        // Delete old cover image if exists
        if (coverImageUrl && !coverImageUrl.startsWith('data:')) {
          try {
            const oldCoverPath = new URL(coverImageUrl).pathname.split('/').pop()
            const oldUserId = new URL(coverImageUrl).pathname.split('/')[new URL(coverImageUrl).pathname.split('/').length - 2]
            
            if (oldCoverPath && oldUserId === userId) {
              await supabase.storage.from('covers').remove([`${userId}/${oldCoverPath}`])
              // console.log('Old cover image removed successfully')
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
          username: username || null,
          avatar_url: newAvatarUrl,
          cover_image_url: newCoverImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      
      if (updateError) {
        throw new Error(`Ошибка обновления профиля: ${updateError.message}`)
      }
      
      // Update the original username state
      setOriginalUsername(username);
      
      // Show success message
      setMessage({ type: 'success', text: 'Профиль успешно обновлен' })
      
      // Show toast notification if username was updated
      if (username && username !== originalUsername) {
        toast.success(`Имя пользователя обновлено на @${username}`, {
          duration: 3000,
          position: 'top-center',
        });
      }
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
                    className="object-cover w-full h-full"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-200 hover:bg-gray-100 cursor-pointer transition-colors duration-300" onClick={triggerCoverInput}>
                  <Image size={32} className="text-gray-400" />
                </div>
              )}
              
              {/* Edit button for cover image */}
              <div className="absolute top-2 right-2">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="bg-black/30 hover:bg-black/50 p-2 rounded-full transition-colors duration-300 focus:outline-none"
                  aria-label="Редактировать изображения"
                >
                  <Edit className="h-5 w-5 text-white" />
                </button>
                
                {/* Dropdown menu for edit options */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10" ref={dropdownRef}>
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
        
        {/* Username Input */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            Имя пользователя
          </label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-gray-400" />
            </div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full text-black pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                isUsernameAvailable === false 
                  ? 'border-red-300 bg-red-50' 
                  : isUsernameAvailable === true 
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
              }`}
              placeholder="Уникальное имя пользователя"
              minLength={3}
            />
          </div>
          {renderUsernameAvailability()}
          <p className="mt-1 text-xs text-gray-500">
            Используйте только буквы, цифры, дефисы и подчеркивания. Это имя будет использоваться для публичного профиля.
          </p>
          {username && (
            <p className="mt-1 text-xs text-[#3d82f7]">
              Ваш профиль будет доступен по адресу: {window.location.origin}/profile/{username}
            </p>
          )}
        </div>
        
        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSaving || isCheckingUsername || isUsernameAvailable === false}
            className="cursor-pointer w-full px-4 py-2 text-sm font-medium text-white bg-[#3d82f7] border border-transparent rounded-md shadow-sm hover:bg-[#2d6ce0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
          </button>
        </div>
      </form>
    </div>
  )
}