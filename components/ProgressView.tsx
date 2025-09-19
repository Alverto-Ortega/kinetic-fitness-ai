import React, { useMemo } from 'react';
import { WorkoutSession, WorkoutPlan } from '../types';
import { card, typography } from '../styles/theme';

interface ProgressViewProps {
  /** A complete history of all workout sessions. */
  history: WorkoutSession[];
  /** A boolean indicating if the user is currently online. */
  isOnline: boolean;
  /** The current workout plan, for providing context to the AI summary. */
  plan: WorkoutPlan | null;
  /** The last AI-generated workout summary, persisted in the main app state. */
  lastSummary: string;
}

export const ProgressView: React.FC<ProgressViewProps> = ({ history, isOnline, plan, lastSummary }) => {
    // useMemo ensures that the total workout count is only recalculated when the history array changes.
    const totalWorkouts = useMemo(() => history.length, [history]);

    if (history.length === 0) {
      return (
        <div className={`${card.base} text-center`}>
          <h3 className="text-xl font-bold text-white mb-2">Your Progress</h3>
          <p className={typography.pMuted}>Complete your first workout to see your progress here.</p>
        </div>
      );
    }

    return (
        <div className={card.base}>
            <h3 className={`${typography.h2} mb-6`}>Your Momentum</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Sessions */}
                <div className="bg-slate-800 p-4 rounded-lg text-center md:col-span-1">
                    <p className="text-4xl font-bold text-indigo-400">{totalWorkouts}</p>
                    <p className={`text-sm ${typography.pMuted}`}>Total Sessions</p>
                </div>

                {/* AI Insight */}
                <div className="bg-slate-800 p-4 rounded-lg md:col-span-2 flex flex-col justify-center">
                    <h4 className="font-semibold text-white mb-2 text-sm">AI Insight</h4>
                    {lastSummary ? (
                        <p className={`text-sm ${typography.p} italic`}>"{lastSummary}"</p>
                    ) : (
                         <p className={`text-sm ${typography.pMuted}`}>Complete a workout while online to get your first AI insight.</p>
                    )}
                </div>
            </div>

            <h4 className="text-lg font-semibold text-white mb-4">Recent Activity</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {history.slice(-5).reverse().map((session, index) => (
                    <div key={index} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-white">{session.day}</p>
                            <p className={`text-xs ${typography.pMuted}`}>{new Date(session.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-slate-300">{session.exercises.length} {session.exercises.length === 1 ? 'Exercise' : 'Exercises'}</p>
                            {session.duration && (
                                <p className={`text-xs ${typography.pMuted}`}>in {Math.round(session.duration / 60)} min</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
