import React from 'react';
import { Exercise } from '../types.ts';
import { modal, typography, button, spinner } from '../styles/theme';

interface AlternativeExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  alternatives: Exercise[];
  onSelect: (exercise: Exercise) => void;
  isLoading: boolean;
  originalExerciseName: string;
  isOnline: boolean;
}

export const AlternativeExercisesModal: React.FC<AlternativeExercisesModalProps> = ({ 
    isOpen, onClose, alternatives, onSelect, isLoading, originalExerciseName, isOnline
}) => {
  if (!isOpen) return null;

  return (
    <div className={modal.backdrop} onClick={onClose}>
      <div className={modal.container} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="swap-modal-title">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 id="swap-modal-title" className={typography.h2.replace('sm:text-3xl', '')}>Swap Exercise</h2>
            <p className={typography.pMuted}>Alternatives for: {originalExerciseName}</p>
          </div>
          <button onClick={onClose} className={modal.closeButton} aria-label="Close alternative exercise modal">&times;</button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                     <svg className={`${spinner} h-8 w-8 text-indigo-400`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : alternatives.length > 0 ? (
                alternatives.map(ex => (
                    <div key={ex.name} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center gap-4">
                        <div>
                            <h3 className="font-semibold text-indigo-400">{ex.name}</h3>
                            <p className="text-sm text-slate-300 mt-1">{ex.sets} sets of {ex.reps} reps</p>
                            {ex.suggestedWeight && (
                                <p className="text-xs text-slate-400 mt-1">Suggests: {ex.suggestedWeight}</p>
                            )}
                        </div>
                        <button 
                            onClick={() => onSelect(ex)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md flex-shrink-0"
                        >
                            Select
                        </button>
                    </div>
                ))
            ) : (
                <div className="text-center py-12">
                    <p className={typography.pMuted}>{isOnline ? "Could not generate alternatives at this time." : "You are offline. Connect to generate alternatives."}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};