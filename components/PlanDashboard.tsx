import React, { useState, useMemo } from 'react';
import { WorkoutPlan, WorkoutSession, DayWorkout, Exercise, BodyAnalysis, Preferences } from '../types.ts';
import { ViewWorkoutModal } from './ViewWorkoutModal';
import { ProgressView } from './ProgressView';
import { ConfirmationModal } from './ConfirmationModal';
import { AnalysisHistoryView } from './AnalysisHistoryView';
import { WarmUpModal } from './WarmUpModal';
import { calculateEstimatedTime } from '../utils/workoutUtils';
import { layout, typography, button, card, notice, spinner, cn } from '../styles/theme';

interface PlanDashboardProps {
  plan: WorkoutPlan;
  history: WorkoutSession[];
  analysisHistory: BodyAnalysis[];
  streak: { current: number };
  preferences: Preferences | null;
  completedDays: string[];
  hasCompletedFirstPhase: boolean;
  hasSeenInitialPrompt: boolean;
  isOnline: boolean;
  planGenerationQueued: boolean;
  lastSummary: string;
  onStartWorkout: (workout: DayWorkout) => void;
  onResetPlan: () => void;
  onUpdateExercise: (day: string, originalExerciseName: string, newExercise: Exercise) => void;
  onOpenAnalysisModal: () => void;
}

const FireIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 01-1.898-.632l4-12a1 1 0 011.265-.633zM10 18a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        <path d="M10 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zM5.05 5.05a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm13.95 4.95a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1z" />
    </svg>
);

const CheckmarkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

/** A utility to extract a numeric weight value from a string (e.g., "135 lbs"). */
const parseWeight = (weightStr: string | undefined): number | null => {
  if (!weightStr) return null;
  const match = weightStr.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[0]) : null;
};

export interface UpgradedExerciseInfo {
    lastWeight: number;
    newWeight: number;
}

const dayNameToIndex: { [key: string]: number } = {
  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
  'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

export const PlanDashboard: React.FC<PlanDashboardProps> = ({ plan, history, analysisHistory, streak, preferences, completedDays, hasCompletedFirstPhase, hasSeenInitialPrompt, isOnline, planGenerationQueued, lastSummary, onStartWorkout, onResetPlan, onUpdateExercise, onOpenAnalysisModal }) => {
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(null);
  const [workoutForWarmUp, setWorkoutForWarmUp] = useState<DayWorkout | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  /**
   * Serializes the entire app state into a JSON object and triggers a download.
   */
  const handleExportData = () => {
    const data = {
        plan,
        workoutHistory: history,
        analysisHistory,
        streak,
        preferences,
        completedDays,
        hasCompletedFirstPhase,
        lastSummary,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = 'kinetix_fitness_progress.json';
    link.click();
  };
  
  const handleNewPlanClick = () => {
    setIsConfirmModalOpen(true);
  };

  /**
   * This memoized calculation compares the current plan's suggested weights against
   * the user's history to identify exercises where the AI is recommending an increase.
   * This is used to display "Progression Alert" notifications in the UI.
   */
  const upgradedExercises = useMemo(() => {
    const upgraded = new Map<string, UpgradedExerciseInfo>();
    if (!plan || history.length === 0) return upgraded;

    for (const workoutDay of plan) {
        for (const exercise of workoutDay.exercises) {
            const newWeight = parseWeight(exercise.suggestedWeight);
            // Skip bodyweight exercises or those with no suggested weight change.
            if (newWeight === null || newWeight === 0) continue;

            // Find the last time this exercise was performed.
            const lastPerformance = history
                .slice()
                .reverse()
                .flatMap(session => session.exercises)
                .find(e => e.exerciseName === exercise.name);

            if (lastPerformance && lastPerformance.sets.length > 0) {
                const lastSetWithWeight = [...lastPerformance.sets].reverse().find(s => s.weight !== undefined);
                if (lastSetWithWeight) {
                    const lastWeight = lastSetWithWeight.weight;
                    if (lastWeight !== undefined && newWeight > lastWeight) {
                        // If the new suggested weight is greater, mark it as an upgrade.
                        upgraded.set(exercise.name, { lastWeight, newWeight });
                    }
                }
            }
        }
    }
    return upgraded;
  }, [plan, history]);

  const nextWorkoutIndex = plan.findIndex(p => !completedDays.includes(p.day));
  const isAnalysisDisabled = !hasCompletedFirstPhase || !isOnline;
  const todayIndex = new Date().getDay();
  const showInitialUploadBanner = !hasCompletedFirstPhase && analysisHistory.length === 0 && hasSeenInitialPrompt;

  return (
    <div className={layout.containerLarge}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
            <h1 className={typography.h1}>Your Workout Plan</h1>
            <p className={typography.pMuted}>Ready to get started? Pick a workout for today.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
            {streak.current > 0 && (
                 <div className="flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-800 dark:bg-amber-900/50 dark:border-amber-700/60 dark:text-amber-300 font-bold px-3 py-2 rounded-lg text-sm sm:text-base sm:px-4">
                    <FireIcon />
                    <span>{streak.current} Day Streak</span>
                </div>
            )}
             <button onClick={handleExportData} className={button.tertiary.replace('px-4 py-2', 'py-2 px-3 sm:px-4')}>Export</button>
             <button onClick={handleNewPlanClick} className={button.tertiary.replace('px-4 py-2', 'py-2 px-3 sm:px-4')}>New Plan</button>
        </div>
      </div>
      
      {planGenerationQueued && isOnline && (
        <div className={`${notice.info} mb-6`}>
             <svg className={spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>You're back online! Generating your next plan now...</span>
        </div>
      )}

      {showInitialUploadBanner && (
        <div className={`${notice.info} mb-6 flex-col sm:flex-row`}>
          <div className="flex-grow mb-3 sm:mb-0">
            <strong className="block">Set Your Baseline</strong>
            <p className="text-sm">Upload your 'before' photo now to track your physique changes from the very start.</p>
          </div>
          <button 
            onClick={onOpenAnalysisModal}
            disabled={!isOnline}
            className={`${button.primarySmall} bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 w-full sm:w-auto flex-shrink-0`}
          >
            Upload Photo
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {plan.map((workout, index) => {
          const isCompleted = completedDays.includes(workout.day);
          const isNext = index === nextWorkoutIndex;
          const estimatedTime = calculateEstimatedTime(workout);
          const workoutDayIndex = dayNameToIndex[workout.day];
          const isFutureWorkout = workoutDayIndex > todayIndex;
          
          const cardClasses = cn(
              card.base, 
              'flex flex-col justify-between',
              card.interactive,
              isCompleted && card.completed,
              isNext && !isFutureWorkout && card.highlight,
              (!isNext || isFutureWorkout) && !isCompleted && card.disabled
          );
          
          let buttonText = 'Start Workout';
          if (isCompleted) buttonText = 'Completed';
          if (isFutureWorkout) buttonText = `Locked until ${workout.day}`;

          const isButtonDisabled = !isNext || isFutureWorkout;
          
          return (
            <div key={index} className={cardClasses}>
              {isCompleted && (
                <div className={`absolute top-4 right-4 ${typography.accent}`} title="Completed">
                  <CheckmarkIcon />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-inherit">{workout.day}</h2>
                <p className={`${typography.accent} font-semibold mb-1`}>{workout.goal}</p>
                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <span>{workout.targetBodyParts}</span>
                    <span className="flex items-center gap-1.5 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ~{estimatedTime} min
                    </span>
                </div>
                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside mb-6">
                  {workout.exercises.slice(0, 3).map(ex => <li key={ex.name}>{ex.name}</li>)}
                  {workout.exercises.length > 3 && <li>and {workout.exercises.length - 3} more...</li>}
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setWorkoutForWarmUp(workout)}
                  disabled={isButtonDisabled}
                  className={`${button.primarySmall} w-full`}
                  title={isFutureWorkout ? `This workout is scheduled for ${workout.day}.` : ''}
                >
                  {buttonText}
                </button>
                <button onClick={() => setSelectedWorkout(workout)} className={`${button.secondary} w-full`}>View Details</button>
              </div>
            </div>
          );
        })}
      </div>

      <ProgressView history={history} isOnline={isOnline} plan={plan} lastSummary={lastSummary} />

      <AnalysisHistoryView history={analysisHistory} />
      
      <div className="mt-12 text-center">
        <button
            onClick={onOpenAnalysisModal}
            disabled={isAnalysisDisabled}
            className={`${button.primary.replace('w-full', '')} bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500`}
            title={!isOnline ? "Connect to the internet for AI Analysis" : hasCompletedFirstPhase ? "Analyze your current physique" : "Complete your first workout phase to unlock. This feature is for tracking progress between phases."}
        >
            AI Body Composition Analysis
        </button>
      </div>


      {selectedWorkout && (
        <ViewWorkoutModal 
            workout={selectedWorkout} 
            onClose={() => setSelectedWorkout(null)} 
            upgradedExercises={upgradedExercises}
            onUpdateExercise={onUpdateExercise}
        />
      )}
      
      <WarmUpModal 
        workout={workoutForWarmUp}
        onClose={() => setWorkoutForWarmUp(null)}
        onStartWorkout={onStartWorkout}
      />

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={onResetPlan}
        title="Generate New Plan?"
        message="Are you sure? Your current plan will be replaced, but your workout history will be saved to inform the next one."
      />
    </div>
  );
};
