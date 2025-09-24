import React, { useState, useEffect, useCallback } from 'react';
import { DayWorkout, WorkoutSession, PerformedExercise, PerformedSet, Exercise, Preferences, ActiveSessionData } from '../types.ts';
import { useTimer } from '../hooks/useTimer.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { getExerciseDescription, getAlternativeExercises } from '../services/geminiService.ts';
import { parseDuration } from '../utils/workoutUtils.ts';
import { AlternativeExercisesModal } from './AlternativeExercisesModal.tsx';
import { ConfirmationModal } from './ConfirmationModal.tsx';
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

// --- Timer Visual Effect Handlers ---
const getPageContainer = () => document.getElementById('page-container');

/** Triggers a subtle, continuous pulsing flash to warn that a timer is ending. */
const triggerWarningFlash = () => {
    const el = getPageContainer();
    if (el) {
        el.classList.remove('timer-completion-flash');
        el.classList.add('timer-warning-flash');
    }
};

/** Removes the warning flash effect. */
const clearWarningFlash = () => {
    getPageContainer()?.classList.remove('timer-warning-flash');
};

/** Triggers a distinct, multi-flash effect to signal timer completion. */
const triggerCompletionFlash = () => {
    const el = getPageContainer();
    if (el) {
        el.classList.remove('timer-warning-flash');
        el.classList.add('timer-completion-flash');
        setTimeout(() => {
            el.classList.remove('timer-completion-flash');
        }, 2000); // Animation is 500ms * 4 = 2000ms
    }
};


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
  /** State for the inter-set rest timer. */
  const [isResting, setIsResting] = useState(false);
  /** State for the inter-exercise rest timer. */
  const [isRestingBetweenExercises, setIsRestingBetweenExercises] = useState(false);
  /** State for showing the full-screen exercise timer overlay. */
  const [isExerciseTimerRunning, setIsExerciseTimerRunning] = useState(false);
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
  
  // State for the duration-based exercise timer.
  const [timedSetIndex, setTimedSetIndex] = useState<number | null>(null);
  
  // State for confirmation modals.
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const isOnline = useOnlineStatus();
  const currentExercise = activeDayWorkout.exercises[exerciseIndex];

  // --- TIMERS & CORE HANDLERS ---
  
  /** Compiles the session data and calls the onWorkoutComplete callback. */
  const handleFinishWorkout = useCallback(() => {
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
  }, [sessionData, activeDayWorkout.day, onWorkoutComplete]);

  /** Contains the logic to advance to the next exercise or finish the workout. */
  const moveToNextExerciseLogic = useCallback(() => {
    setIsResting(false);
    setIsRestingBetweenExercises(false);
    if (exerciseIndex < activeDayWorkout.exercises.length - 1) {
        setExerciseIndex(prev => prev + 1);
    } else {
        handleFinishWorkout();
    }
  }, [exerciseIndex, activeDayWorkout.exercises.length, setExerciseIndex, handleFinishWorkout]);

  /** A unified callback for the timer that routes logic based on the current rest state. */
  const handleTimerComplete = useCallback(() => {
    clearWarningFlash();
    triggerCompletionFlash();
    if (isResting) {
        setIsResting(false);
    } else if (isRestingBetweenExercises) {
        moveToNextExerciseLogic();
    }
  }, [isResting, isRestingBetweenExercises, moveToNextExerciseLogic]);

  const { time, startTimer, stopTimer, resetTimer } = useTimer(0, handleTimerComplete, triggerWarningFlash, 'kinetix-rest-timer');
  
  /** Updates the sessionData state when the user types in a rep or weight input field. */
  const handleSetChange = useCallback((setIndex: number, field: 'reps' | 'weight', value: string) => {
    setSessionData(prev => {
        if (!prev) return null;
        const updated = [...prev];
        const exerciseData = { ...updated[exerciseIndex] };
        const setData = { ...exerciseData.sets[setIndex] };
        
        let sanitizedValue = '';
        if (field === 'reps') {
            sanitizedValue = value.replace(/[^0-9]/g, '');
        } else {
            let cleanedValue = value.replace(/[^0-9.]/g, '');
            if (cleanedValue.startsWith('.')) {
                cleanedValue = '0' + cleanedValue;
            }
            const parts = cleanedValue.split('.');
            sanitizedValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleanedValue;
        }

        if (field === 'weight') {
             setData.weight = sanitizedValue;
             setLastWeight(lw => ({...lw, [currentExercise.name]: sanitizedValue}));
        } else {
             setData.reps = sanitizedValue;
        }

        exerciseData.sets[setIndex] = setData;
        updated[exerciseIndex] = exerciseData;
        return updated;
    });
  }, [setSessionData, exerciseIndex, currentExercise.name]);

  /** Called when a user marks a set as complete, starting the rest timer. */
  const handleSetCompleted = useCallback((setIndex: number) => {
      if (setIndex < parseInt(currentExercise.sets, 10) - 1) {
          setLastCompletedSetIndex(setIndex);
          setIsResting(true);
          startTimer(currentExercise.rest);
      }
  }, [currentExercise.sets, currentExercise.rest, startTimer]);

  const handleExerciseTimerComplete = useCallback(() => {
    clearWarningFlash();
    triggerCompletionFlash();
    setIsExerciseTimerRunning(false);
    if (timedSetIndex === null) return;
    const durationValue = parseDuration(currentExercise.reps);
    if (durationValue) {
      handleSetChange(timedSetIndex, 'reps', String(durationValue));
    }
    handleSetCompleted(timedSetIndex);
    setTimedSetIndex(null);
  }, [timedSetIndex, currentExercise.reps, handleSetChange, handleSetCompleted]);

  const { time: exerciseTime, startTimer: startExerciseTimer, stopTimer: stopExerciseTimer, resetTimer: resetExerciseTimer } = useTimer(0, handleExerciseTimerComplete, triggerWarningFlash, 'kinetix-exercise-timer');

  /** Stops the exercise timer, logs the elapsed time, and completes the set. */
  const handleStopExerciseTimer = useCallback(() => {
      if (timedSetIndex === null) return;
      const durationValue = parseDuration(currentExercise.reps);
      if (durationValue === null) return;

      stopExerciseTimer();
      clearWarningFlash();
      setIsExerciseTimerRunning(false);
      const timeElapsed = durationValue - exerciseTime;
      const loggedTime = Math.max(0, Math.round(timeElapsed));
      handleSetChange(timedSetIndex, 'reps', String(loggedTime));
      handleSetCompleted(timedSetIndex);
      setTimedSetIndex(null);
  }, [timedSetIndex, currentExercise.reps, stopExerciseTimer, exerciseTime, handleSetChange, handleSetCompleted]);
  
  const handleStartExerciseTimer = useCallback((setIndex: number) => {
    const duration = parseDuration(currentExercise.reps);
    if (duration === null) return;

    setTimedSetIndex(setIndex);
    startExerciseTimer(duration);
    setIsExerciseTimerRunning(true);
  }, [currentExercise.reps, startExerciseTimer]);

  const previousPerformance = history
      .slice()
      .reverse()
      .flatMap(s => s.exercises)
      .find(e => e.exerciseName === currentExercise.name);
  
  const lastPerformedSet = previousPerformance?.sets?.slice(-1)[0];
  const lastPerformedSetCount = previousPerformance?.sets?.length;

  // --- EFFECTS ---
  
  useEffect(() => {
    resetTimer(currentExercise.rest);
    setShowDescription(false);
    setDescription('');
    setAlternatives([]);
    stopExerciseTimer();
    setTimedSetIndex(null);
    resetExerciseTimer(0);
    clearWarningFlash();
  }, [exerciseIndex, currentExercise, resetTimer, stopExerciseTimer, resetExerciseTimer]);

  const allSetsCompleted = sessionData[exerciseIndex]?.sets.every(s => s.reps);

  // --- HANDLERS ---

  const handleShowDescription = async () => {
    if (showDescription) {
        setShowDescription(false);
        return;
    }
    setShowDescription(true);
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

  const fetchAndShowAlternatives = async () => {
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
  
  const handleRequestSwap = () => {
    setConfirmation({
        isOpen: true,
        title: "Swap Exercise?",
        message: "Are you sure? The AI will suggest some alternatives to replace the current exercise.",
        onConfirm: fetchAndShowAlternatives,
    });
  };

  const handleSelectAlternative = (newExercise: Exercise) => {
    const originalExerciseName = currentExercise.name;
    onExerciseSwap(activeDayWorkout.day, originalExerciseName, newExercise);
    setActiveDayWorkout(currentWorkout => {
        const newExercises = [...currentWorkout.exercises];
        newExercises[exerciseIndex] = newExercise;
        return { ...currentWorkout, exercises: newExercises };
    });
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

  const useLastWeight = (setIndex: number) => {
    const weightToUse = lastWeight[currentExercise.name] || lastPerformedSet?.weight || '';
    if (weightToUse) {
        handleSetChange(setIndex, 'weight', String(weightToUse));
    }
  };
  
  const handleNextExercise = () => {
    stopTimer();
    clearWarningFlash();
    setIsResting(false);

    const setsPerformedForCurrentExercise = sessionData[exerciseIndex]?.sets.some(s => s.reps && String(s.reps).trim() !== '');
    const restDuration = currentExercise.restAfterExercise;
    const isLastExercise = exerciseIndex >= activeDayWorkout.exercises.length - 1;

    // Only start the between-exercise rest timer if at least one set was performed.
    if (setsPerformedForCurrentExercise && restDuration && restDuration > 0 && !isLastExercise) {
        setIsRestingBetweenExercises(true);
        startTimer(restDuration);
    } else {
        moveToNextExerciseLogic();
    }
  };
  
  const handleRequestSkip = () => {
    setConfirmation({
        isOpen: true,
        title: "Skip Exercise?",
        message: "Are you sure you want to skip this exercise? Your progress for it won't be saved for this session.",
        onConfirm: handleNextExercise,
    });
  };

  const handleEffortSelect = (effort: 'Easy' | 'Good' | 'Hard') => {
     setSessionData(prev => {
        if (!prev) return null;
        const updated = [...prev];
        updated[exerciseIndex].effort = effort;
        return updated;
     });
     setTimeout(handleNextExercise, 300);
  }

  // --- RENDER LOGIC ---

  const isTimedExercise = parseDuration(currentExercise.reps) !== null;
  const isWeightApplicable = currentExercise.suggestedWeight !== 'Bodyweight' && !isTimedExercise && !CARDIO_KEYWORDS.some(keyword => currentExercise.name.toLowerCase().includes(keyword.toLowerCase()));
  const isCardio = CARDIO_KEYWORDS.some(keyword => currentExercise.name.toLowerCase().includes(keyword.toLowerCase()));

  if (isExerciseTimerRunning) {
    const totalSets = parseInt(currentExercise.sets, 10);
    const currentSetNumber = (timedSetIndex ?? -1) + 1;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col justify-center items-center text-center p-6 animate-fade-in z-50">
            <h2 className="text-3xl font-bold text-slate-300 mb-4">{currentExercise.name}</h2>
            <p className="text-8xl font-mono font-extrabold text-indigo-400 mb-8">{formatTime(exerciseTime)}</p>
            <button onClick={handleStopExerciseTimer} className={`${button.secondary} !py-3 !px-8 !text-lg`}>
                Stop & Log Time
            </button>
            <p className={`${typography.pMuted} mt-12`}>Set {currentSetNumber} of {totalSets}</p>
        </div>
    );
  }

  if (isRestingBetweenExercises) {
    const nextExercise = activeDayWorkout.exercises[exerciseIndex + 1];
    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col justify-center items-center text-center p-6 animate-fade-in z-50">
            <h2 className="text-3xl font-bold text-slate-300 mb-4">Resting</h2>
            <p className="text-8xl font-mono font-extrabold text-indigo-400 mb-8">{formatTime(time)}</p>
            <button onClick={() => { stopTimer(); clearWarningFlash(); moveToNextExerciseLogic(); }} className={button.secondary}>
                Skip Rest
            </button>
            {nextExercise && (
              <p className={`${typography.pMuted} mt-12`}>Next Exercise: <span className="font-bold text-slate-300">{nextExercise.name}</span></p>
            )}
        </div>
    );
  }

  if (isResting) {
    const totalSets = parseInt(currentExercise.sets, 10);
    const nextSetNumber = (lastCompletedSetIndex ?? -1) + 2;
    const nextUpText = `Set ${nextSetNumber} of ${totalSets}`;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col justify-center items-center text-center p-6 animate-fade-in z-50">
            <h2 className="text-3xl font-bold text-slate-300 mb-4">Rest</h2>
            <p className="text-8xl font-mono font-extrabold text-indigo-400 mb-8">{formatTime(time)}</p>
            <button onClick={() => { stopTimer(); clearWarningFlash(); setIsResting(false); }} className={button.secondary}>
                Skip Rest
            </button>
            <p className={`${typography.pMuted} mt-12`}>Next up: {nextUpText}</p>
        </div>
    )
  }

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
                  onClick={handleRequestSwap}
                  className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
                  disabled={isLoadingAlternatives || !isOnline}
                  title={!isOnline ? "Connect to internet to swap exercises" : ""}
              >
                  {isLoadingAlternatives ? 'Loading...' : 'Swap Exercise'}
              </button>
            )}
            <button onClick={handleRequestSkip} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-semibold">
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
            <div className={`grid ${isWeightApplicable ? 'grid-cols-5' : (isTimedExercise ? 'grid-cols-3' : 'grid-cols-4')} gap-4 items-center font-semibold text-slate-500 dark:text-slate-400 mb-4 px-4`}>
                <span>Set</span>
                <span>Target</span>
                {isWeightApplicable && <span>Weight (lbs)</span>}
                {isTimedExercise ? <span className="text-center">Action</span> : <span>{isCardio ? 'Time' : 'Reps'}</span>}
                {!isTimedExercise && <span></span>}
            </div>
            <div className="space-y-3">
                {Array.from({ length: parseInt(currentExercise.sets, 10) }).map((_, i) => {
                    const isSetCompleted = !!sessionData[exerciseIndex]?.sets[i]?.reps;
                    
                    return (
                        <div key={i} className={`grid ${isWeightApplicable ? 'grid-cols-5' : (isTimedExercise ? 'grid-cols-3' : 'grid-cols-4')} gap-4 items-center bg-slate-100 dark:bg-slate-800 p-4 rounded-lg`}>
                            <span className="font-bold text-lg text-slate-900 dark:text-white">{i + 1}</span>
                            <div>
                              <p className="text-slate-700 dark:text-slate-300">{currentExercise.reps}</p>
                              {currentExercise.suggestedWeight && currentExercise.suggestedWeight !== 'Bodyweight' && !isTimedExercise && (
                                <p className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold mt-1">Suggests: {currentExercise.suggestedWeight}</p>
                              )}
                            </div>
                            
                            {isTimedExercise ? (
                                <div className="flex items-center justify-center">
                                    {isSetCompleted ? (
                                        <div className="flex items-center gap-2 font-bold text-teal-500 dark:text-teal-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            <span>Completed</span>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleStartExerciseTimer(i)} className={button.primarySmall}>Start</button>
                                    )}
                                </div>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    );
                })}
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
            <button onClick={() => handleFinishWorkout()} className={button.dangerLarge}>
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
        
        {confirmation?.isOpen && (
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation(null)}
                onConfirm={() => {
                    confirmation.onConfirm();
                    setConfirmation(null);
                }}
                title={confirmation.title}
                message={confirmation.message}
            />
        )}
    </div>
  );
};