import imageCompression from 'browser-image-compression';

/**
 * Configuration options for image optimization
 */
export interface ImageOptimizationOptions {
    /**
     * Maximum width in pixels for the optimized image
     */
    maxWidthOrHeight?: number;

    /**
     * Maximum size in MB for the optimized image
     */
    maxSizeMB?: number;

    /**
     * Image quality (0 to 1), where 1 is highest quality
     */
    quality?: number;

    /**
     * Should the image be converted to use WebP format if browser supports it
     */
    useWebP?: boolean;

    /**
     * Show optimization progress in the console (for debugging)
     */
    debug?: boolean;

    /**
     * Function to track progress during optimization
     * @param progress - Number between 0 and 100
     */
    onProgress?: (progress: number) => void;
}

/**
 * Default image optimization options
 */
export const defaultOptions: ImageOptimizationOptions = {
    maxWidthOrHeight: 1920,
    maxSizeMB: 1,
    quality: 0.8,
    useWebP: true,
    debug: false,
    onProgress: undefined,
};

/**
 * Function to check if WebP is supported in the current browser
 * @returns {boolean} True if WebP is supported
 */
export const isWebPSupported = (): boolean => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    if (!canvas || !canvas.toDataURL) return false;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

/**
 * Optimizes an image for efficient storage and upload
 * 
 * @param {File} imageFile - The original image file to be optimized
 * @param {ImageOptimizationOptions} customOptions - Override default options
 * @returns {Promise<File>} - A promise that resolves to the optimized image file
 */
export const optimizeImage = async (
    imageFile: File,
    customOptions?: Partial<ImageOptimizationOptions>
): Promise<File> => {
    // Check if the input is valid
    if (!imageFile || !(imageFile instanceof File)) {
        throw new Error('Invalid image file provided');
    }

    // Merge default options with custom options
    const options = { ...defaultOptions, ...customOptions };

    // Initialize progress tracking
    const updateProgress = (progress: number) => {
        if (options.onProgress) {
            options.onProgress(Math.min(Math.round(progress), 100));
        }
    };

    // Start with 5% progress to indicate we've begun
    updateProgress(5);

    // Always log original file size in KB for debugging
    const originalSize = imageFile.size / 1024;
    console.log(`Original: ${originalSize.toFixed(2)} KB`);

    // Only skip tiny images (less than 50KB) since most images benefit from optimization
    if (imageFile.size <= 50 * 1024) {
        if (options.debug) {
            console.log('Image is very small, skipping optimization', imageFile.name);
        }
        console.log(`Optimized: ${originalSize.toFixed(2)} KB (skipped - already small)`);
        // Even if we skip optimization, show 100% progress
        updateProgress(100);
        return imageFile;
    } try {
        // Ensure we're using the correct MIME type
        const fileType = imageFile.type || 'image/jpeg';

        // Update progress - preparing for compression
        updateProgress(15);

        // Use browser-image-compression library for optimization
        // Add more aggressive compression parameters
        const compressionOptions = {
            maxSizeMB: options.maxSizeMB,
            maxWidthOrHeight: options.maxWidthOrHeight,
            useWebWorker: true,
            initialQuality: options.quality,
            // Add more options for better compression
            fileType,
            alwaysKeepResolution: false, // Allow resizing if needed
            exifOrientation: 1, // Fix orientation issues
            onProgress: (progress: number) => {
                // Map library's 0-100 progress to our 15-65 range
                const mappedProgress = 15 + (progress * 0.5);
                updateProgress(mappedProgress);
            }
        };

        // Determine if we should use WebP
        const useWebP = options.useWebP && isWebPSupported();

        // Compress the image (force compression even for small images)
        let compressedFile = await imageCompression(imageFile, compressionOptions);

        // Update progress - compression done, preparing for WebP conversion if needed
        updateProgress(70);

        // If compression made the file larger (which can happen with already optimized images),
        // use the original instead
        if (compressedFile.size > imageFile.size) {
            compressedFile = imageFile;
        }

        let finalFile = compressedFile;
        let finalSize = compressedFile.size / 1024;

        // If WebP is supported and enabled, convert to WebP format
        if (useWebP && !fileType.includes('webp')) {
            updateProgress(75);
            try {
                const compressedBlob = await convertToWebP(compressedFile, options.quality!);
                updateProgress(85);
                const webpFile = new File(
                    [compressedBlob],
                    // Change extension to .webp if not already
                    imageFile.name.replace(/\.[^/.]+$/, '.webp'),
                    { type: 'image/webp' }
                );

                // Only use WebP if it's actually smaller
                if (webpFile.size < compressedFile.size) {
                    finalFile = webpFile;
                    finalSize = webpFile.size / 1024;
                }
                updateProgress(90);
            } catch (webpError) {
                console.warn('WebP conversion failed, using standard compression:', webpError);
            }
        }

        // Always log the final result
        const compressionPercent = ((1 - (finalFile.size / imageFile.size)) * 100).toFixed(1);
        console.log(`Optimized: ${finalSize.toFixed(2)} KB (${compressionPercent}% reduction)`);

        if (options.debug) {
            console.log('Original format:', fileType);
            console.log('Final format:', finalFile.type);
            console.log('Original dimensions:', await getImageDimensions(imageFile));
            console.log('Final dimensions:', await getImageDimensions(finalFile));
        }

        // Final progress update
        updateProgress(100);
        return finalFile;
    } catch (error) {
        console.error('Error optimizing image:', error);
        // Report 100% progress even on error, to ensure UI doesn't hang
        updateProgress(100);
        // Return the original file as a fallback if compression fails
        console.log(`Optimization failed, using original: ${originalSize.toFixed(2)} KB`);
        return imageFile;
    }
};

/**
 * Helper function to get the dimensions of an image file
 * 
 * @param {File} file - The image file
 * @returns {Promise<{width: number, height: number}>} - A promise that resolves to the image dimensions
 */
const getImageDimensions = async (file: File): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({
                width: img.width,
                height: img.height
            });
            URL.revokeObjectURL(img.src); // Clean up
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for dimension detection'));
            URL.revokeObjectURL(img.src); // Clean up
        };
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Helper function to convert an image file to WebP format
 * 
 * @param {File} file - The image file to convert
 * @param {number} quality - The quality of the WebP image (0 to 1)
 * @returns {Promise<Blob>} - A promise that resolves to the WebP blob
 */
const convertToWebP = async (file: File, quality: number): Promise<Blob> => {
    try {
        // Create an object URL from the file
        const bitmap = await createImageBitmap(file);

        // Create a canvas element to draw the image
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        // Draw the image on the canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not available');

        // Use a white background for transparent images to prevent alpha channel issues
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the image
        ctx.drawImage(bitmap, 0, 0);

        // Convert to WebP with a more reliable approach
        return new Promise((resolve, reject) => {
            try {
                // First attempt with specified quality
                canvas.toBlob(blob => {
                    if (blob && blob.size > 0) {
                        resolve(blob);
                    } else {
                        // Fallback to JPEG if WebP fails
                        canvas.toBlob(jpegBlob => {
                            if (jpegBlob) {
                                resolve(jpegBlob);
                            } else {
                                reject(new Error('Failed to convert image to any compressed format'));
                            }
                        }, 'image/jpeg', quality);
                    }
                }, 'image/webp', quality);
            } catch (e) {
                reject(new Error(`WebP conversion error: ${e}`));
            }
        });
    } catch (error) {
        console.error('Error in WebP conversion:', error);
        throw error;
    }
};

export default optimizeImage;
