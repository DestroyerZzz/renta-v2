'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/types/database'
import SupabaseImage from '../ui/SupabaseImage'
import { Tag, Share, AlertCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase'
import toast from 'react-hot-toast'
import ShareDialog from '../ui/ShareDialog'

type Product = Database['public']['Tables']['products']['Row']

interface ReadOnlyProductCardProps {
  product: Product
  onTagClick?: (tag: string) => void
}

export const DEFAULT_TAG = 'разное'
const MAX_DESCRIPTION_LENGTH = 50

export default function ReadOnlyProductCard({ product, onTagClick }: ReadOnlyProductCardProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (product.image_url) {
      const img = new Image();
      img.src = product.image_url;
      img.onload = () => setIsImageLoaded(true);
    }
  }, [product.image_url]);

  const getDisplayTag = () => {
    const tag = product.tag || DEFAULT_TAG;
    return tag.startsWith('#') ? tag.substring(1) : tag;
  }

  const handleTagClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTagClick) {
      onTagClick(product.tag || DEFAULT_TAG);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareDialog(true);
  };

  const handleShare = async (section: 'left' | 'right') => {
    setIsSharing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // User is not logged in - show redirect toast
        toast.error(
          <div className="flex flex-col">
            <span className="font-medium">Необходимо войти в систему</span>
            <span className="text-sm">Войдите, чтобы добавить интерес в свою коллекцию</span>
            <button
              className="mt-2 px-4 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              Перейти к странице входа
            </button>
          </div>,
          { duration: 5000 }
        );
        return;
      }
      
      // First check if the product already exists in the selected section
      const { data: existingInSection, error: sectionCheckError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('display_section', section)
        .ilike('title', product.title || '')
        .limit(1);
        
      if (sectionCheckError) {
        throw new Error(`Error checking for duplicates: ${sectionCheckError.message}`);
      }
      
      // If product exists in this section, show error and stop
      if (existingInSection && existingInSection.length > 0) {
        toast.error(
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Дублирующийся Интерес</span>
              <p className="text-sm mt-1">
                Интерес с таким названием уже существует в разделе &quot;{section === 'left' ? 'Нравится' : 'Не Нравится'}&quot;.
              </p>
            </div>
          </div>,
          { duration: 5000 }
        );
        return;
      }
      
      // Then check if the product exists in the other section
      const otherSection = section === 'left' ? 'right' : 'left';
      const { data: existingInOtherSection, error: otherSectionCheckError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('display_section', otherSection)
        .ilike('title', product.title || '')
        .limit(1);
        
      if (otherSectionCheckError) {
        throw new Error(`Error checking for duplicates: ${otherSectionCheckError.message}`);
      }
      
      // If product exists in other section, show warning toast with action buttons
      if (existingInOtherSection && existingInOtherSection.length > 0) {
        const otherSectionName = otherSection === 'left' ? 'Нравится' : 'Не Нравится';
        const currentSectionName = section === 'left' ? 'Нравится' : 'Не Нравится';
        
        toast.custom((t) => (
          <div 
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden`}
          >
            <div className="p-4 w-full">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Дублирующийся Интерес
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Этот интерес уже существует в разделе &quot;{otherSectionName}&quot;. Хотите переместить его в &quot;{currentSectionName}&quot;?
                  </p>
                  <div className="mt-3 flex space-x-3">
                    <button
                      onClick={async () => {
                        toast.dismiss(t.id);
                        
                        // Delete from other section
                        const { error: deleteError } = await supabase
                          .from('products')
                          .delete()
                          .eq('id', existingInOtherSection[0].id);
                          
                        if (deleteError) {
                          toast.error("Ошибка при удалении существующего интереса");
                          return;
                        }
                        
                        // Create new product in selected section
                        const newProduct = {
                          title: product.title,
                          description: product.description,
                          tag: product.tag,
                          image_url: product.image_url,
                          display_section: section,
                          user_id: user.id
                        };
                        
                        const { error: insertError } = await supabase
                          .from('products')
                          .insert(newProduct);
                          
                        if (insertError) {
                          toast.error("Ошибка при добавлении интереса");
                          return;
                        }
                        
                        toast.success(`Интерес успешно перемещен в раздел "${currentSectionName}".`);
                      }}
                      className="cursor-pointer inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none"
                    >
                      Да, переместить
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="cursor-pointer inline-flex justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ), { duration: 15000 });
        
        // Exit without adding - will be handled by the toast action if user confirms
        return;
      }
      
      // Create a copy of the product for the current user
      const newProduct = {
        title: product.title,
        description: product.description,
        tag: product.tag,
        image_url: product.image_url,
        display_section: section,
        user_id: user.id
      };
      
      // Insert the product into the user's collection
      const { error } = await supabase
        .from('products')
        .insert(newProduct)
        .select();
        
      if (error) {
        console.error('Error sharing product:', error);
        toast.error('Произошла ошибка при добавлении интереса в вашу коллекцию.');
        return;
      }
      
      toast.success(`Интерес успешно добавлен в раздел "${section === 'left' ? 'Нравится' : 'Не Нравится'}".`);
    } catch (error) {
      console.error('Error in share process:', error);
      toast.error('Произошла ошибка при добавлении интереса.');
    } finally {
      setShowShareDialog(false);
      setIsSharing(false);
    }
  };

  const description = product.description || 'Нет описания'
  const isDescriptionLong = description.length > MAX_DESCRIPTION_LENGTH

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-xl hover:border-indigo-200 group relative">
      {/* Add share button to the top right of the card */}
      <button
        onClick={handleShareClick}
        className="cursor-pointer absolute top-2 right-2 z-10 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-md transition-all duration-200 transform hover:scale-110 focus:outline-none"
        aria-label="Поделиться"
        title="Поделиться интересом"
      >
        <Share size={16} className="text-[#3d82f7]" />
      </button>

      <div className="flex flex-col">
        <div className="flex">
          <div className="flex items-start justify-center w-[100px] h-[100px] sm:w-[130px] sm:h-[130px] md:w-[150px] md:h-[150px] flex-shrink-0 p-2">
            <div className="relative w-full h-full border border-gray-200 rounded-md overflow-hidden bg-white group-hover:border-indigo-200 transition-colors duration-300">
              {product.image_url ? (
                <SupabaseImage 
                  src={product.image_url} 
                  alt={product.title || description.substring(0, 30) || 'Изображение интереса'} 
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    isImageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  fill={true}
                  fallback={
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 animate-pulse">
                      <p className="text-gray-500 text-xs sm:text-sm">Ошибка загрузки</p>
                    </div>
                  }
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 transition-colors duration-300 group-hover:bg-gray-50">
                  <p className="text-gray-500 text-xs sm:text-sm group-hover:text-[#3d82f7] transition-colors duration-300">Нет изображения</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-2 sm:p-3 md:p-4 flex-1 flex flex-col min-w-0">
            {product.title && (
              <h3 className="font-medium text-gray-800 text-xs sm:text-sm md:text-base mb-1 break-words line-clamp-2">
                {product.title}
              </h3>
            )}
            
            <div className="mb-2 sm:mb-3 flex-grow">
              <p className={`text-gray-700 text-xs sm:text-sm md:text-base break-words transition-all duration-300 ${
                !showFullDescription ? 'line-clamp-2 sm:line-clamp-2' : ''
              } group-hover:text-gray-900`}>
                {description}
              </p>
              
              {isDescriptionLong && (
                <button 
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="cursor-pointer text-xs text-[#3d82f7] hover:text-[#2d6ce0] mt-1 transition-all duration-200 hover:underline focus:outline-none"
                >
                  {showFullDescription ? 'Показать меньше' : 'Показать больше'}
                </button>
              )}
            </div>
            
            <div className="flex justify-between items-center py-1 sm:py-2 border-t border-gray-100 group-hover:border-indigo-50 transition-colors duration-300">
              <button
                onClick={handleTagClick}
                className="cursor-pointer text-xs font-medium text-[#3d82f7] hover:text-[#2d6ce0] hover:underline focus:outline-none transition-all duration-200 transform hover:translate-x-1 flex items-center gap-1"
              >
                <Tag size={12} />
                <span className="md:inline">{`#${getDisplayTag()}`}</span>
              </button>
              <div className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors duration-300">
                {new Date(product.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showShareDialog && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          onShare={handleShare}
          isLoading={isSharing}
          productTitle={product.title || 'Интерес без названия'}
        />
      )}
    </div>
  )
}