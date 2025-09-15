/** Represents a single exercise within a workout. */
export interface Exercise {
  /** The name of the exercise (e.g., "Bench Press"). */
  name: string;
  /** The number of sets, as a string (e.g., "3"). */
  sets: string;
  /** The target repetition range, as a string (e.g., "8-12"). */
  reps: string;
  /** Rest time in seconds between sets. */
  rest: number;
  /** AI's suggested starting weight (e.g., "135 lbs") or "Bodyweight". */
  suggestedWeight?: string;
}

/** Defines the structure for a single day's workout session within a plan. */
export interface DayWorkout {
  /** The designated day for the workout (e.g., "Monday", "Day 1"). */
  day: string;
  /** The primary fitness goal for this specific day (e.g., "Strength"). */
  goal: string;
  /** A comma-separated list of the main muscle groups targeted. */
  targetBodyParts: string;
  /** An array of Exercise objects for this day's session. */
  exercises: Exercise[];
}

/** A workout plan is an array of DayWorkout objects, representing a full week's schedule. */
export type WorkoutPlan = DayWorkout[];

/** Records the performance of a single set of an exercise. */
export interface PerformedSet {
  /** The number of repetitions completed. */
  reps: number;
  /** The weight used for the set, in pounds. Optional for bodyweight exercises. */
  weight?: number;
}

/** Records the full performance of a single exercise within a completed session. */
export interface PerformedExercise {
  /** The name of the exercise that was performed. */
  exerciseName: string;
  /** An array of sets that were completed for this exercise. */
  sets: PerformedSet[];
  /** User's subjective feedback on the exercise's difficulty. */
  effort?: 'Easy' | 'Good' | 'Hard';
}

/** Represents a fully completed workout session, saved to the user's history. */
export interface WorkoutSession {
  /** The ISO 8601 timestamp of when the session was completed. */
  date: string;
  /** The designated day of the workout from the plan (e.g., "Monday"). */
  day: string;
  /** An array of exercises performed during the session. */
  exercises: PerformedExercise[];
}

/** Stores the result of a single AI physique analysis. */
export interface BodyAnalysis {
  /** The ISO 8601 timestamp of when the analysis was performed. */
  date: string;
  /** The text result returned by the AI. */
  result: string;
}

/** Represents a single warm-up exercise. */
export interface WarmUpExercise {
  /** The name of the warm-up movement (e.g., "Jumping Jacks"). */
  name: string;
  /** The duration for the movement, as a string (e.g., "30 seconds"). */
  duration: string;
  /** A concise, step-by-step guide on how to perform the movement. */
  instructions?: string;
}

/** Defines the structure of the user's preferences for generating a workout plan. */
export interface Preferences {
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  daysPerWeek: string;
  duration: string;
  equipment: string[];
  desiredGoals: string[];
  excludedGoals: string[];
  specificDays: string[];
  height: string;
  weight: string;
  injuries: string;
}
