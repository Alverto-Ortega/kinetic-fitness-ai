import React from 'react';
import { modal, button, typography } from '../styles/theme';

interface InitialAnalysisPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: () => void;
}

export const InitialAnalysisPromptModal: React.FC<InitialAnalysisPromptModalProps> = ({ isOpen, onClose, onAnalyze }) => {
  if (!isOpen) return null;

  return (
    <div className={modal.backdrop}>
      <div 
        className={`${modal.container} max-w-md text-center`} 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="initial-prompt-title"
        aria-describedby="initial-prompt-message"
      >
         <div className="flex justify-center mb-4">
            <div className="flex-shrink-0 h-16 w-16 bg-sky-900/50 rounded-full flex items-center justify-center text-sky-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        </div>

        <h2 id="initial-prompt-title" className="text-xl font-bold text-white mb-3">Let's Set Your Starting Point</h2>
        <p id="initial-prompt-message" className={`${typography.pMuted} mb-6`}>
            Your plan is ready! Before you start, we recommend uploading a "before" photo for an initial AI physique analysis. This will be the first entry in your progress log.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={onClose} className={button.secondary}>
            Maybe Later
          </button>
          <button onClick={onAnalyze} className={`${button.primary.replace('w-full', 'w-full sm:w-auto').replace('text-xl', 'text-lg')} bg-sky-600 hover:bg-sky-700`}>
            Analyze Now
          </button>
        </div>
      </div>
    </div>
  );
};