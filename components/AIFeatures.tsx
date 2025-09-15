import React from 'react';
import { card, typography } from '../styles/theme';

const TargetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 12a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
);

const ClipboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6" />
    </svg>
);

const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const BodyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const SparkleIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m1-15l.01 0M21 12v4m2-2h-4m-7-1V3m2 2h-4m7 12.01V21m2.01-2.01H14" />
    </svg>
);


const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center ${typography.accent}`}>
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{title}</h4>
            <p className={`${typography.pMuted} text-sm`}>{children}</p>
        </div>
    </div>
);

export const AIFeatures: React.FC = () => {
    return (
        <div className={`${card.base} mb-8 animate-fade-in`}>
            <h2 className={`${typography.h2} mb-6`}>How Kinetix AI Crafts Your Perfect Workout</h2>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <FeatureCard icon={<TargetIcon />} title="Holistic Personalization">
                    Your plan is unique. The AI analyzes your fitness level, height, weight, and even works around specified injuries. It intelligently schedules your chosen goals—or excludes ones you dislike—to build a safe and perfectly tailored routine.
                </FeatureCard>
                <FeatureCard icon={<SparkleIcon />} title="Science-Based Warm-ups">
                    Start every session primed for performance. Kinetix generates a unique, dynamic warm-up tailored to your specific workout, preparing your muscles and preventing injury.
                </FeatureCard>
                <FeatureCard icon={<ClipboardIcon />} title="Expert-Level Structuring">
                    Kinetix intelligently sequences workouts to manage muscle fatigue and recovery, ensuring your plan is not just personalized, but also safe and scientifically sound.
                </FeatureCard>
                <FeatureCard icon={<ChartIcon />} title="Dynamic Progression">
                    Kinetix learns from your effort feedback. It uses this data to apply principles of progressive overload, making your next plan challenging enough to drive results.
                </FeatureCard>
                 <FeatureCard icon={<BodyIcon />} title="AI Physique Analysis">
                    Go beyond the workout. Upload a photo and receive a general physique assessment from the AI, offering insights to help you focus your training.
                </FeatureCard>
            </div>
        </div>
    );
};