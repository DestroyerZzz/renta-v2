'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import ProfileHeader from '@/components/profile/ProfileHeader'

// Function to convert URLs in text to clickable links
const formatBioWithLinks = (text: string) => {
    if (!text) return '';

    // URL regex pattern
    const urlPattern = /(https?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;

    // Create an array to store the parts
    const parts: React.ReactNode[] = [];

    // Split text by URLs and process each part
    const textParts = text.split(urlPattern);

    // Process each part - odd indices will be URLs, even indices will be regular text
    textParts.forEach((part, index) => {
        if (index % 2 === 0) {
            // Regular text
            if (part) {
                parts.push(<span key={`text-${index}`}>{part}</span>);
            }
        } else {
            // URL part
            const url = part;
            // Format display text to remove protocol and trailing slashes
            let displayUrl = url.replace(/^(https?:\/\/)/, '').replace(/\/$/, '');
            // Limit display length if too long
            if (displayUrl.length > 30) {
                displayUrl = displayUrl.substring(0, 27) + '...';
            }

            parts.push(
                <a
                    key={`link-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline break-words"
                >
                    {displayUrl}
                </a>
            );
        }
    });

    return parts;
};

export default function BioPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [bio, setBio] = useState<string>('')
    const [editedBio, setEditedBio] = useState<string>('')
    const [isEditing, setIsEditing] = useState(false)
    const [charCount, setCharCount] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [actualUserId, setActualUserId] = useState<string | null>(null)
    const [notFound, setNotFound] = useState(false)
    const [isCurrentUser, setIsCurrentUser] = useState(false)
    const router = useRouter()
    const params = useParams()
    const profileIdentifier = params.userId as string
    const supabase = createClient()

    useEffect(() => {
        const resolveProfileIdentifier = async () => {
            try {
                // First try to find profile by username
                const { data: profileByUsername } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', profileIdentifier)
                    .maybeSingle()

                if (profileByUsername) {
                    setActualUserId(profileByUsername.id)
                    return
                }

                // If not found by username, try to find by user ID
                const { data: profileById } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .eq('id', profileIdentifier)
                    .maybeSingle()

                if (profileById) {
                    // If user has a username, redirect to the username-based URL
                    if (profileById.username && profileById.username !== profileIdentifier) {
                        router.replace(`/profile/${profileById.username}/bio`)
                        return
                    }
                    setActualUserId(profileById.id)
                    return
                }

                // If we reach here, no profile was found
                setNotFound(true)
            } catch (error) {
                console.error('Error resolving profile identifier:', error)
                setNotFound(true)
            }
        }

        if (profileIdentifier) {
            resolveProfileIdentifier()
        }
    }, [profileIdentifier, supabase, router])

    // Load bio once we have the actual user ID and check if this is the current user's profile
    useEffect(() => {
        async function loadBioAndCheckUser() {
            if (!actualUserId) return

            try {
                // Check if the current user is viewing their own profile
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user.id === actualUserId) {
                    setIsCurrentUser(true)
                }

                // Load the profile bio
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('bio')
                    .eq('id', actualUserId)
                    .single()

                if (error) throw error

                if (profile) {
                    const bioText = profile.bio || '';
                    setBio(bioText)
                    setEditedBio(bioText)
                    setCharCount(bioText.length)
                }
            } catch (error) {
                console.error('Error loading bio:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (actualUserId) {
            loadBioAndCheckUser()
        }
    }, [supabase, actualUserId])

    const handleEditBio = () => {
        setIsEditing(true)
    }

    const handleCancelEdit = () => {
        setEditedBio(bio)
        setCharCount(bio.length)
        setIsEditing(false)
        setSaveMessage(null)
    }

    const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        if (text.length <= 2000) {
            setEditedBio(text);
            setCharCount(text.length);
        }
    }

    const handleSaveBio = async () => {
        if (!actualUserId) return

        setIsSaving(true)
        setSaveMessage(null)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    bio: editedBio,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', actualUserId)

            if (error) throw error

            setBio(editedBio)
            setIsEditing(false)
            setSaveMessage({
                type: 'success',
                text: 'Биография успешно обновлена!'
            })

            // Auto-clear success message after 3 seconds
            setTimeout(() => {
                setSaveMessage(null)
            }, 3000)
        } catch (error) {
            console.error('Error saving bio:', error)
            setSaveMessage({
                type: 'error',
                text: 'Не удалось сохранить изменения. Пожалуйста, попробуйте снова.'
            })
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

    if (notFound) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-3xl font-bold text-red-600 mb-4">Профиль не найден</h1>
                <p className="text-lg text-gray-600">
                    Пользователь с указанным идентификатором не существует.
                </p>
            </div>
        )
    }

    return (
        <div>
            {actualUserId && <ProfileHeader userId={actualUserId} />}

            <div className="max-w-4xl mx-auto px-4 py-2">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className=" text-2xl font-bold text-gray-900 flex-1 text-center">Биография</h1>
                        {isCurrentUser && !isEditing && (
                            <button
                                onClick={handleEditBio}
                                className="px-4 py-2 bg-[#3d82f7] text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-sm"
                            >
                                Редактировать
                            </button>
                        )}
                    </div>

                    {/* Notification message */}
                    {saveMessage && (
                        <div className={`p-3 rounded-md mb-4 ${saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {saveMessage.text}
                        </div>
                    )}

                    <div className="prose max-w-none">
                        {isEditing ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editedBio}
                                    onChange={handleBioChange}
                                    rows={8}
                                    maxLength={2000}
                                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                                    placeholder="Расскажите о себе..."
                                ></textarea>

                                <div className="flex justify-between items-center">
                                    <div className={`text-sm ${charCount > 1800 ? 'text-orange-500' : 'text-gray-500'} ${charCount === 2000 ? 'text-red-500 font-bold' : ''}`}>
                                        {charCount} / 2000 символов
                                    </div>
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={isSaving}
                                            className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm"
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            onClick={handleSaveBio}
                                            disabled={isSaving}
                                            className="cursor-pointer px-4 py-2 bg-[#3d82f7] text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-sm flex items-center space-x-1"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Сохранение...</span>
                                                </>
                                            ) : (
                                                <span>Сохранить</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    URLs будут автоматически преобразованы в кликабельные ссылки.
                                </p>
                            </div>
                        ) : (
                            bio ? (
                                <div className="whitespace-pre-wrap text-gray-700 break-words rounded-md bg-gray-50 p-4 border border-gray-200">
                                    {formatBioWithLinks(bio)}
                                    {/* {bio.length > 0 && (
                                        <div className="mt-2 text-xs text-gray-500 text-right">
                                            {bio.length} / 2000 символов
                                        </div>
                                    )} */}
                                </div>
                            ) : (
                                <div className="text-gray-500 italic rounded-md bg-gray-50 p-4 border border-gray-200">
                                    {isCurrentUser
                                        ? "Вы еще не заполнили свою биографию. Нажмите 'Редактировать' чтобы добавить информацию о себе."
                                        : "Биография пока не заполнена"}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}