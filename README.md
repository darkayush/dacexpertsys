# DACexpertsys (Disciplinary Action Committee Expert System)

## Project Overview
DACexpertsys is a specialized React-based web application designed to manage and resolve disciplinary cases (likely in an educational or institutional setting). It features case registration, tracking, resolution reporting, and an intelligent rule engine for consistency in evaluating incidents.

This project is built to be modern, fast, and smooth, utilizing **Vite**, **React**, **Tailwind CSS**, **Framer Motion**, **Lenis (Smooth Scrolling)**, and **Firebase**.

---

## 🏗️ For AI Agents & Contributors: Project Architecture Guide

If you are an AI assistant or a developer contributing to this project, refer to the following structure and design patterns to ensure consistency.

### Tech Stack
- **Framework:** React (v19) + Vite
- **Styling:** Tailwind CSS (configured with PostCSS and Vite plugin)
- **Routing:** React Router v7
- **Backend/BaaS:** Firebase (Authentication and Firestore)
- **Animations:** Framer Motion (`framer-motion`)
- **Smooth Scrolling:** Lenis Utils (`lenis`)
- **Icons:** React Icons (`react-icons`)


### 📂 Directory Structure

```text
src/
├── assets/         # Static assets (images, svg, etc.)
├── components/     # Reusable UI components
│   ├── CaseResolutionCard.jsx
│   ├── EvidenceCard.jsx
│   ├── IncidentDetailsCard.jsx
│   ├── PageTransition.jsx       # Wrapper for page animation using Framer Motion
│   ├── PreviousOffencesTable.jsx
│   ├── ProgressBar.jsx
│   ├── Sidebar.jsx              # Main App Navigation
│   ├── StudentDetailsCard.jsx
│   └── TimelineCard.jsx
├── context/        # React Context Providers (e.g., AuthContext.jsx)
├── firebase/       # Firebase Initialization and Wrappers
│   ├── auth.js            # Authentication logic wrappers
│   ├── firebaseConfig.js  # Firebase init parameters
│   └── firestore.js       # Global Firestore initialization
├── hooks/          # Custom Hooks (e.g., useLenis.js for smooth scroll)
├── lib/            # External library configuration (e.g., motion.js)
├── pages/          # Main application views
│   ├── AdminSettings.jsx
│   ├── Dashboard.jsx
│   ├── ManageCase.jsx
│   ├── RegisterCase.jsx
│   ├── Reports.jsx
│   ├── ViewCase.jsx
│   ├── PlaceholderPage.jsx
│   └── admin/             # Admin-specific routes
│       ├── RulesWeights.jsx
│       ├── SystemConfig.jsx
│       └── UserManagement.jsx
├── services/       # Business Logic & DB Interactions
│   ├── caseService.js       # Handles Case CRUD operations via Firestore
│   ├── questionService.js   # Question generation or retrieval
│   ├── ruleEngine.js        # Core logic/expert system for deciding case outcomes
│   └── seedFirestore.js     # Script to populate mock/initial data
├── App.jsx         # Main App component & Route setup
├── index.css       # Global styles & Tailwind entry
└── main.jsx        # App mounting point
```

---

## 🧠 Core Design Patterns & Contribution Guidelines

When creating or modifying features, adhere to the following principles:

1. **State & Context Management:**
   - Use `AuthContext` (`src/context/AuthContext.jsx`) for accessing current user data and authentication state. 
   - Favor localized component state where possible, passing down through props for simple relationships.

2. **Styling (Tailwind):**
   - Use Tailwind utility classes directly in the `className` attributes. 
   - Avoid creating custom CSS unless absolutely necessary (if so, put it in `index.css`).

3. **Database Interactions (Firebase Firestore):**
   - **Do not write Firestore queries directly in UI components.**
   - All firestore interactions MUST be abstracted inside files in the `src/services/` directory (e.g., `caseService.js`, `questionService.js`).
   - Use async functions and handle errors appropriately before returning data to the UI layer.

4. **Animations & Transitions:**
   - Wrap pages in the exported wrapper from `PageTransition.jsx` (which relies on `framer-motion`) to ensure consistent entry/exit animations across routes.
   - For smaller interactive UI elements, reuse variants defined in `src/lib/motion.js` if available.

5. **Scroll Behaviour:**
   - The application relies on `Lenis` for smooth scrolling. This is hooked up globally via `src/hooks/useLenis.js`.

6. **The Rule Engine (`src/services/ruleEngine.js`):**
   - This seems to be the core "expert system" part of "DACexpertsys". Any logic that determines case severity, suggested actions, or automated evaluations based on rules and weights should reside here or in `src/pages/admin/RulesWeights.jsx`.

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure you have a `.env` or `.env.local` file with the relevant Firebase keys corresponding to `src/firebase/firebaseConfig.js`.

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```
