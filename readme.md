# Helix - FBLA Pet Simulator

> **FBLA Introduction to Programming | 2025-2026**
> **Topic:** Build a Virtual Pet

---

Helix is a browser-based virtual pet care platform where users adopt and raise a 3D-rendered digital companion, choosing from a Cat, Dog, or Bird, and keep it healthy through daily care actions, tasks, and in-app purchases. The pet is rendered in real time using Babylon.js and responds to the user's decisions with visible stat changes and mood expressions.

Every care action carries a dollar cost tracked against a monthly **$500 budget**, so users have to think about how they spend. Expenses are logged by category, visualized in Chart.js dashboards on the analytics page, and the system blocks purchases once the budget runs out.

---

## Table of Contents

- [How to Run](#how-to-run)
- [Features](#features)
- [Program Structure](#program-structure)
- [Data and Logic](#data-and-logic)
- [Cost of Care System](#cost-of-care-system)
- [Input Validation](#input-validation)
- [Libraries Used](#libraries-used)
- [Attribution and Credits](#attribution-and-credits)

---

## How to Run

**Requirements:** Any modern browser (Chrome, Firefox, Edge, Safari) with an active internet connection. No installation required.

**Steps:**
1. Open `index.html` in a web browser
2. Click **Sign Up** to create an account using email/password or Google Sign-In
3. You will be redirected to `homepage.html`, the main pet care screen

<details>
<summary><strong>Page Navigation Reference</strong></summary>

| Screen | How to Access |
|---|---|
| Landing Page | Open `index.html` |
| Pet Homepage (main gameplay) | Log in or sign up, auto-redirects |
| Analytics Dashboard | Chart icon in the left sidebar |
| 3D Shop | Shopping bag icon in the left sidebar |
| Instructions | Help icon in the left sidebar |

> **Tip:** On the homepage, the care panel on the bottom-left sidebar is where you feed, play with, rest, or take your pet to the vet. The stat board in the top-right corner updates after every action.

</details>

---

## Features

<details>
<summary><strong>Pet Customization</strong></summary>

When creating a new pet, users pick a type (Cat, Dog, or Bird), give it a name, and can buy accessories from the 3D Shop. Each pet type has its own personality traits, task sets, and a 3D model rendered live in Babylon.js. You can own multiple pets at once and switch between them using the pet slot bubbles at the bottom of the homepage.

</details>

<details>
<summary><strong>Pet Care Actions</strong></summary>

There are four care actions available from the care panel. Each one updates stats right away and deducts coins from the monthly budget.

| Action | Stat Effects | Cost | XP Gained |
|---|---|---|---|
| Feed | +30 Fullness, +5 Health, +10 Happiness | $10 | 10 XP |
| Play with Toy | +20 Happiness, -15 Energy, -10 Fullness | $15 | 15 XP |
| Rest | +40 Energy, +5 Health | Free | 5 XP |
| Health Check at Vet | Health restored to 100 | $50 | 20 XP |

</details>

<details>
<summary><strong>Emotion and Reaction System</strong></summary>

The pet's mood shows up as an icon in the stat board and as a speech bubble above the 3D model. Mood is determined by the combined state of all four stats: when stats are high the pet looks happy and content, but when key stats drop critically low (Fullness below 10 or Health below 30) it reacts with worried or sad expressions. The AI chat panel also generates responses based on how the pet is doing, so it will bring up problems when something needs attention.

</details>

<details>
<summary><strong>Pet Growth and Progression</strong></summary>

Pets earn XP through care actions and finished tasks. When a pet levels up, it receives **50 bonus coins**, a +20 restore to both Health and Happiness, and the XP requirement for the next level increases by 50%.

Bond points, which only come from completing daily tasks, determine the pet's current life stage:

| Stage | Bond Points Required |
|---|---|
| Baby | 0 - 24 |
| Young | 25 - 49 |
| Adult | 50 - 74 |
| Senior | 75 - 100 |

A mastery track popup shows the current stage and progress at a glance.

</details>

<details>
<summary><strong>AI-Powered Features</strong></summary>

Helix integrates the Anthropic Claude API for two features:

- **AI Task Generator** - generates personalized daily tasks based on the pet's current stats and type
- **AI Chat Panel** - the pet responds in character based on its live mood and stats

Both call the Claude Sonnet model with full context about the pet's current state so the responses are actually relevant to what is happening in the game.

</details>

<details>
<summary><strong>3D Accessory Shop</strong></summary>

The shop (`shop.html`) displays 9 purchasable accessories, including collars, hats, glasses, and bow ties, as interactive 3D models built with Three.js, GLTFLoader, and OrbitControls. Users can freely rotate each item before buying, check the price ($35-$250), and purchase if their coin balance covers it. A confirmation modal validates the balance before the transaction goes through.

</details>

---

## Program Structure

Helix is a multi-page HTML/JS/CSS application backed by Firebase. Each page is a self-contained HTML file that pulls in shared libraries via CDN and loads `app.js` for authentication, the loading overlay, and notification logic. All pet state is stored in Cloud Firestore under the user's UID.

```
helix/
├── index.html          # Landing page with auth modal
├── homepage.html       # Main gameplay screen (Babylon.js 3D pet)
├── dashboard.html      # Analytics dashboard (Chart.js + expense table)
├── shop.html           # 3D accessory shop (Three.js product showcase)
├── instruct.html       # Instructions and help page
├── nav.html            # Shared navigation component
├── app.js              # Shared: Firebase init, auth, loading overlay, notifications
└── README.md
```

<details>
<summary><strong>Key Design Decisions</strong></summary>

- Each HTML page owns its feature area. `app.js` handles the shared pieces (auth, loading, notifications) that every page needs.
- Firebase Authentication protects all gameplay pages. If you are not logged in, you get a login prompt instead of the page content.
- Every stat change, care action, and expense writes back to Firestore immediately, so data is never lost between sessions.
- Loading overlays and toast notifications are injected into the DOM at runtime rather than hardcoded into each page's HTML.
- The Babylon.js canvas on the homepage sits on a fixed layer behind all the UI panels, managed through z-index stacking.

</details>

---

## Data and Logic

<details>
<summary><strong>Data Structures</strong></summary>

**Pet Object** (stored in Firestore under `users/{uid}/pets/{petId}`)
```javascript
{
  name: "Biscuit",         // User-defined pet name
  type: "dog",             // "cat" | "dog" | "bird"
  health: 85,              // 0-100; drops when other stats are critically low
  happiness: 72,           // 0-100; decreases over 24 hours without play
  fullness: 60,            // 0-100; decreases every 8 hours
  energy: 45,              // 0-100; decreases every 16 hours
  xp: 320,                 // accumulated experience points
  level: 3,                // current level (XP threshold scales +50% per level)
  bond: 38,                // 0-100; earned only via task completion
  ageStage: "young",       // "baby" | "young" | "adult" | "senior"
  coins: 500,              // spendable currency balance
  lastUpdated: Timestamp   // used to calculate time-decay on stats
}
```

**Expense Transaction** (stored in `users/{uid}/transactions`)
```javascript
{
  category: "food",        // "food" | "health" | "toy"
  amount: 10,              // dollar cost of the action
  action: "Feed",          // human-readable action name
  petName: "Biscuit",      // which pet the expense belongs to
  timestamp: Timestamp     // when the action occurred
}
```

**Monthly Budget Object**
```javascript
{
  budget: 200,             // fixed monthly ceiling in dollars
  spent: {
    food: 40,              // total spent on feeding
    health: 50,            // total spent on vet visits
    toy: 30                // total spent on play
  },
  month: "2026-03"         // resets when the month changes
}
```

</details>

<details>
<summary><strong>Logical Flow</strong></summary>

1. User opens `index.html` and signs in via email/password or Google through Firebase Auth
2. On success, `app.js` redirects to `homepage.html` with a loading overlay during the transition
3. The homepage fetches all of the user's pets from Firestore using their UID
4. Stat decay is calculated by comparing `lastUpdated` to the current time (Fullness drops every 8 hrs, Happiness every 24 hrs, Energy every 16 hrs)
5. When the user picks a care action, the app checks the remaining budget and any action-specific constraints (for example, Rest is blocked if energy is already above 80)
6. If the action is valid, stats update locally and sync to Firestore, the expense is written as a new transaction document, and the Babylon.js model reacts
7. The stat board and mood indicator re-render with the updated values
8. On `dashboard.html`, Chart.js reads all transaction documents and builds a doughnut chart by spending category and a radar chart of the pet's current stats

</details>

---

## Cost of Care System

Helix tracks all spending against a fixed monthly budget of **$200**. Any care action that has a cost writes a transaction to Firestore with a category, amount, pet name, and timestamp.

<details>
<summary><strong>Expense Categories and Tracking</strong></summary>

| Category | Actions Included | Cost Per Action |
|---|---|---|
| Food and Supplies | Feed | $10 |
| Health Care | Vet Visit | $50 |
| Toys and Activities | Play with Toy | $15 |
| Shop Purchases | Accessories | $35 - $250 |

The running total is the sum of all transactions within the current calendar month. The remaining budget shows up live in the care panel and across four stat cards on the dashboard.

The **Spending by Category** doughnut chart on the dashboard breaks down proportional spending across Food, Vet, and Toys, with exact dollar amounts shown as mini-stats beneath it. The **Recent Transactions** table logs each individual purchase with a category icon, action name, pet name, date, and amount.

</details>

> [!WARNING]
> Once the monthly budget is fully used up, all paid care actions and shop purchases are blocked until the budget resets at the start of the next calendar month.

---

## Input Validation

<details>
<summary><strong>Full Validation Table</strong></summary>

| Input Field | Syntactic Check | Semantic Check |
|---|---|---|
| Sign-up Name | Must be non-empty string | Letters and spaces only; max 50 characters |
| Sign-up Email | Must match email format (Firebase-validated) | Must not already be registered |
| Sign-up / Login Password | Must be non-empty | Minimum 6 characters (Firebase requirement) |
| Pet Name | Must be non-empty string | Max 20 characters |
| Pet Type | Must be selected from dropdown | Must be one of: cat, dog, bird |
| Feed Action | Button press (no free-form input) | Budget must have at least $10 remaining |
| Play Action | Button press | Budget at least $15 remaining; pet energy must be at least 20 |
| Rest Action | Button press | Pet energy must be 80 or below |
| Vet Visit | Button press | Budget must have at least $50 remaining |
| Shop Purchase | Button press | Coin balance must cover the item price |

</details>

> [!NOTE]
> Validation errors show up as toast notifications that slide in from the right side of the screen, red for errors and teal for success. If an action is blocked, nothing happens to the pet's state.

---

## Libraries Used

| Library / Resource | Version | Purpose | Source |
|---|---|---|---|
| Firebase (App, Auth, Firestore) | 9.22.0 | User authentication and real-time database | [firebase.google.com](https://firebase.google.com) |
| Babylon.js | Latest | 3D pet rendering on the homepage canvas | [cdn.babylonjs.com](https://cdn.babylonjs.com/babylon.js) |
| Babylon.js Loaders | Latest | GLB/GLTF model loading for 3D pets | [cdn.babylonjs.com](https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js) |
| Three.js | r128 | 3D product rendering in the shop | [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com) |
| Three.js GLTFLoader | 0.128.0 | Loading accessory GLB models in the shop | cdn.jsdelivr.net |
| Three.js OrbitControls | 0.128.0 | Mouse-drag rotation in the 3D shop | cdn.jsdelivr.net |
| Chart.js | 4.4.1 | Doughnut and radar charts on the dashboard | [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com) |
| Anthropic Claude API | claude-sonnet-4-20250514 | AI-generated tasks and pet chat dialogue | [api.anthropic.com](https://api.anthropic.com) |
| Google Fonts (Lilita One, Nunito) | N/A | Display and UI fonts on the homepage | [fonts.googleapis.com](https://fonts.googleapis.com) |
| Google Fonts (Playfair Display, DM Sans) | N/A | Display and body fonts on the landing page | [fonts.googleapis.com](https://fonts.googleapis.com) |
| Google Fonts (Plus Jakarta Sans) | N/A | UI font on the analytics dashboard | [fonts.googleapis.com](https://fonts.googleapis.com) |

> All UI layout, design, and code was written from scratch by the competing team. No templates or starter kits were used.

---

## Attribution and Credits

| Resource | Author / Source | License | Usage in Project |
|---|---|---|---|
| Firebase SDK | Google LLC | Apache 2.0 | Authentication and Firestore database |
| Babylon.js | Microsoft / Babylon.js contributors | Apache 2.0 | 3D pet scene rendering on homepage |
| Three.js | Mr.doob and contributors | MIT | 3D product showcase in the shop |
| Chart.js | Chart.js contributors | MIT | Analytics charts on the dashboard |
| Anthropic Claude API | Anthropic PBC | Commercial API ToS | AI tasks and pet chat features |
| Google Fonts | Google LLC | SIL Open Font License | Typography across all pages |

**FBLA Topic Partnership:** This topic was created by FBLA in partnership with [code.org](https://code.org).

---

> [!IMPORTANT]
> *Helix was developed independently by the competing team. No advisers, parents, or outside individuals assisted in the planning, coding, or preparation of this project, in accordance with FBLA Competitor Responsibility guidelines.*

---

**FBLA Chapter:** South Brunswick High School | **Division:** High School (9th & 10th Grade)
**Event:** Introduction to Programming | **School Year:** 2025-2026
