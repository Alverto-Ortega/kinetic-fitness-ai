import React, { useEffect } from 'react';
import { layout, typography, button, misc } from '../styles/theme';

interface DataSchemaViewProps {
  onClose: () => void;
}

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-slate-800 p-4 rounded-md text-sm text-slate-200 overflow-x-auto mt-2">
        <code>{children}</code>
    </pre>
);

export const DataSchemaView: React.FC<DataSchemaViewProps> = ({ onClose }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const workoutPlanExample = `{
  "day": "Monday",
  "goal": "Strength",
  "targetBodyParts": "Chest, Triceps",
  "exercises": [
    {
      "name": "Bench Press",
      "sets": "4",
      "reps": "5",
      "rest": 180,
      "suggestedWeight": "185 lbs",
      "restAfterExercise": 120
    }
  ]
}`;

    const workoutHistoryExample = `{
  "date": "2024-01-15T20:30:00.000Z",
  "day": "Monday",
  "duration": 2700,
  "exercises": [
    {
      "exerciseName": "Bench Press",
      "sets": [
        { "reps": 5, "weight": 185 },
        { "reps": 5, "weight": 185 }
      ],
      "effort": "Good"
    }
  ]
}`;

    const preferencesExample = `{
  "fitnessLevel": "Intermediate",
  "daysPerWeek": "4",
  "equipment": ["Barbell", "Dumbbells", "Squat Rack"],
  "desiredGoals": ["Strength", "Hypertrophy"],
  "height": "5'11\\"",
  "weight": "190",
  "injuries": "Slight wrist pain on push movements"
}`;

    return (
        <div className={layout.pageContainer}>
            <div className={`${layout.container} animate-fade-in`}>
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-black py-4 z-10">
                    <h1 className={typography.h1.replace('md:text-5xl', 'md:text-4xl')}>App Data Schema</h1>
                    <button 
                        onClick={onClose} 
                        className={button.secondarySmall}
                        aria-label="Close data schema view"
                    >
                        &larr; Back to App
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 sm:p-8 space-y-6">
                    <section>
                        <h2 className={`${typography.h2} ${misc.hr}`}>Data Storage Overview</h2>
                        <p className={typography.p}>
                            Kinetix Fitness AI stores all of your application data directly in your web browser's <strong>localStorage</strong>. This is a simple key-value storage system that persists even when you close the browser tab. Data is private to you and is never sent to an external server.
                        </p>
                        <p className={`${typography.p} mt-2`}>
                            Complex data, such as your workout plan, is converted into a JSON string before being stored. The following documentation outlines the main data keys, their purpose, and their structure. You can access this data programmatically in your browser's developer console or by using the app's "Export" feature. For a complete definition of all types, please refer to the <code>types.ts</code> file in the source code.
                        </p>
                    </section>

                    <section className="space-y-8">
                        <div>
                            <h3 className={typography.h3}>kinetix-workout-plan</h3>
                            <p className={typography.pMuted}>Stores the current, active workout plan as an array of <code>DayWorkout</code> objects.</p>
                            <CodeBlock>{`[
  ${workoutPlanExample}
  ...
]`}</CodeBlock>
                        </div>
                        <div>
                            <h3 className={typography.h3}>kinetix-workout-history</h3>
                            <p className={typography.pMuted}>An array of all completed <code>WorkoutSession</code> objects, forming your entire workout log.</p>
                            <CodeBlock>{`[
  ${workoutHistoryExample}
  ...
]`}</CodeBlock>
                        </div>
                         <div>
                            <h3 className={typography.h3}>kinetix-preferences</h3>
                            <p className={typography.pMuted}>Stores the user's preferences from the planner to inform future plan generations.</p>
                            <CodeBlock>{preferencesExample}</CodeBlock>
                        </div>
                        <div>
                            <h3 className={typography.h3}>kinetix-analysis-history</h3>
                            <p className={typography.pMuted}>An array of all AI physique analysis results.</p>
                            <CodeBlock>{`[
  {
    "date": "2024-01-20T10:00:00.000Z",
    "result": "Overall Impression: Solid foundational physique..."
  }
  ...
]`}</CodeBlock>
                        </div>
                        <div>
                            <h3 className={typography.h3}>Other Keys</h3>
                             <ul className="list-disc list-inside space-y-2 pl-4 text-slate-300 mt-2">
                                <li><strong>kinetix-streak:</strong> An object storing your current workout streak (e.g., <code>{"current": 5, "lastWorkoutDate": "..."}</code>).</li>
                                <li><strong>kinetix-completed-days:</strong> An array of strings representing the completed days for the current week's plan (e.g., <code>["Monday", "Wednesday"]</code>).</li>
                                <li><strong>kinetix-last-summary:</strong> A string containing the last AI-generated insight about your performance.</li>
                                <li><strong>kinetix-active-*:</strong> Several keys prefixed with <code>kinetix-active-</code> are used to persist the state of an in-progress workout, allowing you to refresh the page and resume where you left off.</li>
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
