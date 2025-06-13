'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { debounce } from 'lodash'
import { AlertCircle, Check, Loader2, User, X, Mail, Lock } from 'lucide-react'
import GoogleSignInButton from './GoogleSignInButton'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Validate username format (only allow letters, numbers, underscores, and hyphens)
  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    return usernameRegex.test(username);
  };

  // Check if username exists in the database
  const checkUsernameExists = async (username: string) => {
    if (!username.trim() || username.trim().length < 3) {
      setIsUsernameAvailable(null);
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
        .limit(1);

      if (error) throw error;

      // Username is available if no matching profiles were found
      const isAvailable = !data || data.length === 0;
      setIsUsernameAvailable(isAvailable);
    } catch (err) {
      console.error('Error checking username:', err);
      // Don't block sign up if username check fails
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
  }, [username, debouncedCheckUsername]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation checks
    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов.');
      setIsLoading(false);
      return;
    }

    if (!fullName.trim()) {
      setError('Пожалуйста, введите ваше имя.');
      setIsLoading(false);
      return;
    }

    if (!username.trim() || username.trim().length < 3) {
      setError('Имя пользователя должно содержать не менее 3 символов.');
      setIsLoading(false);
      return;
    }

    if (!validateUsername(username)) {
      setError('Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы.');
      setIsLoading(false);
      return;
    }

    // Final check if username is already taken
    if (isUsernameAvailable === false) {
      setError('Это имя пользователя уже занято. Пожалуйста, выберите другое.');
      setIsLoading(false);
      return;
    }

    try {
      // Do one final check for username availability before sign-up
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .limit(1);

      if (existingUsers && existingUsers.length > 0) {
        setError('Это имя пользователя уже занято. Пожалуйста, выберите другое.');
        setIsLoading(false);
        return;
      }

      // Create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username.trim(), // Store username in auth metadata as well
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Store profile data in session storage for immediate access on profile page
        try {
          sessionStorage.setItem('userProfile', JSON.stringify({
            id: data.user.id,
            full_name: fullName.trim(),
            username: username.trim()
          }));
          // console.log('Profile data saved to session storage with ID');
        } catch (storageError) {
          console.error('Error storing profile data in session:', storageError);
        }

        // The database trigger should handle profile creation automatically
        // Let's just wait a moment to ensure the trigger has time to execute
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Now check if the profile was created (don't try to create it again)
        const { data: checkProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .eq('id', data.user.id)
          .single();

        if (checkError || !checkProfile) {
          // console.log('Profile not found yet, this is normal as it might still be creating');
        } else {
          // console.log('Profile found:', checkProfile);
        }

        // Display enhanced verification toast notification
        toast.custom(
          (t) => (
            <div
              className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-indigo-600">
                      Аккаунт успешно создан!
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      Пожалуйста, проверьте ваш email: <span className="font-medium">{email}</span> для подтверждения регистрации.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="cursor-pointer w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                >
                  Закрыть
                </button>
              </div>
            </div>
          ),
          {
            duration: 8000, // Longer duration to ensure user sees it
            position: 'top-center',
          }
        );

        // Navigate to dashboard after toast is shown
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <span>Имя пользователя доступно</span>
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Зарегистрироваться</h1>
          <p className="mt-2 text-sm text-gray-600">
            Зарегистрируйте новую учетную запись
          </p>
        </div>        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <GoogleSignInButton />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">или</span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSignUp}>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              ФИО
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-gray-400" />
              </div>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block text-black w-full pl-10 pr-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите имя"
              />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Имя пользователя
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-gray-400" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`block text-black w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isUsernameAvailable === false
                  ? 'border-red-300 bg-red-50'
                  : isUsernameAvailable === true && !usernameError
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                  }`}
                placeholder="Уникальное имя пользователя"
                minLength={3}
              />
            </div>
            {renderUsernameAvailability()}
            <p className="mt-1 text-xs text-gray-500">
              Используйте только буквы, цифры, дефисы и подчеркивания
            </p>
          </div>

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

          <div className="mt-4">
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
                className="block text-black w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Пароль (минимум 6 символов)"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isCheckingUsername || isUsernameAvailable === false}
              className="cursor-pointer flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            У вас уже есть аккаунт?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}