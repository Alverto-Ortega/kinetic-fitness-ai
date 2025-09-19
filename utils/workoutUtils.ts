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
 *    d. The specific rest time *after* the exercise is added.
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

    let totalSeconds = BASE_SETUP_TIME_SECONDS;

    workout.exercises.forEach((exercise, index) => {
        const numSets = parseInt(exercise.sets, 10) || 1;
        let workDurationPerSet = TIME_PER_RESISTANCE_SET_SECONDS; // Default for resistance exercises

        const duration = parseDuration(exercise.reps);
        if (duration !== null) {
            workDurationPerSet = duration;
        }
        
        // --- Calculate Total Time for This Exercise ---
        const totalWorkDuration = numSets * workDurationPerSet;
        const totalRestDuration = (numSets > 1) ? (numSets - 1) * exercise.rest : 0;
        
        totalSeconds += totalWorkDuration + totalRestDuration;

        // Add the specific rest time after this exercise, but not for the very last one.
        if (index < workout.exercises.length - 1) {
            // Use the AI-provided rest, or a fallback of 90 seconds if it's missing for any reason.
            totalSeconds += exercise.restAfterExercise ?? 90;
        }
    });

    // Return the total time in minutes, rounded to the nearest minute.
    return Math.round(totalSeconds / 60);
};


/**
 * Parses a string to find a duration and returns it in seconds.
 * Handles formats like "20 min", "1 minute", "60s", "45 sec", and ranges like "30-60 sec".
 * If a range is found, it returns the highest value.
 * @param repString The string to parse (from an exercise's 'reps' field).
 * @returns The duration in seconds, or null if no duration is found.
 */
export const parseDuration = (repString: string): number | null => {
  const lowerCaseRep = repString.toLowerCase();
  const numbers = lowerCaseRep.match(/\d+/g)?.map(Number);

  if (!numbers || numbers.length === 0) {
    return null;
  }

  const maxDurationValue = Math.max(...numbers);

  if (/\b(min|minute|minutes)\b/.test(lowerCaseRep)) {
    return maxDurationValue * 60;
  } else if (/\b(s|sec|second|seconds)\b/.test(lowerCaseRep)) {
    return maxDurationValue;
  }
  return null;
};