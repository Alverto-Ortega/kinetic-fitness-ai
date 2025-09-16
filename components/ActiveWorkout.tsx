import React, { useState, useEffect, useCallback } from 'react';
import { DayWorkout, WorkoutSession, PerformedExercise, PerformedSet, Exercise, Preferences, ActiveSessionData } from '../types.ts';
import { useTimer } from '../hooks/useTimer.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { getExerciseDescription, getAlternativeExercises } from '../services/geminiService.ts';
import { AlternativeExercisesModal } from './AlternativeExercisesModal.tsx';
import { typography, form, button, card, layout } from '../styles/theme.ts';

interface ActiveWorkoutProps {
  /** The workout object for the current session. */
  workout: DayWorkout;
  /** The user's entire workout history, used for context (e.g., last performed weight). */
  history: WorkoutSession[];
  /** The user's preferences, needed for generating alternative exercises. */
  preferences: Preferences | null;
  /** The current exercise index, managed by the parent. */
  exerciseIndex: number;
  /** The session data, managed by the parent for persistence. */
  sessionData: ActiveSessionData;
  /** Callback to update the session data state in the parent. */
  setSessionData: React.Dispatch<React.SetStateAction<ActiveSessionData | null>>;
  /** Callback to update the current exercise index in the parent. */
  setExerciseIndex: React.Dispatch<React.SetStateAction<number>>;
  /** Callback function when the entire workout session is completed. */
  onWorkoutComplete: (session: Omit<WorkoutSession, 'duration'>) => void;
  /** Callback to cancel the workout and return to the dashboard. */
  onCancel: () => void;
  /** Callback to replace an exercise in the master plan state. */
  onExerciseSwap: (day: string, originalExerciseName: string, newExercise: Exercise) => void;
}

/** A utility to format seconds into a MM:SS string. */
const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const CARDIO_KEYWORDS = ['Treadmill', 'Elliptical', 'Bike', 'Boxing', 'Cardio', 'Run', 'Jogging', 'Cycling'];

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  workout,
  history,
  preferences,
  exerciseIndex,
  sessionData,
  setSessionData,
  setExerciseIndex,
  onWorkoutComplete,
  onCancel,
  onExerciseSwap,
}) => {
  // --- STATE ---
  /** The current day's workout, which can be modified if an exercise is swapped. */
  const [activeDayWorkout, setActiveDayWorkout] = useState<DayWorkout>(workout);
  const [isResting, setIsResting] = useState(false);
  /** Stores the index of the set just completed to provide context for the rest timer. */
  const [lastCompletedSetIndex, setLastCompletedSetIndex] = useState<number | null>(null);
  /** Stores the last weight used for an exercise within this session for easy re-entry. */
  const [lastWeight, setLastWeight] = useState<{ [key: string]: string }>({});

  // State for AI-fetched content (how-to guides, alternatives).
  const [description, setDescription] = useState('');
  const [isDescriptionLoading, setIsDescriptionLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
  const [isAlternativesModalOpen, setIsAlternativesModalOpen] = useState(false);

  const isOnline = useOnlineStatus();
  const currentExercise = activeDayWorkout.exercises[exerciseIndex];

  // Using useCallback to memoize the function, ensuring the timer hook doesn't re-initialize unnecessarily.
  const handleRestComplete = useCallback(() => setIsResting(false), []);
  const { time, startTimer, stopTimer, resetTimer } = useTimer(currentExercise.rest, handleRestComplete);

  /** Finds the entire last performance record for the current exercise from history. */
  const previousPerformance = history
      .slice()
      .reverse()
      .flatMap(s => s.exercises)
      .find(e => e.exerciseName === currentExercise.name);
  
  const lastPerformedSet = previousPerformance?.sets?.slice(-1)[0];
  const lastPerformedSetCount = previousPerformance?.sets?.length;

  // --- EFFECTS ---
  
  // Reset state when moving to a new exercise.
  useEffect(() => {
    resetTimer(currentExercise.rest);
    setShowDescription(false);
    setDescription('');
    setAlternatives([]);
  }, [exerciseIndex, currentExercise, resetTimer]);

  const allSetsCompleted = sessionData[exerciseIndex]?.sets.every(s => s.reps);

  // --- HANDLERS ---

  /** Updates the sessionData state when the user types in a rep or weight input field. */
  const handleSetChange = (setIndex: number, field: 'reps' | 'weight', value: string) => {
    setSessionData(prev => {
        if (!prev) return null;
        const updated = [...prev];
        const exerciseData = { ...updated[exerciseIndex] };
        const setData = { ...exerciseData.sets[setIndex] };
        
        let sanitizedValue = '';
        if (field === 'reps') {
            // For reps, allow only whole numbers. No decimals.
            sanitizedValue = value.replace(/[^0-9]/g, '');
        } else { // field === 'weight'
            // For weight, allow numbers and a single decimal point.
            // First, remove any non-digit/non-period characters.
            let cleanedValue = value.replace(/[^0-9.]/g, '');

            // Automatically prepend '0' if the user starts with a period.
            if (cleanedValue.startsWith('.')) {
                cleanedValue = '0' + cleanedValue;
            }

            // Then, ensure there's at most one period.
            const parts = cleanedValue.split('.');
            if (parts.length > 2) {
                // If there are multiple periods, reconstruct with only the first one.
                // e.g., "1.2.3" becomes "1.23"
                sanitizedValue = `${parts[0]}.${parts.slice(1).join('')}`;
            } else {
                sanitizedValue = cleanedValue;
            }
        }

        if (field === 'weight') {
             setData.weight = sanitizedValue;
             // Store the weight locally for the 'Use last' button.
             setLastWeight(lw => ({...lw, [currentExercise.name]: sanitizedValue}));
        } else {
             setData.reps = sanitizedValue;
        }

        exerciseData.sets[setIndex] = setData;
        updated[exerciseIndex] = exerciseData;
        return updated;
    });
  };

  /** Fetches and displays the "how-to" description for the current exercise. */
  const handleShowDescription = async () => {
    if (showDescription) {
        setShowDescription(false);
        return;
    }
    
    setShowDescription(true);
    // Don't re-fetch if already loaded or if offline.
    if (description || !isOnline) return; 

    setIsDescriptionLoading(true);
    try {
        const desc = await getExerciseDescription(currentExercise.name);
        setDescription(desc);
    } catch (error) {
        setDescription("Failed to load description.");
    } finally {
        setIsDescriptionLoading(false);
    }
  };

  /** Fetches and displays AI-generated alternative exercises in a modal. */
  const handleFetchAlternatives = async () => {
    if (isAlternativesModalOpen) {
        setIsAlternativesModalOpen(false);
        return;
    }

    setIsAlternativesModalOpen(true);
    if (alternatives.length > 0 || !isOnline) return;
    if (!preferences?.equipment) return;

    setIsLoadingAlternatives(true);
    try {
        const currentDayExerciseNames = activeDayWorkout.exercises.map(ex => ex.name);
        const alts = await getAlternativeExercises(currentExercise, preferences.equipment, currentDayExerciseNames);
        setAlternatives(alts);
    } finally {
        setIsLoadingAlternatives(false);
    }
  };


  /** Handles the user selecting an alternative exercise, updating both local and parent state. */
  const handleSelectAlternative = (newExercise: Exercise) => {
    const originalExerciseName = currentExercise.name;

    // 1. Update the master plan in App.tsx.
    onExerciseSwap(activeDayWorkout.day, originalExerciseName, newExercise);

    // 2. Update the local workout state for this session to update the UI.
    setActiveDayWorkout(currentWorkout => {
        const newExercises = [...currentWorkout.exercises];
        newExercises[exerciseIndex] = newExercise;
        return { ...currentWorkout, exercises: newExercises };
    });

    // 3. Manually update sessionData for the swapped exercise, preserving data for other exercises.
    setSessionData(prev => {
        if (!prev) return null;
        const updated = [...prev];
        updated[exerciseIndex] = {
            exerciseName: newExercise.name,
            sets: Array.from({ length: parseInt(newExercise.sets, 10) }, () => ({ reps: '', weight: '' })),
            effort: undefined,
        };
        return updated;
    });

    setIsAlternativesModalOpen(false);
  };

  /** Fills the weight input for a set with the last used weight. */
  const useLastWeight = (setIndex: number) => {
    const weightToUse = lastWeight[currentExercise.name] || lastPerformedSet?.weight || '';
    if (weightToUse) {
        handleSetChange(setIndex, 'weight', String(weightToUse));
    }
  };
  
  /** Moves to the next exercise or finishes the workout if it's the last one. */
  const handleNextExercise = () => {
    stopTimer();
    setIsResting(false);
    if (exerciseIndex < activeDayWorkout.exercises.length - 1) {
      setExerciseIndex(prev => prev + 1);
    } else {
      handleFinishWorkout();
    }
  };

  /** Compiles the session data and calls the onWorkoutComplete callback. */
  const handleFinishWorkout = () => {
    if (!sessionData) return;
    const finalSession: Omit<WorkoutSession, 'duration'> = {
      date: new Date().toISOString(),
      day: activeDayWorkout.day,
      exercises: sessionData
        .map(ex => ({
          ...ex,
          sets: ex.sets
            .filter(s => s.reps && String(s.reps).trim() !== '')
            .map(s => {
              const weightValue = s.weight ? parseFloat(String(s.weight)) : undefined;
              return {
                reps: parseInt(String(s.reps), 10),
                weight: (weightValue === undefined || isNaN(weightValue)) ? undefined : weightValue
              };
            })
        }))
        .filter(ex => ex.sets.length > 0)
    };
    onWorkoutComplete(finalSession);
  };
  
  /** Called when a user marks a set as complete, starting the rest timer. */
  const handleSetCompleted = (setIndex: number) => {
      // Don't start a rest timer after the last set.
      if (setIndex < parseInt(currentExercise.sets, 10) - 1) {
          setLastCompletedSetIndex(setIndex);
          setIsResting(true);
          startTimer(currentExercise.rest);
      }
  };

  /** Saves the user's effort feedback and automatically moves to the next exercise. */
  const handleEffortSelect = (effort: 'Easy' | 'Good' | 'Hard') => {
     setSessionData(prev => {
        if (!prev) return null;
        const updated = [...prev];
        updated[exerciseIndex].effort = effort;
        return updated;
     });
     // Use a short delay to provide visual feedback before moving on.
     setTimeout(handleNextExercise, 300);
  }

  // --- RENDER LOGIC ---

  const isWeightApplicable = currentExercise.suggestedWeight !== 'Bodyweight' && !CARDIO_KEYWORDS.some(keyword => currentExercise.name.toLowerCase().includes(keyword.toLowerCase()));
  const isCardio = CARDIO_KEYWORDS.some(keyword => currentExercise.name.toLowerCase().includes(keyword.toLowerCase()));

  // Render the full-screen rest timer overlay.
  if (isResting) {
    const totalSets = parseInt(currentExercise.sets, 10);
    const nextSetNumber = (lastCompletedSetIndex ?? -1) + 2; // 0-indexed + 1 for next, +1 for 1-based display
    const nextUpText = `Set ${nextSetNumber} of ${totalSets}`;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col justify-center items-center text-center p-6 animate-fade-in z-50">
            <h2 className="text-3xl font-bold text-slate-300 mb-4">Rest</h2>
            <p className="text-8xl font-mono font-extrabold text-indigo-400 mb-8">{formatTime(time)}</p>
            <button onClick={() => { stopTimer(); handleRestComplete(); }} className={button.secondary}>
                Skip Rest
            </button>
            <p className={`${typography.pMuted} mt-12`}>Next up: {nextUpText}</p>
        </div>
    )
  }

  // Render the main active workout screen.
  return (
    <div className={layout.container}>
        <div className="flex justify-between items-start mb-2 gap-4">
            <div>
                 <h1 className={typography.h1.replace('md:text-6xl', 'md:text-5xl')}>{currentExercise.name}</h1>
                 <p className={typography.pMuted}>Exercise {exerciseIndex + 1} of {activeDayWorkout.exercises.length}</p>
            </div>
            <div className="flex-shrink-0">
                <button onClick={onCancel} className={button.tertiary}>
                    Cancel Workout
                </button>
            </div>
        </div>
        
        {previousPerformance && (
            <div className="mb-4 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg inline-block">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold">
                    Last Time: {lastPerformedSetCount} sets of {lastPerformedSet?.reps} reps
                    {lastPerformedSet?.weight ? ` @ ${lastPerformedSet.weight} lbs` : ''}
                </p>
            </div>
        )}

        <div className="mb-6 flex flex-wrap gap-4 items-center">
            <button
                onClick={handleShowDescription}
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
                disabled={!isOnline && !description}
                title={!isOnline ? "Connect to internet to load descriptions" : ""}
            >
                <span>{showDescription ? 'Hide' : 'Show'} How-To</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${showDescription ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {!isCardio && (
              <button
                  onClick={handleFetchAlternatives}
                  className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
                  disabled={isLoadingAlternatives || !isOnline}
                  title={!isOnline ? "Connect to internet to swap exercises" : ""}
              >
                  {isLoadingAlternatives ? 'Loading...' : 'Swap Exercise'}
              </button>
            )}
            <button onClick={handleNextExercise} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-semibold">
                Skip Exercise &rarr;
            </button>
        </div>
        
        {showDescription && (
            <div className="mb-6 p-4 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg animate-fade-in">
                {isDescriptionLoading ? (
                    <div className="space-y-2">
                        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-full animate-pulse"></div>
                        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-4/5 animate-pulse"></div>
                    </div>
                ) : !isOnline && !description ? (
                    <p className="text-amber-700 dark:text-amber-300 text-sm">You are offline. Connect to the internet to load exercise instructions.</p>
                ) : (
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{description}</p>
                )}
            </div>
        )}
        
        <div className={card.base}>
            <div className={`grid ${isWeightApplicable ? 'grid-cols-5' : 'grid-cols-4'} gap-4 items-center font-semibold text-slate-500 dark:text-slate-400 mb-4 px-4`}>
                <span>Set</span>
                <span>Target</span>
                {isWeightApplicable && <span>Weight (lbs)</span>}
                <span>{isCardio ? 'Time' : 'Reps'}</span>
                <span></span>
            </div>
            <div className="space-y-3">
                {Array.from({ length: parseInt(currentExercise.sets, 10) }).map((_, i) => (
                    <div key={i} className={`grid ${isWeightApplicable ? 'grid-cols-5' : 'grid-cols-4'} gap-4 items-center bg-slate-100 dark:bg-slate-800 p-4 rounded-lg`}>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">{i + 1}</span>
                        <div>
                          <p className="text-slate-700 dark:text-slate-300">{currentExercise.reps} {isCardio ? '' : 'reps'}</p>
                          {currentExercise.suggestedWeight && currentExercise.suggestedWeight !== 'Bodyweight' && (
                            <p className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold mt-1">Suggests: {currentExercise.suggestedWeight}</p>
                          )}
                        </div>
                        {isWeightApplicable && (
                            <div className="relative">
                                <input
                                    type="tel"
                                    placeholder={`Last: ${lastPerformedSet?.weight || 'N/A'}`}
                                    value={sessionData[exerciseIndex]?.sets[i]?.weight || ''}
                                    onChange={(e) => handleSetChange(i, 'weight', e.target.value)}
                                    className={form.textInput}
                                />
                                {i > 0 && <button onClick={() => useLastWeight(i)} className={`absolute -bottom-5 right-0 text-xs ${button.link}`}>Use last</button>}
                            </div>
                        )}
                        <div>
                            <input
                                type="tel"
                                placeholder={currentExercise.reps.split('-')[0]}
                                value={sessionData[exerciseIndex]?.sets[i]?.reps || ''}
                                onChange={(e) => handleSetChange(i, 'reps', e.target.value)}
                                className={form.textInput}
                            />
                        </div>
                        <button onClick={() => handleSetCompleted(i)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 rounded-md disabled:bg-slate-500 dark:disabled:bg-slate-600" disabled={!sessionData[exerciseIndex]?.sets[i]?.reps}>
                            ✓
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {allSetsCompleted && (
             <div className={`mt-8 ${card.base} text-center animate-fade-in`}>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">How did that feel?</h3>
                <div className="flex justify-center gap-4">
                    <button onClick={() => handleEffortSelect('Easy')} className={`${button.effort} bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600`}>Easy</button>
                    <button onClick={() => handleEffortSelect('Good')} className={`${button.effort} bg-sky-600 hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600`}>Good</button>
                    <button onClick={() => handleEffortSelect('Hard')} className={`${button.effort} bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600`}>Hard</button>
                </div>
            </div>
        )}

        <div className="mt-8 flex justify-between items-center">
            <button onClick={handleFinishWorkout} className={button.dangerLarge}>
                End Workout
            </button>
            <button onClick={handleNextExercise} disabled={!allSetsCompleted} className={button.primary.replace('w-full', '')}>
                {exerciseIndex === activeDayWorkout.exercises.length - 1 ? 'Finish Workout' : 'Next Exercise'}
            </button>
        </div>
        
        <AlternativeExercisesModal 
            isOpen={isAlternativesModalOpen}
            onClose={() => setIsAlternativesModalOpen(false)}
            alternatives={alternatives}
            onSelect={handleSelectAlternative}
            isLoading={isLoadingAlternatives}
            originalExerciseName={currentExercise.name}
            isOnline={isOnline}
        />
    </div>
  );
};