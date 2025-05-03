'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Share, ThumbsUp, ThumbsDown } from 'lucide-react'

interface ShareOption {
  label: string;
  value: 'left' | 'right';
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (section: 'left' | 'right') => void;
  isLoading?: boolean;
  productTitle?: string;
}

export default function ShareDialog({
  isOpen,
  onClose,
  onShare,
  isLoading = false,
  productTitle
}: ShareDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [selectedOption, setSelectedOption] = useState<'left' | 'right'>('left');
  
  const options: ShareOption[] = [
    { label: 'Добавить в "Нравится"', value: 'left' },
    { label: 'Добавить в "Не Нравится"', value: 'right' }
  ];
  
  // Close on ESC key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      // Restore body scroll
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handleShare = () => {
    onShare(selectedOption);
  };
  
  if (!isOpen) return null;

  const dialog = (
    <div 
      className="fixed inset-0 bg-black flex items-center justify-center z-[99999] p-4 backdrop-blur-[2px]"
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white w-full max-w-md rounded-lg shadow-xl transform transition-all duration-300 scale-100 opacity-100"
        style={{ willChange: 'transform' }}
      >
        <div className="p-6">
          <div className="flex items-center mb-3">
            <Share className="h-5 w-5 text-[#3d82f7] mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Поделиться интересом
            </h3>
          </div>
          
          {productTitle && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">{productTitle}</p>
            </div>
          )}
          
          <p className="text-sm text-gray-500 mb-4">
            Выберите куда вы хотите добавить этот интерес
          </p>

          <div className="mt-4 space-y-3 text-sm text-gray-500">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => setSelectedOption(option.value)}
                className={`cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 flex items-center ${
                  selectedOption === option.value
                    ? 'border-[#3d82f7] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option.value === 'left' ? (
                  <ThumbsUp className="h-5 w-5 text-green-500 mr-3" />
                ) : (
                  <ThumbsDown className="h-5 w-5 text-red-500 mr-3" />
                )}
                <span className="text-sm font-medium">
                  {option.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>Отмена</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isLoading}
            className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#3d82f7] border border-transparent rounded-md hover:bg-[#2d6ce0] disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Share className="h-4 w-4" />
            )}
            <span>Поделиться</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render the dialog at the root level
  return createPortal(dialog, document.body);
}