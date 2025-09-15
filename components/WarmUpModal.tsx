import React, { useState, useEffect } from 'react';
import { DayWorkout, WarmUpExercise } from '../types.ts';
import { generateWarmUp, getAlternativeWarmUpExercise } from '../services/geminiService.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { modal, typography, button, spinner } from '../styles/theme.ts';

interface WarmUpModalProps {
  workout: DayWorkout | null;
  onClose: () => void;
  onStartWorkout: (workout: DayWorkout) => void;
}

const SwapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);


export const WarmUpModal: React.FC<WarmUpModalProps> = ({ workout, onClose, onStartWorkout }) => {
  const [warmUpRoutine, setWarmUpRoutine] = useState<WarmUpExercise[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (workout && isOnline) {
      setIsLoading(true);
      setError('');
      setWarmUpRoutine(null);
      generateWarmUp(workout)
        .then(setWarmUpRoutine)
        .catch(() => setError('Could not generate a warm-up. You can skip it and start your workout directly.'))
        .finally(() => setIsLoading(false));
    } else if (workout && !isOnline) {
        setError('You are offline. A warm-up cannot be generated. You can start your workout directly.');
    }
  }, [workout, isOnline]);

  if (!workout) return null;

  const handleStart = () => {
    onStartWorkout(workout);
    onClose();
  };
  
  const handleSwapExercise = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // Prevent accordion from toggling
    if (swappingIndex !== null || !warmUpRoutine || !isOnline) return;

    setSwappingIndex(index);
    try {
        const alternative = await getAlternativeWarmUpExercise(warmUpRoutine[index], warmUpRoutine);
        setWarmUpRoutine(currentRoutine => {
            if (!currentRoutine) return null;
            const newRoutine = [...currentRoutine];
            newRoutine[index] = alternative;
            return newRoutine;
        });
    } catch (err) {
        // In a real app, you might show a toast notification here.
        console.error("Failed to swap exercise");
    } finally {
        setSwappingIndex(null);
    }
  };

  const toggleInstructions = (index: number) => {
    setExpandedIndex(prevIndex => (prevIndex === index ? null : index));
  };

  return (
    <div className={modal.backdrop} onClick={onClose}>
      <div className={modal.container} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="warmup-modal-title">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 id="warmup-modal-title" className={typography.h2.replace('sm:text-4xl', 'sm:text-3xl')}>AI Warm-up</h2>
            <p className={typography.pMuted}>For: {workout.day} - {workout.goal}</p>
          </div>
          <button onClick={onClose} className={modal.closeButton} aria-label="Close warm-up modal">&times;</button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
          {isLoading && (
            <div className="flex justify-center items-center h-48">
              <svg className={`${spinner} h-8 w-8 text-indigo-400`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          {error && <p className="text-amber-300 text-center py-8">{error}</p>}
          {warmUpRoutine && (
            <>
              <p className={`${typography.pMuted} text-sm mb-4`}>A science-based routine to prepare you for your workout. Tap any exercise to see instructions.</p>
              {warmUpRoutine.map((item, index) => {
                const isExpanded = expandedIndex === index;
                const instructionId = `warmup-instruction-${index}`;
                return (
                  <div key={index} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <button 
                        onClick={() => toggleInstructions(index)} 
                        className="w-full text-left p-4 flex justify-between items-center"
                        aria-expanded={isExpanded}
                        aria-controls={instructionId}
                    >
                        <div>
                            <span className="font-semibold text-white">{item.name}</span>
                            <span className="text-indigo-400 font-mono ml-4">{item.duration}</span>
                        </div>
                        <div className="flex items-center gap-4">
                             <button
                                onClick={(e) => handleSwapExercise(e, index)}
                                disabled={swappingIndex !== null || !isOnline}
                                aria-label={`Get alternative for ${item.name}`}
                                title={isOnline ? "Get alternative" : "Connect to get alternative"}
                                className="text-slate-400 hover:text-white disabled:opacity-50 p-1 rounded-full hover:bg-slate-700"
                             >
                                {swappingIndex === index ? (
                                    <svg className={`${spinner} h-4 w-4`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <SwapIcon />
                                )}
                            </button>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>
                    {isExpanded && (
                        <div id={instructionId} className="px-4 pb-4 animate-fade-in">
                           <p className="text-slate-300 text-sm whitespace-pre-line">{item.instructions}</p>
                        </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-4">
          <button onClick={handleStart} className={`${button.primarySmall} w-full sm:w-auto`}>
            Start Workout
          </button>
          {warmUpRoutine && (
            <button onClick={handleStart} className={`${button.secondary} w-full sm:w-auto`}>
              Skip Warm-up
            </button>
          )}
        </div>
      </div>
    </div>
  );
};