import React from 'react';
import { modal, typography, button } from '../styles/theme';

interface ScheduleSuggestionModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isOnline: boolean;
}

export const ScheduleSuggestionModal: React.FC<ScheduleSuggestionModalProps> = ({ isOpen, onAccept, onDecline, isOnline }) => {
  if (!isOpen) return null;

  return (
    <div className={modal.backdrop}>
      <div 
        className={`${modal.container} max-w-md`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestion-title"
        aria-describedby="suggestion-message"
      >
        <div className="flex items-start gap-4">
             <div className="flex-shrink-0 h-12 w-12 bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            </div>
            <div>
                <h2 id="suggestion-title" className="text-xl font-bold text-white mb-3">AI Coach Suggestion</h2>
                <p id="suggestion-message" className={`${typography.pMuted} mb-6`}>
                    You're making great progress! To continue this momentum, would you consider adding an extra workout day to your next weekly plan?
                </p>
            </div>
        </div>
        <div className="flex justify-end gap-4">
          <button onClick={onDecline} disabled={!isOnline} className={button.secondarySmall}>
            No, thanks
          </button>
          <button onClick={onAccept} disabled={!isOnline} className={`${button.primarySmall.replace('w-full', '')} !py-2 !px-5`}>
            Yes, add a day
          </button>
        </div>
      </div>
    </div>
  );
};