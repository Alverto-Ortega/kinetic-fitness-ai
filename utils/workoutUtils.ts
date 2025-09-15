import { DayWorkout } from '../types';

/**
 * Calculates a more realistic estimated duration of a workout in minutes.
 * 
 * The calculation model is as follows:
 * 1. A base time is added for a general warm-up and cool-down.
 * 2. For each exercise:
 *    a. If it's a timed exercise (reps contain 'min' or 'sec'), the specified time is used as the work duration per set.
 *    b. If it's a standard resistance exercise, a generous average time per set is used to account for the set itself, plus racking/unracking weights and setup.
 *    c. Rest time between sets is added.
 * 3. A transition time between each exercise is added to account for moving around, getting water, and setting up for the next movement.
 *
 * @param workout The DayWorkout object to analyze.
 * @returns The estimated time in minutes.
 */
export const calculateEstimatedTime = (workout: DayWorkout): number => {
    // --- Configuration Constants (in seconds) ---
    // A base time to account for a brief warm-up, cool-down, and general gym setup.
    const BASE_SETUP_TIME_SECONDS = 5 * 60; // 5 minutes
    
    // Average time for a standard resistance training set, including setup and execution.
    // This is higher than just time-under-tension to be more realistic.
    const TIME_PER_RESISTANCE_SET_SECONDS = 75; // 1 minute 15 seconds

    // Time to transition between different exercises (e.g., getting water, moving to new equipment).
    const TIME_BETWEEN_EXERCISES_SECONDS = 90; // 1 minute 30 seconds

    let totalSeconds = BASE_SETUP_TIME_SECONDS;

    workout.exercises.forEach(exercise => {
        const numSets = parseInt(exercise.sets, 10) || 1;
        const repString = exercise.reps.toLowerCase();
        let workDurationPerSet = TIME_PER_RESISTANCE_SET_SECONDS; // Default for resistance exercises

        // --- Determine Work Duration ---
        // Check for timed exercises specified in minutes (e.g., "20 min run")
        if (repString.includes('min')) {
            const timeMatch = repString.match(/(\d+)/);
            if (timeMatch) {
                workDurationPerSet = parseInt(timeMatch[0], 10) * 60;
            }
        // Check for timed exercises specified in seconds (e.g., "60s plank", "45 sec hold")
        } else if (/\b\d+\s*(s|sec|second|seconds)\b/.test(repString)) {
            const timeMatch = repString.match(/(\d+)/);
            if (timeMatch) {
                workDurationPerSet = parseInt(timeMatch[0], 10);
            }
        }
        
        // --- Calculate Total Time for This Exercise ---
        const totalWorkDuration = numSets * workDurationPerSet;
        const totalRestDuration = (numSets > 1) ? (numSets - 1) * exercise.rest : 0;
        
        totalSeconds += totalWorkDuration + totalRestDuration;
    });

    // Add transition time between exercises.
    if (workout.exercises.length > 1) {
        totalSeconds += (workout.exercises.length - 1) * TIME_BETWEEN_EXERCISES_SECONDS;
    }

    // Return the total time in minutes, rounded to the nearest minute.
    return Math.round(totalSeconds / 60);
};
