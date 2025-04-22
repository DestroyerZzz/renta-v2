'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/types/database'
import SupabaseImage from '../ui/SupabaseImage'
import { Tag } from 'lucide-react'

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

  useEffect(() => {
    if (product.image_url) {
      const img = new Image();
      img.src = product.image_url;
      img.onload = () => setIsImageLoaded(true);
    }
  }, [product.image_url]);

  const getDisplayTag = () => product.tag || DEFAULT_TAG

  const handleTagClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTagClick) {
      onTagClick(getDisplayTag());
    }
  };

  const description = product.description || 'Нет описания'
  const isDescriptionLong = description.length > MAX_DESCRIPTION_LENGTH

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-xl hover:border-indigo-200 group">
      <div className="flex flex-row items-center">
        {/* Left side - Image */}
        <div className="flex items-center justify-center w-[100px] h-[100px] sm:w-[130px] sm:h-[130px] md:w-[150px] md:h-[150px] flex-shrink-0 p-2">
          <div className="relative w-full h-full border border-gray-200 rounded-md overflow-hidden bg-white group-hover:border-indigo-200 transition-colors duration-300">
            {product.image_url ? (
              <SupabaseImage 
                src={product.image_url} 
                alt={product.title || description.substring(0, 30) || 'Изображение продукта'} 
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
                <p className="text-gray-500 text-xs sm:text-sm group-hover:text-indigo-500 transition-colors duration-300">Нет изображения</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Content */}
        <div className="p-2 sm:p-3 md:p-4 flex-1 flex flex-col justify-between min-w-0">
          {/* Title at the top */}
          {product.title && (
            <h3 className="font-medium text-gray-800 text-xs sm:text-sm md:text-base mb-1 break-words line-clamp-2">
              {product.title}
            </h3>
          )}
          
          {/* Description */}
          <div className="mb-2 sm:mb-3 flex-grow">
            <p className={`text-gray-700 text-xs sm:text-sm md:text-base break-words transition-all duration-300 ${
              !showFullDescription ? 'line-clamp-2 sm:line-clamp-2' : ''
            } group-hover:text-gray-900`}>
              {description}
            </p>
            
            {isDescriptionLong && (
              <button 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-800 mt-1 transition-all duration-200 hover:underline focus:outline-none"
              >
                {showFullDescription ? 'Показать меньше' : 'Показать больше'}
              </button>
            )}
          </div>
          
          {/* Tag and date at the bottom */}
          <div className="flex justify-between items-center py-1 sm:py-2 border-t border-gray-100 group-hover:border-indigo-50 transition-colors duration-300">
            <button
              onClick={handleTagClick}
              className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none transition-all duration-200 transform hover:translate-x-1 flex items-center gap-1"
            >
              <Tag size={12} />
              #{getDisplayTag()}
            </button>
            <div className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors duration-300">
              {new Date(product.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}