import React, { useEffect } from 'react';
import { layout, typography, button, misc } from '../styles/theme';

interface FAQProps {
  onClose: () => void;
}

const FAQItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <div>
        <h4 className="text-lg font-semibold text-white mb-2">{question}</h4>
        <div className={`${typography.p} space-y-2`}>{children}</div>
    </div>
);

export const FAQ: React.FC<FAQProps> = ({ onClose }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className={layout.pageContainer}>
            <div className={`${layout.container} animate-fade-in`}>
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-black py-4 z-10">
                    <h1 className={typography.h1.replace('md:text-5xl', 'md:text-4xl')}>FAQ</h1>
                    <button 
                        onClick={onClose} 
                        className={button.secondarySmall}
                        aria-label="Close FAQ"
                    >
                        &larr; Back to App
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 sm:p-8 space-y-8">
                    <h2 className={`${typography.h2} ${misc.hr} mb-6`}>Frequently Asked Questions</h2>
                    
                    <FAQItem question="How does the AI adjust my workouts as I get stronger?">
                        <p>
                            The AI applies a principle called <strong>Progressive Overload</strong>. It analyzes your actual performance from your workout history—the weights you lifted, the reps you completed, and the 'Effort' feedback you provided. It also considers your height and weight when generating plans to suggest appropriate starting points and exercise difficulty.
                        </p>
                        <p>
                           Based on this, it makes the next plan more challenging. This is context-aware: for a strength plan, it might increase weight, but for a yoga plan, it will suggest more advanced poses or longer hold times to ensure you keep making progress toward your specific goal.
                        </p>
                    </FAQItem>

                     <FAQItem question="How are the warm-ups generated? Can I change them?">
                        <p>
                            Before each workout, the AI generates a brief, dynamic warm-up routine specifically designed to prepare the muscles you're about to train. It focuses on mobility and activation, not static stretching which is best saved for after your workout.
                        </p>
                         <p>
                            If you can't perform a suggested warm-up exercise, you can use the 'Swap' button next to it to get an instant AI-suggested alternative.
                        </p>
                    </FAQItem>
                    
                     <FAQItem question="I have an injury. Can Kinetix create a safe plan for me?">
                        <p>
                            Yes. Safety is a top priority. In the "Advanced Customization" section of the planner, you can specify any injuries or concerns you have (e.g., "sensitive knees," "lower back pain").
                        </p>
                        <p>
                            The AI is governed by a critical safety instruction to strictly avoid any exercises that could strain or aggravate these areas. It will build your plan with safe and effective alternatives that work around your limitations.
                        </p>
                    </FAQItem>

                    <FAQItem question="How do I change my workout schedule or add new equipment?">
                        <p>
                            It's simple! Go to the main <strong>Plan Dashboard</strong> and click the <strong>"New Plan"</strong> button. This will take you back to the planner screen where you can adjust your number of workout days, select new equipment, or change your desired/excluded weekly goals.
                        </p>
                        <p>
                            When you generate the new plan, the AI will use your entire past workout history to create a new routine that's perfectly up-to-date with your current fitness level and new preferences.
                        </p>
                    </FAQItem>

                    <FAQItem question="Is my data private and how do I back it up?">
                        <p>
                            <strong>Your data is 100% private.</strong> All of your workout plans, history, and preferences are stored directly in your browser's local storage. Nothing is sent to a server or cloud account.
                        </p>
                        <p>
                            To back up your data or move it to another device, use the <strong>"Export Progress"</strong> button on the dashboard. This saves everything to a single file. You can then use the <strong>"Import Existing Plan"</strong> button on the planner screen to restore your data completely.
                        </p>
                    </FAQItem>

                    <FAQItem question="I'm having trouble importing my data file. What can I do?">
                        <p>
                            Data import issues are rare but can be frustrating. Here are a few things to check:
                        </p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>File Integrity:</strong> Ensure the file you are importing is the original, unmodified <code>.json</code> file you exported from Kinetix. If the file has been edited or is corrupted, the import may fail.</li>
                            <li><strong>Browser Compatibility:</strong> Kinetix uses modern browser features for importing large files efficiently. Please ensure you are using an up-to-date version of a major browser like Chrome, Firefox, or Safari.</li>
                            <li>
                                <strong>Android Developer Options (Edge Case):</strong> If you are using an Android device and have enabled "Developer options," there is a specific setting that can interfere with file imports. Please check that the <strong>"Don't keep activities"</strong> setting is <strong>turned off</strong>. This is an aggressive developer setting that is not enabled by default and can cause the app to close unexpectedly when you select a file.
                            </li>
                        </ul>
                    </FAQItem>

                    <FAQItem question="Why can't I do my workouts in any order?">
                        <p>
                           Kinetix's AI doesn't just pick random exercises; it creates a structured, weekly plan where each workout complements the others. For example, it will often schedule an upper-body day and a lower-body day with a rest day in between to ensure your muscles have time to recover.
                        </p>
                         <p>
                           Completing the workouts in the recommended order ensures you're following this intelligent structure, which is crucial for maximizing growth and preventing injury.
                        </p>
                    </FAQItem>
                    
                     <FAQItem question="How does the 'AI Body Composition Analysis' work?">
                        <p>
                           This experimental feature uses a powerful multimodal AI model. When you upload a photo, the AI performs a visual analysis to give you a general, non-medical assessment of your physique (e.g., "well-developed shoulders"). It is designed to provide encouragement and suggest general areas to focus on.
                        </p>
                         <p>
                           <strong>Important:</strong> The app does not save or store your photos. The analysis is done in real-time, and only the resulting text is saved to your history. This feature is locked until you complete your first full workout phase to encourage a "before-and-after" comparison.
                        </p>
                    </FAQItem>
                </div>
            </div>
        </div>
    );
};