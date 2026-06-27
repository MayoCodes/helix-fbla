# Helix - 3D Virtual Pet Care Platform

> **FBLA Introduction to Programming | 2025-2026** | **Topic:** Build a Virtual Pet

Helix is a browser-based virtual pet care platform where users adopt a 3D-rendered Cat, Dog, or Bird and keep it healthy through daily care actions, tasks, and in-app purchases. Every action has a dollar cost tracked against a monthly $500 budget. Expenses are categorized and shown in Chart.js dashboards, and purchases are blocked once the budget runs out.

---

## Features

<details>
<summary><strong>Pet Customization</strong></summary>

Users pick a pet type (Cat, Dog, or Bird), give it a name, and buy accessories from the 3D Shop. Each type has unique personality traits, task sets, and a live Babylon.js 3D model. Multiple pets can be owned and switched between at any time using the shared bottom navigation bar.

</details>

<details>
<summary><strong>Pet Care Actions</strong></summary>

| Action | Stat Effects | Cost | XP |
|---|---|---|---|
| Feed | +30 Fullness, +5 Health, +10 Happiness | $10 | 10 |
| Play with Toy | +20 Happiness, -15 Energy, -10 Fullness | $15 | 15 |
| Rest | +40 Energy, +5 Health | Free | 5 |
| Health Check at Vet | Health restored to 100 | $50 | 20 |

</details>

<details>
<summary><strong>Emotion and Reaction System</strong></summary>

The pet's mood appears as an icon in the stat board and a speech bubble above the 3D model, driven by the combined state of all four stats. The AI chat panel generates stat-aware dialogue and flags concerns when something needs attention.

</details>

<details>
<summary><strong>Pet Growth and Progression</strong></summary>

Pets earn XP from care actions and tasks. Leveling up gives 50 bonus coins, restores +20 Health and Happiness, and raises the next XP threshold by 50%. Bond points from completed tasks drive age stage progression: Baby (0-24), Young (25-49), Adult (50-74), Senior (75-100).

</details>

<details>
<summary><strong>AI-Powered Features</strong></summary>

Helix uses the Anthropic Claude API for an **AI Task Generator** that creates personalized daily tasks based on the pet's current stats, and an **AI Chat Panel** where the pet responds in character based on its live mood. Additionally, Helix integrates the **Cerebras API** running `llama-4-scout-17b-16e-instruct` for fast, low-latency AI inference on select features.

</details>

<details>
<summary><strong>3D Accessory Shop</strong></summary>

Nine purchasable accessories (collars, hats, glasses, bow ties, etc.) are displayed as interactive Three.js 3D models with full rotation. Prices range from $35-$250 and a confirmation modal validates the user's coin balance before purchase.

</details>

<details>
<summary><strong>Interactive Tutorials</strong></summary>

Each page features an interactive guided tour powered by the `TutorialGuide` system. Users click through steps, highlighted elements glow to draw attention, and the guide walks through key features with clickable prompts.

</details>

<details>
<summary><strong>Real-Time Database Sync</strong></summary>

All pet data, budgets, and user information sync in real-time across pages using Firestore's `onSnapshot` listener. Changes made on one page (e.g., buying food in the Kitchen) immediately reflect on all other pages.

</details>

---

## Program Structure

Helix is a multi-page HTML/JS/CSS application backed by Firebase. Each page is self-contained, pulls shared libraries via CDN, and loads `app.js` for auth, loading overlays, and notifications. All pet state persists in Cloud Firestore under the user's UID.

```
helix-fblav2/
├── index.html            # Landing page with auth modal
├── home.html             # Main gameplay screen (Babylon.js 3D pet, vitals overlay)
├── kitchen.html          # Nutrition/food purchase page with interactive dishes
├── park.html             # Play area with sprite sheet animations
├── vet.html              # Vet clinic with treatment plans and emergency simulator
├── dash.html             # Analytics dashboard (Chart.js + expense tracking)
├── shop.html             # 3D accessory shop (Three.js)
├── carepage.html         # Care center with tasks and daily activities
├── instruct.html         # Instructions and help
├── privacy.html          # Privacy policy
├── support.html          # Support page
│
├── shared-navbar.js      # Bottom navigation bar (shared across all pages)
├── tutorial-popup.js     # Interactive guided tour system (TutorialGuide)
├── tutorial-popup.css    # Tutorial popup styles
├── app.js                # Shared auth, loading overlay, notifications
├── loading.js            # Loading overlay with spinner
├── overlay.js            # Floating logo button overlay
│
├── style_new.css         # Global styles
├── landing-style.css     # Landing page styles
│
├── bg.jpg, bg.hdr        # Background textures
├── dog_kitchen.png       # Kitchen backgrounds
├── cat_kitchen.png
├── bird_kitchen.png
├── clipbg.png            # Vet clipboard background
├── logo.png              # App logo
│
├── models/               # 3D GLB models (accessories)
├── api/                  # API configuration
├── models/               # 3D model files
├── node_modules/         # Dependencies
├── package.json          # Project configuration
└── README.md             # This file
```

---

## Pages

| Page | Description | Key Features |
|------|-------------|--------------|
| **index.html** | Landing page with auth modal | Google login, email/password signup |
| **home.html** | Main gameplay screen | Babylon.js 3D pet, vitals overlay, speech bubbles, left menu navigation |
| **kitchen.html** | Nutrition & food purchases | Interactive dish selection, real-time stat updates, budget tracking |
| **park.html** | Play area with animations | Sprite sheet animations (idle, tailwag, dig, backflip, rollover), XP bar |
| **vet.html** | Vet clinic with treatments | Treatment plans, intervention authorization, medical emergency simulator |
| **dash.html** | Analytics dashboard | Chart.js charts, budget breakdown, AI insights, spending forecast |
| **carepage.html** | Care center | Daily tasks, AI-generated tasks, pet care actions |
| **shop.html** | 3D accessory shop | Three.js 3D models, rotation, purchase modal |
| **privacy.html** | Privacy policy | Legal information |
| **support.html** | Support page | Help and contact information |

---

## Libraries Used

| Library | Version | Purpose |
|---|---|---|
| Firebase (App, Auth, Firestore) | 9.22.0 (compat) | Authentication and real-time database |
| Babylon.js + Loaders | Latest | 3D pet rendering and GLB model loading |
| Three.js + GLTFLoader + OrbitControls | r128 / 0.128.0 | 3D shop showcase with rotation |
| Chart.js | 4.4.1 | Doughnut, bar, and line charts on the dashboard |
| Google Fonts | N/A | Typography across all pages (Inter, Nunito, Plus Jakarta Sans, Lilita One, Outfit) |
| Cerebras API (`llama-4-scout-17b-16e-instruct`) | Latest | Fast AI inference for task generation and chat |
| Anthropic Claude API | Latest | AI-powered task generation and pet chat |

> All UI layout, design, and code was written from scratch by the competing team. No templates or starter kits were used.

---

## Shared Components

### Bottom Navigation Bar (`shared-navbar.js`)

A unified bottom navigation bar used across all pages, featuring:
- **Home** → home.html
- **Dashboard** → dash.html
- **Store** → shop.html
- **Tutorial** → Interactive guided tour for the current page
- **Pet Switcher** (center avatar) → Opens a modal to switch between pets or add new ones

### Tutorial Guide (`tutorial-popup.js`)

An interactive walkthrough system with:
- Floating text bubbles with a guide character
- Element highlighting with glowing effects
- Click-to-advance prompts
- Progress indicators
- Smart positioning that avoids overlapping elements

### Vitals Overlay

A left-side card stack (on home, kitchen, vet) showing:
- **Profile Mini Card** – Google account name, photo, level, coins
- **Vitals Card** – 4 concentric rings (Health, Energy, Fullness, Happiness) with real-time updates
- **Menu Card** – Navigation buttons to Kitchen, Park, Vet, Store

---

## Database Schema

```
users/{uid}/
├── displayName: string
├── email: string
├── photoURL: string
├── currentPetId: string
├── userData: {
│   └── costTracking: {
│       ├── budgetRemaining: number
│       ├── monthlyBudget: number
│       ├── foodSpent: number
│       ├── vetSpent: number
│       └── transactions: array
│   }
│   └── coins: number
│   └── aiTasks: array
│   └── usingAITasks: boolean
│   └── tasksCompleted: object
│
└── pets/{petId}/
    ├── name: string
    ├── type: "a" | "b" | "c" (cat, dog, bird)
    ├── age: string
    ├── level: number
    ├── experience: number
    ├── experienceToNextLevel: number
    ├── health: number (0-100)
    ├── happiness: number (0-100)
    ├── fullness: number (0-100)
    ├── energy: number (0-100)
    ├── bond: number
    ├── personality: string
    ├── lastUpdated: timestamp
    └── costTracking: { budgetRemaining, monthlyBudget, ... }
```

---

## Setup & Running

### Prerequisites
- Node.js (v14+)
- A Firebase project with Firestore and Auth enabled

### Installation
```bash
# Clone the repository
git clone https://github.com/<your-repo>/helix-fblav2.git
cd helix-fblav2

# Install dependencies
npm install

# Start the development server
npm start
```

The server will start at `http://localhost:3000` and open `index.html` in your browser.

### Firebase Configuration
The Firebase configuration is embedded in `app.js` and individual page scripts. To use your own Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project and enable **Firestore** and **Authentication** (Google provider)
3. Copy your `firebaseConfig` object
4. Replace the config in `app.js` and the relevant page scripts

---

## Attribution and Credits

| Resource | Author / Source | License | Usage |
|---|---|---|---|
| Firebase SDK | Google LLC | Apache 2.0 | Authentication and database |
| Babylon.js | Microsoft / Babylon.js contributors | Apache 2.0 | 3D pet rendering |
| Three.js | Mr.doob and contributors | MIT | 3D shop showcase |
| Chart.js | Chart.js contributors | MIT | Analytics charts |
| Google Fonts | Google LLC | SIL Open Font License | Typography |
| Cerebras API | Cerebras Systems | Proprietary (API) | Fast AI inference (`llama-4-scout-17b-16e-instruct`) |

**FBLA Topic Partnership:** This topic was created by FBLA in partnership with [code.org](https://code.org).

---

> [!IMPORTANT]
> *Helix was developed independently by the competing team. No advisers, parents, or outside individuals assisted in the planning, coding, or preparation of this project, in accordance with FBLA Competitor Responsibility guidelines.*

**FBLA Chapter:** South Brunswick High School | **Division:** High School (9th & 10th Grade)
**Event:** Introduction to Programming | **School Year:** 2025-2026
