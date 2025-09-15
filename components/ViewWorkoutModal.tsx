import React, { useState } from 'react';
import { DayWorkout, Exercise } from '../types.ts';
import { UpgradedExerciseInfo } from './PlanDashboard.tsx';
import { getAlternativeProgression } from '../services/geminiService.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { calculateEstimatedTime } from '../utils/workoutUtils.ts';
import { modal, typography, button } from '../styles/theme.ts';

interface ViewWorkoutModalProps {
  /** The workout object to display. If null, the modal is not rendered. */
  workout: DayWorkout | null;
  /** Callback function to close the modal. */
  onClose: () => void;
  /** A map of exercises that have a suggested weight progression. */
  upgradedExercises: Map<string, UpgradedExerciseInfo>;
  /** Callback to update the master plan with a chosen progression. */
  onUpdateExercise: (day: string, originalExerciseName: string, newExercise: Exercise) => void;
}

/**
 * An internal component that allows the user to choose between different
 * AI-suggested progression methods for an exercise (e.g., more weight vs. more volume).
 */
const ProgressionSelector: React.FC<{
    exercise: Exercise;
    upgradeInfo: UpgradedExerciseInfo;
    isOnline: boolean;
    onSelect: (newExercise: Exercise) => void;
}> = ({ exercise, upgradeInfo, isOnline, onSelect }) => {
    const [alternative, setAlternative] = useState<Exercise | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    /** Fetches an alternative progression (e.g., more sets/reps) from the AI service. */
    const handleFetchAlternative = async () => {
        if (!isOnline) return;
        setIsLoading(true);
        const alt = await getAlternativeProgression(exercise, `${upgradeInfo.lastWeight} lbs`);
        setAlternative(alt);
        setIsLoading(false);
    };

    // If an alternative has been fetched, show the choice buttons.
    if (alternative) {
        return (
            <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mb-2">Choose your progression:</p>
                {/* Option 1: Original AI Suggestion (Increase Weight) */}
                <button onClick={() => onSelect(exercise)} className="w-full text-left p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md border border-transparent hover:border-indigo-500">
                    <p className="font-bold text-slate-900 dark:text-white">Increase Weight</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{exercise.sets}x{exercise.reps} @ {exercise.suggestedWeight}</p>
                </button>
                 {/* Option 2: Alternative Progression (Increase Volume/Intensity) */}
                <button onClick={() => onSelect(alternative)} className="w-full text-left p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md border border-transparent hover:border-indigo-500">
                     <p className="font-bold text-slate-900 dark:text-white">Increase Volume/Intensity</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{alternative.sets}x{alternative.reps} @ {alternative.suggestedWeight}, {alternative.rest}s rest</p>
                </button>
            </div>
        )
    }

    // Initially, show the button to fetch the alternative.
    return (
         <div className="mt-3">
            <button
                onClick={handleFetchAlternative}
                disabled={isLoading || !isOnline}
                title={!isOnline ? "Connect to see alternatives" : ""}
                className={`${button.secondary} w-full text-sm !py-2`}
            >
                {isLoading ? 'Loading...' : 'See Alternative Progression'}
            </button>
        </div>
    )
}


export const ViewWorkoutModal: React.FC<ViewWorkoutModalProps> = ({ workout, onClose, upgradedExercises, onUpdateExercise }) => {
  /** Tracks which exercises have had a progression choice made to update the UI. */
  const [choicesMade, setChoicesMade] = useState<Set<string>>(new Set());
  const isOnline = useOnlineStatus();

  if (!workout) return null;

  const handleProgressionSelect = (originalExerciseName: string, newExercise: Exercise) => {
    onUpdateExercise(workout.day, originalExerciseName, newExercise);
    // Add the exercise to the set to hide the progression selector.
    setChoicesMade(prev => new Set(prev).add(originalExerciseName));
  };
  
  const estimatedTime = calculateEstimatedTime(workout);

  return (
    <div className={modal.backdrop}>
      <div className={modal.container} role="dialog" aria-modal="true" aria-labelledby="workout-details-title">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 id="workout-details-title" className={`${typography.h2.replace('sm:text-4xl', 'sm:text-3xl')}`}>{workout.day} - {workout.targetBodyParts}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
                <span className={`${typography.accent} font-semibold`}>{workout.goal}</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ~{estimatedTime} min
                </span>
            </div>
          </div>
          <button onClick={onClose} className={modal.closeButton} aria-label="Close workout details">&times;</button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {workout.exercises.map(ex => {
                const upgradeInfo = upgradedExercises.get(ex.name);
                const hasUpgrade = !!upgradeInfo;
                const choiceMade = choicesMade.has(ex.name);

                return (
                    <div key={ex.name} className={`p-4 rounded-lg border ${hasUpgrade && !choiceMade ? 'bg-sky-100/50 dark:bg-sky-900/40 border-sky-400 dark:border-sky-700' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <h3 className={`font-semibold ${typography.accent}`}>{ex.name}</h3>
                        <p className={`${typography.p.replace('md:text-lg', '')} text-sm mt-1`}>{ex.sets} sets of {ex.reps} reps</p>
                        {ex.suggestedWeight && ex.suggestedWeight !== 'Bodyweight' && (
                            <p className={`${typography.pMuted} text-xs mt-1`}>Suggests: {ex.suggestedWeight}</p>
                        )}
                        <p className={`${typography.pMuted} text-xs mt-1 opacity-75`}>Rest: {ex.rest} seconds</p>

                        {hasUpgrade && !choiceMade && (
                            <div className="mt-3 pt-3 border-t border-sky-200 dark:border-sky-800">
                                <p className="text-sm font-bold text-sky-700 dark:text-sky-300">Progression Alert</p>
                                <p className="text-xs text-sky-600 dark:text-sky-400 mb-2">
                                    AI suggests increasing weight from {upgradeInfo.lastWeight} lbs to {upgradeInfo.newWeight} lbs.
                                </p>
                                <ProgressionSelector 
                                    exercise={ex}
                                    upgradeInfo={upgradeInfo}
                                    isOnline={isOnline}
                                    onSelect={(newExercise) => handleProgressionSelect(ex.name, newExercise)}
                                />
                            </div>
                        )}
                        {hasUpgrade && choiceMade && (
                            <div className="mt-2 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Progression updated.
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
};