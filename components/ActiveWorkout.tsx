

import React, { useState, useEffect } from 'react';
import { DayWorkout, WorkoutSession, PerformedExercise, PerformedSet, Exercise, Preferences } from '../types.ts';
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
  /** Callback function when the entire workout session is completed. */
  onWorkoutComplete: (session: WorkoutSession) => void;
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

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ workout, history, preferences, onWorkoutComplete, onCancel, onExerciseSwap }) => {
  // --- STATE ---
  /** The current day's workout, which can be modified if an exercise is swapped. */
  const [activeDayWorkout, setActiveDayWorkout] = useState<DayWorkout>(workout);
  /** The index of the currently active exercise in the `activeDayWorkout.exercises` array. */
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  /** State to hold the user's performance data for the current session as they input it. */
  const [sessionData, setSessionData] = useState<
    (Omit<PerformedExercise, 'sets'> & {
      sets: ({ reps: string; weight?: string })[];
    })[]
  >([]);
  
  const [isResting, setIsResting] = useState(false);
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
  const currentExercise = activeDayWorkout.exercises[currentExerciseIndex];
  const { time, startTimer, stopTimer, resetTimer } = useTimer(currentExercise.rest);
  
  /** Finds the entire last performance record for the current exercise from history. */
  const previousPerformance = history
      .slice()
      .reverse()
      .flatMap(s => s.exercises)
      .find(e => e.exerciseName === currentExercise.name);
  
  const lastPerformedSet = previousPerformance?.sets?.slice(-1)[0];
  const lastPerformedSetCount = previousPerformance?.sets?.length;

  // --- EFFECTS ---

  // Initialize or re-initialize the session data structure whenever the workout plan changes (e.g., on load or exercise swap).
  useEffect(() => {
    setSessionData(
      activeDayWorkout.exercises.map(ex => ({
        exerciseName: ex.name,
        sets: Array.from({ length: parseInt(ex.sets, 10) }, () => ({ reps: '', weight: '' })),
        effort: undefined,
      }))
    );
  }, [activeDayWorkout]);
  
  // Reset state when moving to a new exercise.
  useEffect(() => {
    resetTimer(currentExercise.rest);
    setShowDescription(false);
    setDescription('');
    setAlternatives([]);
  }, [currentExerciseIndex, currentExercise, resetTimer]);

  const allSetsCompleted = sessionData[currentExerciseIndex]?.sets.every(s => s.reps);

  // --- HANDLERS ---

  /** Updates the sessionData state when the user types in a rep or weight input field. */
  const handleSetChange = (setIndex: number, field: 'reps' | 'weight', value: string) => {
    setSessionData(prev => {
        const updated = [...prev];
        const exerciseData = { ...updated[currentExerciseIndex] };
        const setData = { ...exerciseData.sets[setIndex] };
        
        const numericValue = value.replace(/[^0-9.]/g, '');

        if (field === 'weight') {
             setData.weight = numericValue;
             // Store the weight locally for the 'Use last' button.
             setLastWeight(lw => ({...lw, [currentExercise.name]: numericValue}));
        } else {
             setData.reps = numericValue;
        }

        exerciseData.sets[setIndex] = setData;
        updated[currentExerciseIndex] = exerciseData;
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

    // 2. Update the local workout state for this session.
    setActiveDayWorkout(currentWorkout => {
        const newExercises = [...currentWorkout.exercises];
        newExercises[currentExerciseIndex] = newExercise;
        return { ...currentWorkout, exercises: newExercises };
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
    if (currentExerciseIndex < activeDayWorkout.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      handleFinishWorkout();
    }
  };

  /** Compiles the session data and calls the onWorkoutComplete callback. */
  const handleFinishWorkout = () => {
    const finalSession: WorkoutSession = {
      date: new Date().toISOString(),
      day: activeDayWorkout.day,
      exercises: sessionData
        .map((ex, index) => ({
          ...ex,
          exerciseName: activeDayWorkout.exercises[index].name, // Ensure latest name is used after a swap.
          sets: ex.sets
            .filter(s => s.reps && String(s.reps).trim() !== '') // Ensure set was actually performed.
            .map(s => ({
              reps: parseInt(String(s.reps), 10),
              weight: s.weight && String(s.weight).trim() !== '' ? parseFloat(String(s.weight)) : undefined
            }))
        }))
        .filter(ex => ex.sets.length > 0) // Only include exercises with completed sets.
    };
    onWorkoutComplete(finalSession);
  };
  
  /** Called when a user marks a set as complete, starting the rest timer. */
  const handleSetCompleted = (setIndex: number) => {
      // Don't start a rest timer after the last set.
      if (setIndex < parseInt(currentExercise.sets, 10) - 1) {
          setIsResting(true);
          startTimer(currentExercise.rest);
      }
  };

  /** Saves the user's effort feedback and automatically moves to the next exercise. */
  const handleEffortSelect = (effort: 'Easy' | 'Good' | 'Hard') => {
     setSessionData(prev => {
        const updated = [...prev];
        updated[currentExerciseIndex].effort = effort;
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
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col justify-center items-center text-center p-6 animate-fade-in z-50">
            <h2 className="text-3xl font-bold text-slate-300 mb-4">Rest</h2>
            <p className="text-8xl font-mono font-extrabold text-indigo-400 mb-8">{formatTime(time)}</p>
            <div className="space-x-4">
              <button onClick={() => { setIsResting(false); stopTimer(); }} className={button.secondary}>
                  Skip Rest
              </button>
               <button onClick={handleNextExercise} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-8 rounded-lg">
                  Next Exercise
              </button>
            </div>
             <p className={`${typography.pMuted} mt-12`}>Next up: {activeDayWorkout.exercises[currentExerciseIndex + 1]?.name || 'Final Exercise'}</p>
        </div>
    )
  }

  // Render the main active workout screen.
  return (
    <div className={layout.container}>
        <div className="flex justify-between items-start mb-2 gap-4">
            <div>
                 <h1 className={typography.h1.replace('md:text-6xl', 'md:text-5xl')}>{currentExercise.name}</h1>
                 <p className={typography.pMuted}>Exercise {currentExerciseIndex + 1} of {activeDayWorkout.exercises.length}</p>
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

        <div className="mb-6 flex gap-4">
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
                                    value={sessionData[currentExerciseIndex]?.sets[i]?.weight || ''}
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
                                value={sessionData[currentExerciseIndex]?.sets[i]?.reps || ''}
                                onChange={(e) => handleSetChange(i, 'reps', e.target.value)}
                                className={form.textInput}
                            />
                        </div>
                        <button onClick={() => handleSetCompleted(i)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 rounded-md disabled:bg-slate-500 dark:disabled:bg-slate-600" disabled={!sessionData[currentExerciseIndex]?.sets[i]?.reps}>
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
                {currentExerciseIndex === activeDayWorkout.exercises.length - 1 ? 'Finish Workout' : 'Next Exercise'}
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