import React, { useState, useEffect } from 'react';
import { generateWorkoutPlan } from '../services/geminiService.ts';
import { WorkoutPlan, Preferences } from '../types.ts';
import { AIFeatures } from './AIFeatures.tsx';
import { typography, form, button, card, notice, layout, spinner, cn } from '../styles/theme.ts';

interface WorkoutPlannerProps {
  /** Callback function when a new plan is successfully generated. */
  onPlanGenerated: (plan: WorkoutPlan, preferences: Preferences) => void;
  /** Callback function to handle importing user data from a file. */
  onImportData: (data: { plan: WorkoutPlan; workoutHistory: any[]; streak: any }) => void;
  /** The user's workout history, used to inform the AI for new plans. */
  history: any[];
  /** A boolean indicating if the user is currently online. */
  isOnline: boolean;
}

const equipmentOptions = ["Bodyweight", "Dumbbells", "Barbell", "Kettlebells", "Resistance Bands", "Pull-up Bar", "Treadmill", "Stationary Bike", "Elliptical Machine", "Boxing Heavy Bag", "Weight Machine"];
const goalOptions = ["Muscle Growth", "Strength", "Endurance", "Fat Loss (HIIT)", "Full Body", "Active Recovery", "Yoga"];
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WorkoutPlanner: React.FC<WorkoutPlannerProps> = ({ onPlanGenerated, onImportData, history, isOnline }) => {
  // --- STATE ---
  const [preferences, setPreferences] = useState<Preferences>({
    fitnessLevel: 'Beginner',
    daysPerWeek: '3',
    duration: '',
    equipment: ['Bodyweight'],
    desiredGoals: Array(3).fill(''),
    excludedGoals: [],
    specificDays: [],
    height: '',
    weight: '',
    injuries: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for managing dismissible UI notices.
  const [showInfo, setShowInfo] = useState(() => !localStorage.getItem('kinetix-info-seen'));
  const [isInfoFadingOut, setIsInfoFadingOut] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [isNoticeFadingOut, setIsNoticeFadingOut] = useState(false);
  
  // State for progressive disclosure of advanced options.
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // --- EFFECTS ---

  // Effect to automatically hide the "AI Features" info box after a delay.
  useEffect(() => {
    if (showInfo) {
      localStorage.setItem('kinetix-info-seen', 'true');
      const timer = setTimeout(() => {
        setIsInfoFadingOut(true);
        setTimeout(() => setShowInfo(false), 1000); // Wait for fade out to complete
      }, 30000); // 30 seconds
      return () => clearTimeout(timer);
    }
  }, [showInfo]);

  // Effect to automatically hide the "Data Safety" notice after a delay.
  useEffect(() => {
    if (showNotice) {
      const timer = setTimeout(() => {
        setIsNoticeFadingOut(true);
        setTimeout(() => setShowNotice(false), 1000);
      }, 8000); // 8 seconds
      return () => clearTimeout(timer);
    }
  }, [showNotice]);
  
  // Effect to adjust the desiredGoals array size and reset specific days when daysPerWeek changes.
  useEffect(() => {
    const numDays = parseInt(preferences.daysPerWeek, 10);
    setPreferences(prev => {
        const newGoals = Array(numDays).fill('');
        // Preserve existing goals if the array shrinks or grows
        for (let i = 0; i < Math.min(prev.desiredGoals.length, numDays); i++) {
            newGoals[i] = prev.desiredGoals[i];
        }
        // Reset specific days when the total number of workout days changes.
        return { ...prev, desiredGoals: newGoals, specificDays: [] };
    });
  }, [preferences.daysPerWeek]);

  // --- HANDLERS ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const handleEquipmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setPreferences(prev => {
      const equipment = checked
        ? [...prev.equipment, value]
        : prev.equipment.filter(item => item !== value);
      return { ...prev, equipment };
    });
  };
  
  const handleExclusionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setPreferences(prev => {
      const excludedGoals = checked
        ? [...prev.excludedGoals, value]
        : prev.excludedGoals.filter(item => item !== value);
      return { ...prev, excludedGoals };
    });
  };

  const handleSpecificDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setPreferences(prev => {
        let newSpecificDays = [...prev.specificDays];
        if (checked) {
            // Only add if we haven't reached the max number of days allowed by preferences.
            if (newSpecificDays.length < parseInt(prev.daysPerWeek, 10)) {
                newSpecificDays.push(value);
            }
        } else {
            newSpecificDays = newSpecificDays.filter(day => day !== value);
        }
        return { ...prev, specificDays: newSpecificDays };
    });
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLSelectElement>, index: number) => {
    const { value } = e.target;
    setPreferences(prev => {
        const newGoals = [...prev.desiredGoals];
        newGoals[index] = value;
        return { ...prev, desiredGoals: newGoals };
    });
  };
  
  /**
   * Opens a file dialog to allow the user to import a previously exported JSON file.
   */
  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    if (data.plan && data.workoutHistory) {
                        onImportData(data);
                    } else {
                        setError('Invalid import file format.');
                    }
                } catch (err) {
                    setError('Failed to read or parse the import file.');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
  };

  /**
   * Handles the form submission, calls the AI service to generate a plan,
   * and then passes the new plan to the parent component.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
        setError("You are offline. Please connect to the internet to generate a plan.");
        return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Pass history only if it exists, to trigger progressive overload.
      const plan = await generateWorkoutPlan(preferences, history.length > 0 ? history : undefined);
      onPlanGenerated(plan, preferences);
    } catch (err: any) {
      setError(err.message || 'Failed to generate workout plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const availableGoalOptions = goalOptions.filter(g => !preferences.excludedGoals.includes(g));
  const allGoalsSpecified = preferences.desiredGoals.every(goal => goal);

  return (
    <div className={layout.container}>
      <div className="text-center mb-8">
        <h1 className={typography.h1}>
            Kinetix Fitness <span className={typography.accent}>AI</span>
        </h1>
        <p className={`${typography.pMuted} max-w-2xl mx-auto`}>
            Describe your fitness goals, and let our advanced AI craft the perfect, personalized workout plan for you in seconds.
        </p>
      </div>

      <div className="relative mb-8">
        {showInfo ? (
            <div className={isInfoFadingOut ? 'animate-fade-out' : ''}>
                <AIFeatures />
            </div>
        ) : (
            <div className="text-right">
                <button 
                  onClick={() => { setShowInfo(true); setIsInfoFadingOut(false); }} 
                  className={button.icon}
                  aria-label="Show AI feature information"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`${card.base} p-6 space-y-6`}>
        {/* --- CORE PREFERENCES --- */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
            <div>
                <label htmlFor="fitnessLevel" className={typography.label}>Fitness Level</label>
                <select id="fitnessLevel" name="fitnessLevel" value={preferences.fitnessLevel} onChange={handleInputChange} className={form.select}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                </select>
            </div>
            <div>
                <label htmlFor="daysPerWeek" className={typography.label}>Workouts per Week</label>
                <select id="daysPerWeek" name="daysPerWeek" value={preferences.daysPerWeek} onChange={handleInputChange} className={form.select}>
                    {['1', '2', '3', '4', '5', '6', '7'].map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                </select>
            </div>
             <div>
                <label htmlFor="height" className={typography.label}>Height</label>
                <input type="text" id="height" name="height" value={preferences.height} onChange={handleInputChange} className={form.select} placeholder="e.g., 5' 10&quot;" required />
            </div>
            <div>
                <label htmlFor="weight" className={typography.label}>Weight (lbs)</label>
                <input type="text" id="weight" name="weight" value={preferences.weight} onChange={handleInputChange} className={form.select} placeholder="e.g., 180" required />
            </div>
        </div>
        
        <div>
            <label className={typography.label}>Available Equipment</label>
            <p className={`${typography.small} mb-3`}>Select all equipment you have access to. Bodyweight is selected by default.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {equipmentOptions.map(option => (
                    <label key={option} className={form.checkboxLabel}>
                        <input type="checkbox" value={option} checked={preferences.equipment.includes(option)} onChange={handleEquipmentChange} className="sr-only" />
                        <span className="text-sm font-medium">{option}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* --- ADVANCED OPTIONS TOGGLE --- */}
        <div className="pt-2 text-center">
            <button
                type="button"
                onClick={() => setShowAdvancedOptions(prev => !prev)}
                className={`${button.secondary} !font-semibold`}
                aria-expanded={showAdvancedOptions}
            >
                {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Customization
                <svg xmlns="http://www.w3.org/2000/svg" className={`inline-block h-5 w-5 ml-2 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </div>

        {/* --- COLLAPSIBLE ADVANCED OPTIONS --- */}
        {showAdvancedOptions && (
            <div className="space-y-6 animate-fade-in">
                <hr className="border-slate-200 dark:border-slate-700" />

                 <div>
                    <label htmlFor="injuries" className={typography.label}>Specific Injuries or Concerns (Optional)</label>
                    <p className={`${typography.small} mb-3`}>Tell the AI about any areas to avoid (e.g., "lower back pain", "sensitive knees"). The AI will create a plan that works around them.</p>
                    <input type="text" id="injuries" name="injuries" value={preferences.injuries} onChange={handleInputChange} className={form.select} placeholder="e.g., Right shoulder soreness" />
                </div>

                <div>
                    <label className={typography.label}>Assign Specific Days (Optional)</label>
                    <p className={`${typography.small} mb-3`}>Select the exact days you want to work out. The AI will structure the plan around your schedule.</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                        {weekDays.map(day => {
                            const isChecked = preferences.specificDays.includes(day);
                            const isDisabled = !isChecked && preferences.specificDays.length >= parseInt(preferences.daysPerWeek, 10);
                            return (
                                <label key={day} className={cn(form.checkboxLabel, isDisabled && form.checkboxLabelDisabled)}>
                                    <input
                                        type="checkbox"
                                        value={day}
                                        checked={isChecked}
                                        onChange={handleSpecificDayChange}
                                        disabled={isDisabled}
                                        className="sr-only"
                                    />
                                    <span className="text-sm font-medium">{day.substring(0, 3)}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className={typography.label}>Choose Your Weekly Goals (Optional)</label>
                    <p className={`${typography.small} mb-3`}>Select your desired goals. The AI will intelligently schedule them on the best days for optimal results and recovery.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {preferences.desiredGoals.map((goal, index) => (
                          <div key={index}>
                              <label htmlFor={`goal-${index}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{`Goal #${index + 1}`}</label>
                              <select
                                  id={`goal-${index}`}
                                  value={goal}
                                  onChange={(e) => handleGoalChange(e, index)}
                                  className={form.select}
                              >
                                  <option value="">Let AI Decide</option>
                                  {availableGoalOptions.map(g => <option key={g}>{g}</option>)}
                              </select>
                          </div>
                        ))}
                    </div>
                </div>
                
                <fieldset disabled={allGoalsSpecified} className="transition-opacity duration-300 ease-in-out disabled:opacity-60">
                    <label className={typography.label}>Exclude Specific Goals (Optional)</label>
                    <p className={`${typography.small} mb-3`}>
                         {allGoalsSpecified
                            ? "All goals are specified above; exclusions are not applicable."
                            : "Select any goals you want the AI to avoid when creating your plan."
                         }
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {goalOptions.map(option => {
                            const isDesired = preferences.desiredGoals.includes(option);
                            const isDisabled = isDesired || allGoalsSpecified;
                            return (
                                <label key={option} className={cn(form.checkboxLabel, isDisabled && form.checkboxLabelDisabled)}>
                                    <input
                                        type="checkbox"
                                        value={option}
                                        checked={preferences.excludedGoals.includes(option)}
                                        onChange={handleExclusionChange}
                                        disabled={isDisabled}
                                        className="sr-only"
                                    />
                                    <span className="text-sm font-medium">{option}</span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
                <hr className="border-slate-200 dark:border-slate-700" />
            </div>
        )}
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <button type="submit" disabled={isLoading || !isOnline} className={button.primary}>
          {isLoading ? (
            <>
                <svg className={spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Your Plan...
            </>
          ) : !isOnline ? 'Connect to Generate Plan' : 'Create My Workout Plan'}
        </button>

        <div className="text-center text-sm text-slate-500 dark:text-slate-500">
            or
            <button type="button" onClick={handleImportClick} className={`ml-2 ${button.link}`}>Import Existing Plan</button>
        </div>
      </form>
       <div className="h-16 mt-8 flex justify-center items-center">
        {showNotice ? (
          <div className={`${notice.warning} w-full max-w-xl transition-opacity duration-1000 ${isNoticeFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <strong>Data Safety Notice:</strong> All progress is saved locally in this browser. Use the "Export Progress" feature to create backups or transfer data.
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowNotice(true); setIsNoticeFadingOut(false); }} className="text-xs text-slate-500 dark:text-slate-500 hover:text-slate-400 font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Data Safety Notice
          </button>
        )}
      </div>
    </div>
  );
};