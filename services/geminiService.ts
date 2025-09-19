// Kinetix AI Service: Manages all interactions with the Google Gemini API.
import { GoogleGenAI, Type } from "@google/genai";
import { WorkoutPlan, WorkoutSession, Exercise, DayWorkout, WarmUpExercise } from "../types";

// Initialize the GoogleGenAI client, assuming API_KEY is in environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- JSON Schemas for AI Response Validation ---

/**
 * Defines the JSON schema for a single exercise object.
 * This ensures the AI returns exercise data in a structured and predictable format.
 */
const exerciseSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Name of the exercise. For advanced techniques like supersets, format the name as 'Superset: [Exercise 1] / [Exercise 2]'." },
        sets: { type: Type.STRING, description: "Number of sets, as a string (e.g., '3', '4')." },
        reps: { type: Type.STRING, description: "Target repetition range, as a string (e.g., '8-12', '5'). For Yoga, this should describe the hold duration (e.g., 'Hold for 5 breaths')." },
        rest: { type: Type.INTEGER, description: "Rest time in seconds between sets. For a superset, this should be 0." },
        suggestedWeight: { type: Type.STRING, description: "CRITICAL: The suggested starting weight. This value MUST be one of two formats ONLY: 1. A specific weight in lbs (e.g., '135 lbs'). 2. The single, exact string 'Bodyweight'. You are FORBIDDEN from combining these (e.g., 'Bodyweight + 25 lbs'). For exercises like Barbell Squats or Dumbbell Curls, provide only the weight value. For exercises like Weighted Pull-ups, provide only the *additional* weight to be used (e.g., '25 lbs')." },
        restAfterExercise: { type: Type.INTEGER, description: "Rest time in seconds AFTER completing all sets of this exercise, before starting the next one. This MUST be based on the workout goal. E.g., longer (120-180s) for Strength, shorter (30-60s) for HIIT/Endurance. The last exercise of the day MUST have a value of 0." },
    },
    required: ["name", "sets", "reps", "rest", "suggestedWeight", "restAfterExercise"],
};

/**
 * Defines the JSON schema for the entire workout plan array.
 * This is the primary schema used to structure the AI's main output.
 */
const workoutSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: {
        type: Type.STRING,
        description: "The assigned day for the workout. This MUST be a specific day of the week (e.g., 'Monday', 'Wednesday'). Do NOT use generic names like 'Day 1'."
      },
      goal: {
        type: Type.STRING,
        description: "The primary goal for this specific workout day (e.g., 'Strength', 'Hypertrophy')."
      },
      targetBodyParts: {
        type: Type.STRING,
        description: "A comma-separated list of the main muscle groups targeted in this workout (e.g., 'Chest, Triceps'). For Yoga, this could be 'Flexibility, Balance'."
      },
      exercises: {
        type: Type.ARRAY,
        items: exerciseSchema,
      },
    },
    required: ["day", "goal", "targetBodyParts", "exercises"],
  },
};

/**
 * Defines the JSON schema for an array of alternative exercises.
 */
const alternativeExerciseSchema = {
    type: Type.ARRAY,
    items: exerciseSchema,
};

/**
 * Defines the JSON schema for a single warm-up exercise.
 */
const warmUpExerciseSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Name of the warm-up exercise." },
        duration: { type: Type.STRING, description: "Duration for the exercise (e.g., '30 seconds', '1 minute')." },
        instructions: { type: Type.STRING, description: "A concise, 2-3 step guide on how to perform the movement." },
    },
    required: ["name", "duration", "instructions"],
};

/**
 * Defines the JSON schema for an entire warm-up routine (an array of warm-up exercises).
 */
const warmUpSchema = {
    type: Type.ARRAY,
    items: warmUpExerciseSchema,
};

// --- Prompt Engineering ---

/**
 * Constructs a detailed prompt for the Gemini API to generate a workout plan.
 * This function is the core of the AI's personalization, combining user preferences,
 * workout history, and a set of expert coaching rules into a single comprehensive prompt.
 * @param preferences The user's selected preferences (fitness level, equipment, etc.).
 * @param history The user's workout history, used for progressive overload.
 * @returns A string representing the full prompt to be sent to the AI.
 */
const buildPrompt = (preferences: any, history?: any[]) => {
  let prompt = `
    You are an expert fitness coach named Kinetix. Create a personalized, creative, and well-balanced workout plan based on the following user preferences.
    The response must be a valid JSON array matching the provided schema.
  `;

  if (preferences.injuries) {
    prompt += `\n\n**CRITICAL SAFETY INSTRUCTION: The user has reported an injury/concern: "${preferences.injuries}". You MUST AVOID any exercises that could strain or aggravate this area. Provide safe, effective alternatives. This instruction is your highest priority and overrides all other suggestions if there is a conflict.**\n`;
  }

  prompt += `
    User Preferences:
    - Fitness Level: ${preferences.fitnessLevel}
    - Height: ${preferences.height}
    - Weight: ${preferences.weight} lbs
    - Workouts per week: ${preferences.daysPerWeek}
    - Available Equipment: ${preferences.equipment.join(', ')}
  `;

  if (preferences.duration) {
    prompt += `\n- Desired workout duration: ${preferences.duration} minutes`;
  }

  // Add constraints for user-specified workout days.
  if (preferences.specificDays && preferences.specificDays.length > 0) {
    prompt += `\n- Specific Workout Days: ${preferences.specificDays.join(', ')}`;
    prompt += `\n  You MUST create a workout for each of these specific days. The 'day' property in the response's JSON objects must exactly match these day names (e.g., "Monday", "Wednesday").`;
  } else {
    prompt += `\n- Intelligent Day Scheduling: The user has not specified workout days. You MUST assign specific, named days of the week (e.g., 'Monday', 'Tuesday') for each workout. Structure these days intelligently across the week to maximize recovery and muscle growth. For example, a 3-day plan could be Monday, Wednesday, Friday. A 4-day plan could be Monday, Tuesday, Thursday, Friday. Use exercise science principles to create the most effective schedule. DO NOT use generic names like 'Day 1', 'Day 2'.`;
  }
  
  // Add constraints for user-defined weekly goals.
  const desiredGoals = preferences.desiredGoals?.filter((goal: string) => goal);
  if (desiredGoals && desiredGoals.length > 0) {
    prompt += `\n- User-Defined Weekly Goals: The user wants their weekly plan to include workouts with these specific goals: [${desiredGoals.join(', ')}].`;
    prompt += `\n- Goal Assignment Task: You MUST use each of these goals for one of the workout days. It is your job as an expert coach to schedule these goals on the most optimal days of the week to maximize recovery and results. For example, do not place two high-intensity workouts back-to-back. Create the most effective weekly structure using these goals.`;
  }
  
  // Add constraints for excluding specific goals.
  if (preferences.excludedGoals && preferences.excludedGoals.length > 0) {
      prompt += `\n- Excluded Goals: The user wants to avoid certain types of workouts. You MUST NOT create any workout days with these goals: [${preferences.excludedGoals.join(', ')}]. When assigning goals, you are forbidden from using these.`;
  }
  
  // Define the core coaching strategy for the AI.
  prompt += `
    \nYour Coaching Strategy:`;
    
  // Add a critical override if the user requests a plan with a single, exclusive goal.
  const uniqueDesiredGoals = new Set(desiredGoals?.filter(g => g)); // Filter out empty strings and find unique goals
  if (uniqueDesiredGoals.size === 1) {
    const exclusiveGoal = uniqueDesiredGoals.values().next().value;
    prompt += `
    1.  **CRITICAL DIRECTIVE: EXCLUSIVE '${exclusiveGoal}' PLAN:** The user has requested a plan focused exclusively on '${exclusiveGoal}'. EVERY workout day you generate for this plan MUST have the goal '${exclusiveGoal}'. You are strictly forbidden from including any other workout types. The entire plan must be a sequence of '${exclusiveGoal}' sessions.`;
  }
    
  prompt += `
    1.  **Goal Assignment:** Based on the user's preferences and any specified desired or excluded goals, you must assign an optimal goal for each workout day (e.g., 'Strength', 'Hypertrophy', 'Endurance'). Structure the goals to create a logical and scientifically-backed weekly split that promotes balance and recovery (e.g., Upper/Lower, Push/Pull/Legs).
    2.  **Creative & Advanced Exercise Selection:** Make full and varied use of ALL the user's available equipment. Avoid repetitive, generic plans. Introduce different exercises and variations that target the same muscle groups. For 'Intermediate' and 'Advanced' users, be more experimental: suggest advanced exercise variations and occasionally introduce techniques like supersets, drop sets, or pause reps. For a superset, format the exercise name as 'Superset: [Exercise 1] / [Exercise 2]', list it as one exercise item, and set its rest time to 0.
    3.  **Balanced Structure:** The overall weekly plan must be balanced, targeting all major muscle groups. Structure individual workouts logically, often starting with major compound lifts and moving to accessory/isolation work.
    4.  **Yoga Goal:** If a day's goal is 'Yoga', create a sequence of yoga poses. For each pose, structure the exercise object as follows: 'sets' should be '1', 'reps' should describe the hold duration (e.g., 'Hold for 5 breaths', '30-60 second hold'), 'rest' should be a short transition time (e.g., 10-15 seconds), and 'suggestedWeight' must be 'Bodyweight'. Target body parts should be something like 'Flexibility, Balance'.
    5.  **Inter-Exercise Rest:** You MUST set the 'restAfterExercise' property for each exercise. This is the rest period *before the next exercise begins*. Base this on the day's goal:
        -   **Strength/Hypertrophy:** Use longer rests (120-180 seconds) to allow for near-full recovery between compound movements.
        -   **Endurance/Fat Loss (HIIT):** Use shorter rests (30-90 seconds) to maintain an elevated heart rate and metabolic stress.
        -   **Yoga:** Use minimal rests (10-30 seconds) to facilitate smooth transitions between poses.
        -   **CRITICAL RULE:** The very last exercise of the day's workout MUST have a 'restAfterExercise' value of exactly 0.
  `;

  // Add workout history to the prompt for progressive overload.
  if (history && history.length > 0) {
    const recentHistory = history.slice(-5); // Use last 5 sessions for context.
    prompt += `
      \n**CRITICAL: PROGRESSIVE OVERLOAD STRATEGY**
      You MUST use the user's recent workout history and their 'effort' feedback to inform the new plan. The goal is gradual, science-based progression.
      
      User's Recent Workout History (for context):
      ${JSON.stringify(recentHistory, null, 2)}
      
      **Follow these rules for EACH exercise in the new plan:**
      1.  **Analyze Feedback:** Find the most recent performance for the exercise in the history provided. Look at the 'effort' rating ('Easy', 'Good', 'Hard').
      2.  **If Effort was 'Easy':** The user is finding it too light and is ready for a significant challenge.
          - **Primary Method (Weight Increase):** Suggest a reasonable but definite weight increment. For major barbell lifts (squats, deadlifts, bench), a 5-10 lbs increase is appropriate. For dumbbell/accessory lifts, suggest 2.5-5 lbs.
          - **Alternative Method (Advanced Variation):** If weight cannot be increased, or for bodyweight exercises, you MUST suggest a more mechanically difficult variation (e.g., progress from Push-ups to Archer Push-ups).
      3.  **If Effort was 'Good':** The user is challenged but succeeding. Progression should be steady.
          - **Primary Method (Volume or Slight Weight Increase):** Suggest either a small weight increase (see 'Easy' rule) OR add one repetition to their target range (e.g., '8-12' becomes '9-13'). Choose the method that seems most appropriate.
      4.  **If Effort was 'Hard':** The user is at their current limit. Do not increase the weight.
          - **Method:** Keep the 'suggestedWeight' THE SAME as their last performance. Instead, focus on volume. You can either increase the target repetitions by one (e.g., from '8-12' to '8-13') OR add one additional set. Do not do both. This builds their capacity at the current weight.
      5.  **If No Feedback or New Exercise:** If an exercise is new or lacks an 'effort' rating in recent history, be conservative. Base the 'suggestedWeight' on their fitness level, height, and weight, aiming for a moderate challenge they can complete with good form.
      6.  **Maintain Consistency:** When creating a progression, do not drastically change the exercise unless a more advanced variation is explicitly chosen as the progression method. The user expects to see familiar exercises getting harder over time.
    `;
  } else {
    prompt += `\nThis is the user's first plan. Start with foundational exercises suitable for their fitness level.`
  }

  // Add final critical rules for the AI to follow.
  prompt += `
    \nImportant Rules:
    1.  **Personalization Context:** Use the user's height, weight, fitness level, and history to inform suggestions for appropriate starting weights and overall exercise difficulty.
    2.  Only include exercises performable with the user's available equipment.
    3.  The number of workout days in the plan must exactly match the "Workouts per week" preference.
    4.  Structure the weekly plan to allow for adequate muscle recovery between sessions.
    5.  **Equipment Context Awareness:** Be mindful of the practical limitations of equipment. For example, if a user has 'Barbell' but NOT 'Squat Rack' or 'Power Rack' in their equipment list, you MUST NOT suggest heavy Barbell Squats that require racking from shoulder height. Instead, suggest safe alternatives like Goblet Squats, Zercher Squats (lifted from the floor), or other leg exercises. Apply this same logic to other exercises like heavy Overhead Press or Bench Press if a rack with spotter arms isn't available.
    6.  **CRITICAL 'suggestedWeight' FORMATTING:** The 'suggestedWeight' field MUST follow strict rules. It can ONLY be a specific weight (e.g., "135 lbs") OR the single word "Bodyweight". Under NO circumstances should you combine them (e.g., "Bodyweight + 25 lbs"). For exercises like Barbell Squats, Bench Press, or Dumbbell Curls, this value represents the total weight to be lifted. For weighted bodyweight exercises like Dips or Pull-ups, this value represents ONLY the *added* weight.
    7.  Use specialized equipment like 'Boxing Heavy Bag' or 'Elliptical Machine' appropriately for cardio, HIIT, warm-ups, or cool-downs.
  `;

  return prompt;
};

// --- API Service Functions ---

/**
 * Generates a new workout plan by calling the Gemini API.
 * @param preferences The user's preferences for the new plan.
 * @param history Optional user workout history to inform the plan.
 * @returns A promise that resolves to a `WorkoutPlan` object.
 * @throws An error if the AI fails to generate a valid plan.
 */
export const generateWorkoutPlan = async (preferences: any, history?: any[]): Promise<WorkoutPlan> => {
  const prompt = buildPrompt(preferences, history);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: workoutSchema,
      }
    });
    
    const jsonText = response.text.trim();
    const plan = JSON.parse(jsonText);
    return plan as WorkoutPlan;

  } catch (error) {
    console.error("Error generating workout plan:", error);
    throw new Error("The AI failed to generate a valid plan. This can happen with very specific or conflicting requests. Please try adjusting your preferences.");
  }
};

/**
 * Generates a tailored, dynamic warm-up routine for a specific workout session.
 * @param workout The DayWorkout object for which to generate a warm-up.
 * @returns A promise that resolves to an array of `WarmUpExercise` objects.
 */
export const generateWarmUp = async (workout: DayWorkout): Promise<WarmUpExercise[]> => {
    const prompt = `
        You are an expert fitness coach. Generate a 5-7 minute, science-based dynamic warm-up routine tailored for the following workout session.
        The warm-up must prepare the main muscle groups to be trained: ${workout.targetBodyParts}.
        It should focus on mobility drills and light cardio to increase blood flow and prepare the body for the main exercises.
        Do NOT include static stretching.
        
        The response MUST be a valid JSON array of 4-6 exercise objects, matching the provided schema.
        For each object, provide a "name", a "duration", and concise, step-by-step "instructions" on how to perform the movement.

        Workout to prepare for:
        - Goal: ${workout.goal}
        - Exercises: ${workout.exercises.map(e => e.name).join(', ')}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: warmUpSchema,
            }
        });
        const jsonText = response.text.trim();
        const warmUp = JSON.parse(jsonText);
        return warmUp as WarmUpExercise[];
    } catch (error) {
        console.error("Error generating warm-up:", error);
        // Provide a generic fallback warm-up on error.
        return [
            { name: "Jumping Jacks", duration: "60 seconds", instructions: "Stand with feet together and arms at your sides. Jump up, spreading your feet while raising your arms overhead. Return to the start." },
            { name: "Arm Circles", duration: "30 seconds", instructions: "Stand with arms extended to your sides. Make small circles, gradually increasing the size. Reverse direction halfway through." },
            { name: "Leg Swings (Forward & Sideways)", duration: "30 seconds per leg", instructions: "Hold onto a support. Swing one leg forward and backward, then side to side, in a controlled manner." },
            { name: "Cat-Cow Stretch", duration: "60 seconds", instructions: "Start on your hands and knees. Inhale as you drop your belly and look up (Cow). Exhale as you round your spine and tuck your chin (Cat)." },
            { name: "Bodyweight Squats", duration: "60 seconds", instructions: "Stand with feet shoulder-width apart. Lower your hips as if sitting in a chair, keeping your chest up. Push through your heels to return to standing." },
        ];
    }
};

/**
 * Fetches a single alternative warm-up exercise from the Gemini API.
 * @param exerciseToReplace The exercise the user wants to swap.
 * @param currentWarmUp The list of current warm-up exercises to avoid duplicates.
 * @returns A promise that resolves to a single `WarmUpExercise` object.
 */
export const getAlternativeWarmUpExercise = async (exerciseToReplace: WarmUpExercise, currentWarmUp: WarmUpExercise[]): Promise<WarmUpExercise> => {
    const prompt = `
        You are an expert fitness coach. A user needs an alternative for the warm-up exercise "${exerciseToReplace.name}".
        Generate a single, different dynamic warm-up exercise that serves a similar purpose (e.g., mobility, activation).
        
        The alternative MUST NOT be any of the following exercises already in their routine:
        ${currentWarmUp.map(e => e.name).join(', ')}

        The response must be a single valid JSON object matching the provided schema, including a "name", "duration", and "instructions".
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: warmUpExerciseSchema,
            }
        });
        const jsonText = response.text.trim();
        const alternative = JSON.parse(jsonText);
        return alternative as WarmUpExercise;
    } catch (error) {
        console.error("Error generating alternative warm-up exercise:", error);
        // Fallback to a simple, common alternative.
        return {
            name: "High Knees",
            duration: "45 seconds",
            instructions: "Stand in place. Drive one knee up towards your chest, then quickly switch to the other leg, as if running in place."
        };
    }
};


/**
 * Fetches two alternative exercises for a given exercise from the Gemini API.
 * @param exercise The original exercise to find alternatives for.
 * @param availableEquipment The user's available equipment.
 * @param currentDayExercises A list of exercises already in the day's plan to avoid duplicates.
 * @returns A promise that resolves to an array of two `Exercise` objects.
 */
export const getAlternativeExercises = async (exercise: Exercise, availableEquipment: string[], currentDayExercises: string[]): Promise<Exercise[]> => {
  const prompt = `
    You are an expert fitness coach. A user wants alternative exercises for the following workout:

    Original Exercise:
    - Name: ${exercise.name}
    - Sets: ${exercise.sets}
    - Reps: ${exercise.reps}
    - Suggested Weight: ${exercise.suggestedWeight}

    The user has the following equipment available: ${availableEquipment.join(', ')}.

    Generate exactly two alternative exercises. The response must be a valid JSON array matching the provided schema.

    Follow these logic steps:
    1.  Analyze the original exercise. Is it an equipment-based exercise (uses dumbbells, barbells, kettlebells, weight machines, etc.) or is it a bodyweight exercise? Exclude cardio machines like treadmills or ellipticals from this equipment consideration.
    2.  If it is an equipment-based exercise:
        - Alternative 1: Provide a different exercise using the user's available equipment that targets similar muscles.
        - Alternative 2: Provide a bodyweight exercise that targets similar muscles. This exercise can use common household objects like a chair if needed.
    3.  If it is a bodyweight exercise:
        - Analyze if the exercise requires an object (e.g., 'Chair Dips', 'Box Jumps', 'Pull-ups' on a bar).
        - If it DOES require an object:
            - Alternative 1: Provide a bodyweight exercise with a similar goal that requires NO external objects or equipment at all.
            - Alternative 2: Provide another different bodyweight exercise that also requires NO external objects.
        - If it DOES NOT require an object (e.g., 'Push-ups', 'Squats'):
            - Alternative 1: Provide a more challenging bodyweight variation of the original exercise.
            - Alternative 2: Provide an easier bodyweight variation of the original exercise.

    Critical Rule: The generated alternative exercises MUST NOT be any of the following, as they are already in the user's plan for today: ${currentDayExercises.join(', ')}.

    For each alternative, provide the name, sets, reps, rest, suggestedWeight, and an appropriate 'restAfterExercise'. The sets, reps, and rest should be similar to the original exercise. The alternatives must be different from the original exercise.
  `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: alternativeExerciseSchema,
            }
        });

        const jsonText = response.text.trim();
        const alternatives = JSON.parse(jsonText);
        return alternatives as Exercise[];
    } catch (error) {
        console.error("Error generating alternative exercises:", error);
        return [];
    }
};

/**
 * Fetches an alternative progression method for an exercise if the user cannot increase weight.
 * @param exercise The exercise needing a new progression.
 * @param lastWeight The last weight the user successfully lifted.
 * @returns A promise that resolves to a single `Exercise` object with modified parameters (e.g., more sets/reps).
 */
export const getAlternativeProgression = async (exercise: Exercise, lastWeight: string): Promise<Exercise> => {
    const prompt = `
        You are an expert fitness coach. A user has been advised to increase the weight for an exercise but they do not have access to heavier weights. Your task is to provide a single, effective alternative progression method that increases the challenge without increasing the weight.

        Original Exercise Parameters:
        - Name: ${exercise.name}
        - Sets: ${exercise.sets}
        - Reps: ${exercise.reps}
        - Rest: ${exercise.rest}
        - Current Weight: ${lastWeight}
        - Rest After Exercise: ${exercise.restAfterExercise}

        The AI previously suggested increasing the weight to ${exercise.suggestedWeight}. Instead, modify one or more of the other parameters to achieve progressive overload.

        Your options for modification are:
        1. Increase the number of sets (e.g., from 3 to 4).
        2. Increase the number of repetitions per set (e.g., from '8-12' to '10-15').
        3. Decrease the rest time between sets (e.g., from 90 to 75 seconds).

        Return a single, complete exercise object in JSON format, matching the provided schema. The 'suggestedWeight' field should remain the same as the user's current weight ('${lastWeight}'). Do not change the exercise name. Pick only ONE modification method. Ensure the 'restAfterExercise' value is preserved from the original.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: exerciseSchema,
            }
        });

        const jsonText = response.text.trim();
        const alternative = JSON.parse(jsonText);
        return alternative as Exercise;
    } catch (error) {
        console.error("Error generating alternative progression:", error);
        // Fallback to a simple progression: add one set.
        const fallback = { ...exercise };
        const sets = parseInt(fallback.sets, 10);
        fallback.sets = String(sets + 1);
        fallback.suggestedWeight = lastWeight;
        return fallback;
    }
};

/**
 * Fetches a concise, step-by-step description of how to perform an exercise.
 * @param exerciseName The name of the exercise.
 * @returns A promise that resolves to a string containing the instructions.
 */
export const getExerciseDescription = async (exerciseName: string): Promise<string> => {
  const prompt = `
    You are a master fitness instructor. Provide a concise, step-by-step guide on how to perform the following exercise: "${exerciseName}".
    Focus on proper form and safety. Use simple language.
    Keep the description to 3-4 short, clear steps or a single paragraph.
    Do not add any introductory or concluding sentences like "Here's how to do it:" or "Remember to...". Just provide the instructions directly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error(`Error generating description for ${exerciseName}:`, error);
    return "Could not load exercise description. Please ensure proper form based on your knowledge.";
  }
};

/**
 * Analyzes a user-provided image for a general body composition assessment using a multimodal model.
 * @param imageDataBase64 The base64-encoded string of the image.
 * @param mimeType The MIME type of the image (e.g., "image/jpeg").
 * @returns A promise that resolves to a string with the AI's analysis.
 * @throws An error if the analysis fails.
 */
export const analyzeBodyComposition = async (imageDataBase64: string, mimeType: string): Promise<string> => {
  const imagePart = {
    inlineData: {
      data: imageDataBase64,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: `
      You are Kinetix, an expert and encouraging AI fitness coach. Analyze the user's physique from the provided image with a creative and detailed eye. Your goal is to provide a motivational and insightful analysis that helps them track their progress.

      Your response MUST follow this structure:
      1.  **Overall Impression:** Start with a positive, one-sentence summary.
      2.  **Key Strengths:** Identify 2-3 specific, well-developed muscle groups. Use descriptive language (e.g., "well-defined deltoids," "visible abdominal separation," "strong quadriceps sweep"). Be specific.
      3.  **Areas for Focus:** Constructively suggest 2-3 areas for improvement to create a more balanced and aesthetic physique (e.g., "focusing on upper chest development for a fuller look," "enhancing lat width for a stronger V-taper," "improving core stability").
      4.  **Actionable Tip:** Provide one specific exercise suggestion that directly relates to one of the 'Areas for Focus'.

      **CRITICAL SAFETY RULES:**
      - You are STRICTLY FORBIDDEN from estimating body fat percentage.
      - You MUST NOT give any medical advice or diagnose any conditions.
      - Keep the tone positive, motivational, and focused on fitness and muscle development.
      - The response should be a concise, multi-point summary, not a long paragraph.
    `
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
    });
    return response.text;
  } catch (error: any) {
    console.error("Error analyzing body composition:", error);
    // Check if the error is due to safety filters blocking the prompt/image.
    if (error.toString().includes('SAFETY')) {
        throw new Error("Analysis failed because the image was blocked for safety reasons. Please use a different, appropriate photo for your physique analysis.");
    }
    throw new Error("Failed to analyze image. The photo may be unclear or there was a network issue. Please try again.");
  }
};

/**
 * Generates a brief, insightful summary of the user's recent workout performance.
 * @param history The user's entire workout history.
 * @param plan The user's current workout plan for context.
 * @returns A promise that resolves to a summary string.
 */
export const getWorkoutSummary = async (history: WorkoutSession[], plan: WorkoutPlan | null): Promise<string> => {
    if (history.length === 0) {
        return "Complete a workout to get your first AI insight!";
    }
    const lastSession = history[history.length - 1];
    const plannedWorkout = plan?.find(p => p.day === lastSession.day);

    let prompt = `
        You are Kinetix, a data-driven and motivational AI fitness coach. Your task is to analyze the user's most recent workout session and provide a specific, insightful, and encouraging 1-2 sentence summary. Do not use markdown.

        **CRITICAL ANALYSIS INSTRUCTIONS:**
        1.  **Identify the Single Best Achievement:** Scrutinize the 'completedSession' data. Your primary goal is to find the most impressive accomplishment. Look for one of these, in order of importance:
            a. **Personal Record (PR):** Compare an exercise in 'completedSession' against the user's ENTIRE 'workoutHistory'. Did they lift more weight for the same or more reps? Or more reps with the same weight? If so, this is a PR.
            b. **Volume Increase:** For a major compound lift, calculate the total volume (sets x reps x weight) and see if it's a significant increase from the last time they performed it.
            c. **Pushing Through a Challenge:** Did the user rate a heavy, difficult exercise as 'Hard'? This shows they are working at their limit, which is key for progress.
            d. **Great Consistency:** Did the user perfectly hit or exceed their target reps on all sets of an exercise?

        2.  **Craft the Summary:**
            *   **Sentence 1:** State the specific achievement you found. MENTION THE EXERCISE BY NAME AND USE THE ACTUAL NUMBERS (weight, reps). Be enthusiastic.
            *   **Sentence 2:** Connect this achievement to their future progress. Give a short, encouraging follow-up.
        
        **RESPONSE EXAMPLES:**
        *   (PR Example): "Incredible push on the Barbell Squats! Hitting 225 lbs for 5 reps is a new personal record. That strength is really starting to show."
        *   (Effort Example): "That was a tough session, and you rated the Deadlifts as 'Hard'. Pushing yourself like that is exactly what builds long-term strength."
        *   (Consistency Example): "Excellent consistency on the Dumbbell Press today, hitting all your target reps across every set. That's how you build a rock-solid foundation."
        *   (Swap/Incomplete Fallback): "Nice work swapping in Dumbbell Rows! I see you managed to pull a solid 50 lbs for 10 reps on them."

        ---
        **DATA FOR ANALYSIS:**

        **1. The Completed Session (Most Recent):**
        ${JSON.stringify(lastSession, null, 2)}
        
        **2. The Originally Planned Workout for that Day:**
        ${plannedWorkout ? JSON.stringify(plannedWorkout, null, 2) : '(Plan data not available, base your analysis only on the completed session\'s data.)'}

        **3. The User's Entire Workout History (for PR comparison):**
        ${JSON.stringify(history, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating workout summary:", error);
        return "Couldn't generate a summary, but you're doing great. Keep it up!";
    }
};

/**
 * Analyzes the user's last workout phase to see if they are progressing rapidly.
 * This is used to proactively suggest increasing workout frequency.
 * @param preferences The user's current preferences.
 * @param lastPhaseHistory The workout history from the most recently completed plan.
 * @returns A promise resolving to "add_day" or "none".
 */
export const checkProgressForScheduleChange = async (preferences: any, lastPhaseHistory: WorkoutSession[]): Promise<string> => {
    const daysPerWeek = parseInt(preferences.daysPerWeek, 10);
    // Don't suggest increasing frequency if already high.
    if (daysPerWeek >= 4) {
        return "none";
    }

    const prompt = `
        You are an AI fitness coach analyzing a user's performance.
        The user currently works out ${daysPerWeek} days per week.
        Here is their performance from their last completed workout phase:
        ${JSON.stringify(lastPhaseHistory, null, 2)}

        Analyze the 'effort' ratings for each exercise. "Rapid progress" is defined as a scenario where more than half of the exercises are rated 'Good' or 'Easy'.
        
        Based on this definition, is the user showing "rapid progress"?

        Your response MUST be a valid JSON object with a single key "suggestion".
        - If the user is showing rapid progress, respond with: {"suggestion": "add_day"}
        - In all other cases (e.g., progress is normal, or most exercises are 'Hard'), respond with: {"suggestion": "none"}
    `;

    const suggestionSchema = {
        type: Type.OBJECT,
        properties: {
            suggestion: { type: Type.STRING, description: "Either 'add_day' or 'none'." },
        },
        required: ["suggestion"],
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: suggestionSchema,
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result.suggestion || "none";
    } catch (error) {
        console.error("Error checking for schedule change suggestion:", error);
        return "none"; // Default to no suggestion on error.
    }
};