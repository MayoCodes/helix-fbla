# Helix - 3D Virtual Pet Care Platform

> **FBLA Introduction to Programming | 2025-2026**
> **Topic:** Build a Virtual Pet

Helix is a browser-based virtual pet care platform where users adopt and raise a 3D-rendered digital companion, choosing from a Cat, Dog, or Bird, and keep it healthy through daily care actions, tasks, and in-app purchases. Every action has a dollar cost tracked against a monthly $200 budget, encouraging responsible spending. Expenses are categorized and displayed in Chart.js dashboards, and purchases are blocked once the budget runs out.

---

## Features

<details>
<summary><strong>Pet Customization</strong></summary>

Users pick a pet type (Cat, Dog, or Bird), give it a name, and buy accessories from the 3D Shop. Each type has unique personality traits, task sets, and a live Babylon.js 3D model. Multiple pets can be owned and switched between at any time.

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

Pets earn XP from care actions and tasks. Leveling up gives 50 bonus coins, restores +20 Health and Happiness, and increases the next XP threshold by 50%. Bond points from completed tasks drive age stage progression: Baby (0-24), Young (25-49), Adult (50-74), Senior (75-100).

</details>

<details>
<summary><strong>AI-Powered Features</strong></summary>

Helix uses the Anthropic Claude API for an **AI Task Generator** that creates personalized daily tasks based on the pet's current stats, and an **AI Chat Panel** where the pet responds in character based on its live mood.

</details>

<details>
<summary><strong>3D Accessory Shop</strong></summary>

Nine purchasable accessories (collars, hats, glasses, bow ties, etc.) are displayed as interactive Three.js 3D models with full rotation. Prices range from $35-$250 and a confirmation modal validates the user's coin balance before purchase.

</details>

---

## Program Structure

Helix is a multi-page HTML/JS/CSS application backed by Firebase. Each page is self-contained, pulls shared libraries via CDN, and loads `app.js` for auth, loading overlays, and notifications. All pet state persists in Cloud Firestore under the user's UID.

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

---

## Libraries Used

| Library | Version | Purpose | Source |
|---|---|---|---|
| Firebase (App, Auth, Firestore) | 9.22.0 | Authentication and real-time database | [firebase.google.com](https://firebase.google.com) |
| Babylon.js | Latest | 3D pet rendering on the homepage | [cdn.babylonjs.com](https://cdn.babylonjs.com/babylon.js) |
| Babylon.js Loaders | Latest | GLB/GLTF model loading | [cdn.babylonjs.com](https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js) |
| Three.js | r128 | 3D product rendering in the shop | [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com) |
| Three.js GLTFLoader | 0.128.0 | Accessory GLB model loading | cdn.jsdelivr.net |
| Three.js OrbitControls | 0.128.0 | Mouse-drag rotation in the shop | cdn.jsdelivr.net |
| Chart.js | 4.4.1 | Doughnut and radar charts on the dashboard | [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com) |
| Anthropic Claude API | claude-sonnet-4-20250514 | AI tasks and pet chat dialogue | [api.anthropic.com](https://api.anthropic.com) |
| Google Fonts | N/A | Typography across all pages | [fonts.googleapis.com](https://fonts.googleapis.com) |

> All UI layout, design, and code was written from scratch by the competing team. No templates or starter kits were used.

---

## Attribution and Credits

| Resource | Author / Source | License | Usage |
|---|---|---|---|
| Firebase SDK | Google LLC | Apache 2.0 | Authentication and database |
| Babylon.js | Microsoft / Babylon.js contributors | Apache 2.0 | 3D pet rendering |
| Three.js | Mr.doob and contributors | MIT | 3D shop showcase |
| Chart.js | Chart.js contributors | MIT | Analytics charts |
| Anthropic Claude API | Anthropic PBC | Commercial API ToS | AI features |
| Google Fonts | Google LLC | SIL Open Font License | Typography |

**FBLA Topic Partnership:** This topic was created by FBLA in partnership with [code.org](https://code.org).

---

> [!IMPORTANT]
> *Helix was developed independently by the competing team. No advisers, parents, or outside individuals assisted in the planning, coding, or preparation of this project, in accordance with FBLA Competitor Responsibility guidelines.*

**FBLA Chapter:** South Brunswick High School | **Division:** High School (9th & 10th Grade)
**Event:** Introduction to Programming | **School Year:** 2025-2026
