import React, { useEffect } from 'react';
// FIX: Add 'notice' to the import to fix a reference error.
import { layout, typography, button, misc, notice } from '../styles/theme';

interface DocumentationProps {
  onClose: () => void;
}

export const Documentation: React.FC<DocumentationProps> = ({ onClose }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className={layout.pageContainer}>
            <div className={`${layout.container} animate-fade-in`}>
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-black py-4 z-10">
                    <h1 className={typography.h1.replace('md:text-5xl', 'md:text-4xl')}>Kinetix Fitness AI</h1>
                    <button 
                        onClick={onClose} 
                        className={button.secondarySmall}
                        aria-label="Close documentation"
                    >
                        &larr; Back to App
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 sm:p-8 space-y-6">
                    <section>
                        <h2 className={`${typography.h2} ${misc.hr}`}>Documentation</h2>
                        
                        <h3 className={`${typography.h3} mt-6 mb-3`}>1. Introduction</h3>
                        <p className={typography.p}>
                            Kinetix Fitness AI is an elegant, AI-powered fitness tracker that generates personalized weekly workout routines. It tracks your progress, adjusts exercises based on performance, and includes a rest timer to guide you through each session, ensuring you consistently advance on your fitness journey.
                        </p>
                        <p className={`${typography.p} mt-2`}>
                            The application is built with React, TypeScript, and Tailwind CSS, and it leverages the Google Gemini API for its intelligent features. All user data is stored locally in the browser, ensuring privacy.
                        </p>
                    </section>

                    <section>
                        <h3 className={`${typography.h3} mt-8 mb-3`}>2. Core Features</h3>
                        <ul className="list-disc list-inside space-y-3 pl-4 text-slate-300">
                           <li><strong className="font-semibold text-white">Advanced Plan Personalization:</strong> Go beyond presets. The AI uses your height, weight, and any reported injuries to fine-tune your plan for safety and effectiveness. Specify your desired weekly goals (e.g., Strength, Yoga) and the AI will intelligently schedule them for optimal results. You can also exclude goals you dislike.</li>
                            <li><strong className="font-semibold text-white">Interactive Workout Sessions:</strong> A guided interface for active workouts with an automated rest timer. View exercise instructions or swap exercises for AI-suggested alternatives on the fly.</li>
                            <li><strong className="font-semibold text-white">AI-Generated Warm-ups:</strong> Before each session, receive a science-based, dynamic warm-up routine tailored to that day's workout. Each warm-up exercise includes instructions and an option to swap it for an alternative.</li>
                            <li><strong className="font-semibold text-white">Intelligent Progressive Overload:</strong> The AI analyzes your workout history and effort feedback to make future plans more challenging. It will even alert you when it's time to increase weight and offer alternative progression methods (like more reps or sets).</li>
                            <li><strong className="font-semibold text-white">Comprehensive Dashboard:</strong> A central hub to view your plan. Each workout card shows the day's goal, target muscles, estimated duration, and completion status.</li>
                            <li><strong className="font-semibold text-white">Progress & Insight Views:</strong> Track your momentum with an AI-generated summary of your recent performance, a workout streak counter, and a detailed history of your completed sessions.</li>
                            <li><strong className="font-semibold text-white">AI Physique Analysis (Phase-Locked):</strong> After completing your first full workout plan, unlock the ability to upload a photo and receive a general, non-medical physique assessment.</li>
                            <li><strong className="font-semibold text-white">Automatic Next Phase Generation:</strong> Once you complete all workouts in your current plan, Kinetix automatically generates a new, more challenging plan for the next phase.</li>
                            <li><strong className="font-semibold text-white">Local-First Data Storage & Portability:</strong> All your data is saved in your browser. Use the simple Import/Export feature to backup your progress or transfer it to another device.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className={`${typography.h3} mt-8 mb-3`}>3. User Guide</h3>
                        <div className={`${typography.p} space-y-4`}>
                            <h4 className="font-semibold text-lg text-white">Step 1: Creating Your Workout Plan</h4>
                            <p>When you first open the app, you are greeted with the <strong>Workout Planner</strong>.</p>
                            <ol className="list-decimal list-inside space-y-2 pl-4">
                                <li><strong>Enter Your Personal Metrics:</strong> Provide your height and weight. This data helps the AI calibrate exercise difficulty and suggest appropriate starting weights.</li>
                                <li><strong>Set Core Preferences:</strong> Select your Fitness Level, desired Workouts per Week, and all Available Equipment.</li>
                                <li><strong>Note Injuries (Optional):</strong> In the "Advanced Customization" section, specify any injuries or concerns. The AI's highest priority is your safety and it will create a plan that avoids aggravating these areas.</li>
                                <li><strong>Define Your Goals (Optional):</strong> Use the "Choose Your Weekly Goals" section to tell the AI what you want to focus on (e.g., Muscle Growth, Yoga). The AI will then expertly schedule these goals throughout the week.</li>
                                <li><strong>Generate the Plan:</strong> Click "Create My Workout Plan" to have the AI build your custom routine.</li>
                            </ol>

                             <h4 className="font-semibold text-lg text-white mt-4">Step 2: Your AI Warm-up</h4>
                            <p>Before every workout, a modal will appear with a custom-generated warm-up routine. This short, dynamic session is designed to prepare you for the specific exercises you're about to perform.</p>
                             <ul className="list-disc list-inside space-y-2 pl-4">
                                <li>Click on any warm-up exercise to expand it and read the instructions.</li>
                                <li>If you can't perform an exercise, click the swap icon next to it to get an instant, AI-generated alternative.</li>
                                <li>Click "Start Workout" to proceed to the main session. You can also choose to "Skip Warm-up".</li>
                            </ul>

                            <h4 className="font-semibold text-lg text-white mt-4">Step 3: The Active Workout Session</h4>
                            <p>This screen guides you through your workout one exercise at a time. Log your sets, use the automated rest timer, and provide feedback on your effort to help the AI adapt your next plan. During a workout, you can click 'Show How-To' to get instructions for the current exercise or 'Swap Exercise' to get AI-generated alternatives.</p>

                            <h4 className="font-semibold text-lg text-white mt-4">Step 4: Automatic Plan Progression</h4>
                            <p>Keep the momentum going without lifting a finger. As soon as you complete the final workout of your current plan, Kinetix's AI will immediately get to work, analyzing all your recent performance to automatically generate the next phase of your training. A loading screen will appear, and in a few moments, your new, more challenging weekly plan will be ready on your dashboard.</p>
                        </div>
                    </section>

                    <section>
                        <h3 className={`${typography.h3} mt-8 mb-3`}>4. Technical Overview</h3>
                        <p className={typography.p}>The application is a single-page application built with React, TypeScript, and Tailwind CSS. It uses the Google Gemini API for AI features and stores all data in the browser's local storage via a `useStickyState` custom hook. The AI prompts are carefully engineered to return structured JSON, ensuring data reliability and a seamless user experience.</p>
                        <pre className="bg-slate-800 p-4 rounded-md text-sm text-slate-200 overflow-x-auto mt-4"><code>
/
├── components/
│   ├── ActiveWorkout.tsx
│   └── ...
├── hooks/
│   ├── useStickyState.ts
│   └── useTimer.ts
├── services/
│   └── geminiService.ts
├── App.tsx
└── ...
                        </code></pre>
                    </section>

                    <section>
                        <h3 className={`${typography.h3} mt-8 mb-3`}>5. Disclaimer</h3>
                        <p className={`${notice.warning} !text-base`}>
                            Kinetix Fitness AI is a tool designed to assist your fitness journey. The workout plans and analysis are generated by a large language model and should <strong>not</strong> be considered medical advice. Always consult with a qualified healthcare professional before starting any new fitness program.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};