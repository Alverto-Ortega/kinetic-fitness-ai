# Kinetix Fitness AI

<p align="center">
  <strong>An elegant, AI-powered fitness tracker that generates personalized, adaptive workout plans.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-3.x-38B2AC?logo=tailwind-css" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google" alt="Google Gemini">
</p>

<!-- Optional: Add a GIF or a banner image of the app here -->
<!-- ![Kinetix Fitness AI Demo](link_to_your_gif_or_image.gif) -->

Kinetix Fitness AI is a sophisticated single-page application that leverages the power of Google's Gemini AI to act as your personal fitness coach. It goes beyond static workout templates by creating truly personalized weekly routines based on your unique goals, fitness level, available equipment, and even physical limitations. The app tracks your progress, learns from your feedback, and automatically applies principles of progressive overload to ensure you're always advancing on your fitness journey.

All data is stored locally in your browser, ensuring 100% privacy and user control.

---

## ✨ Features

- **🤖 AI-Powered Workout Generation**: Get a complete, structured weekly workout plan in seconds.
- **🎯 Advanced Personalization**: The AI considers your fitness level, height, weight, desired goals (e.g., Strength, Yoga), and even works around specified injuries for a truly custom plan.
- **🔥 Dynamic Warm-ups**: Before each session, receive a unique, science-based dynamic warm-up tailored to that day's workout to improve performance and prevent injury.
- **🏃‍♂️ Interactive Workout Session**: A clean, guided interface for your workouts, complete with an automated rest timer and performance logging.
- **🔄 On-the-Fly Exercise Swapping**: Don't like an exercise? Get two AI-suggested alternatives with a single click.
- **📈 Intelligent Progressive Overload**: Kinetix analyzes your performance and effort feedback to automatically make future plans more challenging, ensuring you never plateau.
- **💪 AI Physique Analysis**: After completing your first phase, unlock the ability to upload a photo and receive a general physique assessment to track visual progress.
- **🚀 Automatic Next Phase Generation**: As soon as you complete your weekly plan, the AI automatically generates a new, more challenging plan for the next phase.
- **💾 Data Portability**: Your data is yours. Easily export your entire workout history and preferences to a JSON file for backup or transfer, and import it on any device.
- **🌗 Light & Dark Mode**: A beautiful, accessible interface in both light and dark themes.
- **📱 Fully Responsive**: A seamless experience across desktop, tablet, and mobile devices.
- **🌐 Offline Capability**: Once a workout is started, you can complete and log it even if your internet connection drops. AI features require an online connection.

## 📸 Screenshots

| Planner Screen | Dashboard View | Active Workout |
| :---: | :---: | :---: |
| <!-- Add Planner Screenshot Here --> | <!-- Add Dashboard Screenshot Here --> | <!-- Add Active Workout Screenshot Here --> |

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **AI**: [Google Gemini API (@google/genai)](https://ai.google.dev/docs)
- **State Management**: React Hooks (`useState`, `useEffect`, `useRef`)
- **Persistence**: Browser Local Storage for a serverless, private experience.

## 🚀 Getting Started

### Running Locally (For development outside Google AI Studio)

If you have forked this repository and wish to run it on your local machine, you will need to set up a local development environment, as the project does not include one by default.

1.  **Clone Your Fork**
    ```sh
    git clone https://github.com/YOUR_USERNAME/kinetix-fitness-ai.git
    cd kinetix-fitness-ai
    ```

2.  **Set Up a Development Server (using Vite)**
    To run this project locally, you'll need a development server. We recommend using a modern tool like [Vite](https://vitejs.dev/) for a fast and easy setup.

    a. **Initialize a `package.json` file:** If you don't have one, run:
       ```sh
       npm init -y
       ```
    b. **Install Vite and the React plugin:**
       ```sh
       npm install -D vite @vitejs/plugin-react
       ```
    c. **Add a `dev` script to your `package.json`:**
       ```json
       "scripts": {
         "dev": "vite"
       }
       ```

3.  **Set Up Your API Key**
    a. Obtain a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    b. Create a file named `.env` in the root of the project and add your API key.
    ```
    # .env
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```

4.  **Run the Development Server**
    Now, you can start the local server:
    ```sh
    npm run dev
    ```

## 📁 Project Structure

The codebase is organized to be clean and maintainable:

```
/
├── components/        # Reusable React components
├── hooks/             # Custom React hooks (useStickyState, useTimer, etc.)
├── services/          # Modules for external APIs (geminiService.ts)
├── styles/            # Theming and styling configuration (theme.ts)
├── utils/             # Helper functions (workoutUtils.ts)
├── App.tsx            # Main application component and state orchestrator
├── index.tsx          # Application entry point
└── types.ts           # TypeScript type definitions
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📜 License

Distributed under the MIT License.
## 🙏 Acknowledgments

- Created by **Alverto Ortega**
- AI-powered features assisted by **Google's Gemini API**