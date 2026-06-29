# Helix: 3D Virtual Pet Care Platform

> FBLA Introduction to Programming, 2025-2026 topic: Build a Virtual Pet

Helix is a browser-based virtual pet platform where users adopt a cat, dog, or bird, care for its needs, build a bond, earn XP, and manage a shared account budget. The experience is split across focused gameplay pages for home interactions, feeding, play, veterinary care, analytics, and accessories.

## Current Features

- Email/password and Google authentication through Firebase Authentication
- Multiple pets per account with a shared pet selector
- Cat, dog, and bird profiles with separate stats and progression
- Health, energy, fullness, happiness, bond, level, and XP tracking
- Account-level budget shared by every pet
- Interactive 3D pets and accessories using Babylon.js and Three.js
- Sprite-sheet play animations in the Park
- Stat-aware food and veterinary interventions
- AI chat, task generation, and dashboard insights through Groq-backed endpoints
- Guided page tutorials
- Firestore persistence and live listeners on supported pages

## Main Pages

| Page | Purpose | Notable Features |
|---|---|---|
| `index.html` | Landing and authentication | Google sign-in, email sign-up, login |
| `home.html` | Main pet experience | 3D pet, vitals, tasks, AI chat, Bond/XP bar |
| `kitchen.html` | Feeding | Pet-specific dishes, stat effects, account budget deductions |
| `park.html` | Play and exercise | Pet-specific sprite animations, energy costs, XP gains |
| `vet.html` | Veterinary care | Stat-driven interventions, atomic treatment purchases, emergency simulator |
| `dash.html` | Analytics | Budget charts, pet summaries, AI-generated insights |
| `shop.html` | Accessory store | Interactive Three.js previews, purchases, shared navigation |
| `carepage.html` | Legacy care experience | Care actions and task systems retained for compatibility |
| `instruct.html` | Instructions | User help and gameplay guidance |
| `privacy.html` | Privacy | Privacy information |
| `support.html` | Support | Help and contact information |

`homepage.html`, `dashboard.html`, `dashboard-2.html`, `indexOld.html`, `teste.html`, and other test files are older or experimental implementations. New development should target the main pages listed above.

## Shared Components

### Shared navigation

`shared-navbar.js` injects the bottom navigation used by Home, Kitchen, Park, Vet, Dashboard, and Shop. It provides:

- Links to Home, Dashboard, and Store
- A page tutorial button
- A central pet selector
- An inline Add Pet flow
- Firestore persistence for the selected pet

The Add Pet form creates a document in the signed-in user's `pets` subcollection and makes that pet active.

### Tutorial system

`tutorial-popup.js` and `tutorial-popup.css` provide guided walkthroughs with highlighted elements, progress controls, and positioning rules.

### Loading and application helpers

- `app.js` contains shared Firebase initialization, authentication helpers, loading UI, and notifications for pages that include it.
- `loading.js` provides the Home loading experience.
- Some pages initialize Firebase locally because the project is a multi-page application rather than a bundled frontend.

### Legacy overlay

`overlay.js` and `nav.html` are legacy files. Current main pages do not depend on the old floating navigation button.

## Pet Systems

### Stats

Each pet has four primary care stats from 0 to 100:

- Health
- Energy
- Fullness
- Happiness

Actions update only the selected pet. Kitchen purchases affect fullness and happiness. Park actions consume energy and award XP. Vet interventions are selected from the pet's current stat thresholds.

### Bond and XP

Bond and XP are stored per pet:

- `bond` represents the relationship with the owner.
- `experience` tracks progress toward the next level.
- `experienceToNextLevel` stores the current XP target.
- `level` increases when XP reaches the target.

Home and Park display the selected pet's Bond/XP information from the same Firestore pet document.

### Park animations

Park uses 6 by 6 sprite sheets with 36 frames. The action key resolves to a different asset for each pet type. Examples include:

- Dog: `Paw.png`, `Dig.png`, `Roll.png`, `Backflip.png`
- Cat: `stalk.png`, `sprint.png`, `pounce.png`, `Twister.png`
- Bird: `Hop.png`, `wingspread.png`, `Spin.png`, `Loop.png`

### Veterinary interventions

Vet recommendations vary with health, energy, fullness, and happiness. Critical, high, medium, and routine options are generated from stat thresholds. Treatment authorization uses a Firestore transaction so the pet update and account budget deduction succeed or fail together.

## Account Budget

Money is owned by the user account, not by an individual pet. The canonical balance is:

```text
users/{uid}.userData.costTracking.budgetRemaining
```

Kitchen and Vet read and write this account-level value. Pet documents contain care and progression data, not the authoritative balance. Some legacy pages and older records may still contain copied `costTracking` fields for compatibility, but new code should not treat those copies as the source of truth.

## Firestore Structure

```text
users/{uid}
├── name: string
├── email: string
├── photoURL: string
├── createdAt: server timestamp
├── currentPetId: string
├── userData
│   └── costTracking
│       ├── totalSpent: number
│       ├── foodSpent: number
│       ├── vetSpent: number
│       ├── toySpent: number
│       ├── monthlyBudget: number
│       ├── budgetRemaining: number
│       ├── transactions: array
│       └── lastMonthReset: number
└── pets/{petId}
    ├── name: string
    ├── type: "a" | "b" | "c"
    ├── age: "baby" | "young" | "adult" | "senior"
    ├── personality: string
    ├── level: number
    ├── experience: number
    ├── experienceToNextLevel: number
    ├── health: number
    ├── energy: number
    ├── fullness: number
    ├── happiness: number
    ├── bond: number
    ├── tasksCompleted: object
    ├── aiTasks: array
    ├── usingAITasks: boolean
    ├── adoptionDate: number
    ├── lastTaskReset: number
    └── lastUpdated: number
```

Pet type values map as follows:

| Value | Pet |
|---|---|
| `a` | Cat |
| `b` | Dog |
| `c` | Bird |

## AI Integration

Current AI features use Groq-backed endpoints:

- `api/groq.js` is a serverless proxy that reads `GROQ_API_KEY` from the server environment.
- `dash.html` calls `/api/groq` and requests `llama-3.3-70b-versatile`.
- Home and Care use the configured Helix Groq worker endpoint for chat and task generation.

Do not place private API keys in browser JavaScript. Configure `GROQ_API_KEY` in the deployment environment when using the serverless API route.

## Libraries

| Library | Version or Source | Purpose |
|---|---|---|
| Firebase App, Auth, Firestore | 9.22.0 compat CDN on primary pages | Authentication and persistence |
| Babylon.js and loaders | CDN | Pet and preview rendering |
| Three.js, GLTFLoader, OrbitControls | r128 CDN | Accessory store rendering |
| Chart.js | CDN | Dashboard charts |
| Font Awesome | CDN through shared navigation | Shared pet icons |
| Google Fonts | CDN | Interface typography |
| `@gltf-transform/core` | Package dependency | GLB asset tooling |
| `@gltf-transform/functions` | Package dependency | GLB transformation helpers |

## Project Layout

```text
helix-fblav2/
├── index.html
├── home.html
├── kitchen.html
├── park.html
├── vet.html
├── dash.html
├── shop.html
├── carepage.html
├── instruct.html
├── privacy.html
├── support.html
├── app.js
├── loading.js
├── shared-navbar.js
├── tutorial-popup.js
├── tutorial-popup.css
├── vitals-overlay.js
├── api/
│   └── groq.js
├── models/
│   └── model1.glb through model9.glb
├── *.glb
├── *.png
├── package.json
└── readme.md
```

## Local Setup

### Requirements

- Node.js 18 or newer
- npm
- A Firebase project with Authentication and Firestore enabled

### Run locally

```bash
npm install
npm start
```

The start script launches `live-server` on `http://localhost:3000` and opens `index.html`.

The application should be served over HTTP rather than opened directly with `file://`. Firebase, modules, model loading, and API requests may not work correctly from a local file URL.

### Firebase configuration

Firebase configuration currently appears in `app.js` and in several self-contained pages. To use another Firebase project:

1. Create a Firebase project.
2. Enable Firestore.
3. Enable the desired Authentication providers.
4. Replace each active `firebaseConfig` object with the new project configuration.
5. Deploy Firestore security rules that restrict each user to their own user document and pet subcollection.

No Firestore rules file is currently included in this repository. Deployed rules must be reviewed separately in the Firebase console or deployment project.

## Development Notes

- Use `home.html` as the canonical home experience. `homepage.html` is legacy.
- Use `shop.html` as the store page.
- Keep budget writes under `userData.costTracking` on the user document.
- Keep stats, bond, XP, tasks, and progression on the pet document.
- Use `{ merge: true }` for partial Firestore document updates unless a full replacement is intentional.
- Prefer transactions when one action changes both a pet document and the account budget.
- Increment shared script query versions when browser caching would otherwise retain an old implementation.
- Preserve exact case in asset names. Hosting environments may treat `DogIdle.png` and `Dogidle.png` as different files.

## Attribution

| Resource | Source | License |
|---|---|---|
| Firebase SDK | Google | Apache 2.0 |
| Babylon.js | Babylon.js contributors | Apache 2.0 |
| Three.js | Three.js contributors | MIT |
| Chart.js | Chart.js contributors | MIT |
| Font Awesome Free | Fonticons | Font Awesome Free License |
| Google Fonts | Google and individual font authors | SIL Open Font License |

Project-specific code, interface design, pet logic, and integration work were created for the Helix FBLA project.
