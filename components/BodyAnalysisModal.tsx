import React, { useState, useRef, useEffect } from 'react';
import { analyzeBodyComposition } from '../services/geminiService';
import { modal, button, notice, typography } from '../styles/theme';

interface BodyAnalysisModalProps {
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** Callback to close the modal. */
  onClose: () => void;
  /** Callback that returns the AI-generated analysis result text. */
  onAnalysisComplete: (result: string) => void;
}

/**
 * A helper function to convert a File object to a Base64 encoded string.
 * This is required for sending image data to the Gemini API.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 string.
 */
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            // Remove the "data:mime/type;base64," prefix.
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error('Failed to read file as base64 string.'));
        }
    };
    reader.onerror = error => reject(error);
});

export const BodyAnalysisModal: React.FC<BodyAnalysisModalProps> = ({ isOpen, onClose, onAnalysisComplete }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to reset the modal's state when it is closed.
    useEffect(() => {
        if (!isOpen) {
            setSelectedFile(null);
            setPreviewUrl(null);
            setError('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Basic client-side validation for image type and size.
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file (JPEG, PNG, etc.).');
                return;
            }
            // The Gemini 1.5 Flash model has a limit for inline data. 4MB is a safe buffer.
            if (file.size > 4 * 1024 * 1024) { 
                setError('Image size should be less than 4MB.');
                return;
            }

            setSelectedFile(file);
            // Create a temporary URL for image preview.
            if (previewUrl) URL.revokeObjectURL(previewUrl); // Clean up previous URL
            setPreviewUrl(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError('Please select a file first.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const base64Data = await toBase64(selectedFile);
            const result = await analyzeBodyComposition(base64Data, selectedFile.type);
            onAnalysisComplete(result);
            onClose(); // Close the modal on success.
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during analysis.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // The component is now controlled by the `isOpen` prop from its parent.
    if (!isOpen) {
        return null;
    }

    return (
        <div className={modal.backdrop} onClick={onClose}>
            <div className={`${modal.containerLarge.replace('p-6', '')} flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="analysis-modal-title">
                <div className="flex justify-between items-start p-6 pb-4 flex-shrink-0">
                    <h2 id="analysis-modal-title" className={typography.h2.replace('sm:text-3xl', '')}>AI Body Composition Analysis</h2>
                    <button onClick={onClose} className={modal.closeButton} aria-label="Close analysis modal">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto px-6 pb-6">
                    <p className={`${notice.warning} mb-4 !text-sm`}>
                        <strong>Disclaimer:</strong> This is an experimental AI feature for informational purposes only and is not medical advice. For best results, use a clear, full-body photo in a well-lit environment.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className={`${button.secondary} w-full !py-3 mb-4`}>
                                {selectedFile ? 'Change Image' : 'Select Image'}
                            </button>

                            <div className="w-full h-80 bg-slate-800 rounded-lg flex items-center justify-center p-2">
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-center border-2 border-dashed border-slate-700 rounded-lg p-4">
                                        Select an image to see a preview.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <button onClick={handleSubmit} disabled={!selectedFile || isLoading} className={`${button.primary.replace('text-lg', '')} bg-sky-600 hover:bg-sky-700`}>
                                {isLoading ? 'Analyzing...' : 'Analyze Image'}
                            </button>

                            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};