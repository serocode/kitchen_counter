<![CDATA[# 🏓 Kitchen Counter — Pickleball Doubles Scoreboard

<p align="center">
  <img src="public/screenshots/desktop-main-scoring.png" alt="Kitchen Counter – Desktop Scoring View" width="800" />
</p>

A premium, modern, and high-performance scoreboard application designed specifically for **Pickleball Doubles**. Kitchen Counter tracks score, server number, player positions on the court, and detailed match analytics — all in real-time, right from your phone or laptop courtside.

---

## 📖 Table of Contents

- [Key Features](#-key-features)
- [Screenshots](#-screenshots)
  - [Desktop](#desktop)
  - [Mobile](#mobile)
- [How to Use](#-how-to-use)
  - [Step 1 — Match Setup](#step-1--match-setup)
  - [Step 2 — Scoring](#step-2--scoring)
  - [Step 3 — Court Positions](#step-3--court-positions)
  - [Step 4 — Stats & Analytics](#step-4--stats--analytics)
  - [Step 5 — Players View](#step-5--players-view)
  - [Step 6 — History](#step-6--history)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Scoring Rules](#-scoring-rules)
- [Technical Stack](#-technical-stack)
- [Getting Started (Development)](#-getting-started)
- [License](#-license)

---

## 🚀 Key Features

### ⚖️ Advanced Scoring Logic
- **Side-out scoring** — Only the serving team scores, exactly as in the official rules.
- **Server tracking** — Tracks "Server 1" and "Server 2", including the one-server exception on the first serve of each game.
- **Win by two** — A game needs 11 points *and* a two-point margin, so 11–10 keeps play going.
- **Correct server & court** — Tracks which partner is serving and which court they serve from.
- **Correct receiver** — Highlights the player diagonally opposite the server.

### 🏆 Multi-Game Match Modes
| Mode | Description |
|------|-------------|
| **Casual** | Single game to 11 (win by 2) |
| **Standard** | Best of 3 games |
| **Long** | Best of 5 games (professional-style) |

### 👥 Player & Team Customization
- Custom team names and individual player names
- Upload player photos (persisted locally)
- Real-time court diagram showing player positions

### 📊 Live Analytics
- **Win probability** — heuristic blending score, games won and momentum
- **Momentum tracker** — who's winning the last 5 points
- **Scoring streaks** and **longest run** per team
- **Serve conversion** rate
- **Match timeline** — every point, fault, side-out and game boundary

### 🛠️ UX & Reliability
- **Local persistence** — match state saved to `localStorage`; refresh without losing progress
- **Multi-step undo** — step back through the last 25 actions
- **Screen wake lock** — keeps your screen awake courtside
- **Keyboard shortcuts** — fast scoring without touching the screen
- **Safe reset** — confirmation dialog with restart options
- **Accessible** — live announcements, labelled controls, focus rings, reduced-motion support

---

## 📸 Screenshots

### Desktop

<table>
  <tr>
    <td align="center" width="50%">
      <img src="public/screenshots/desktop-main-scoring.png" alt="Desktop – Scoring View" />
      <br/><strong>Scoring View</strong><br/>
      <em>Main scoreboard with team scores, serving indicator, Point/Side Out/Undo controls, and live court position diagram.</em>
    </td>
    <td align="center" width="50%">
      <img src="public/screenshots/desktop-match-options.png" alt="Desktop – Match Setup" />
      <br/><strong>Match Setup</strong><br/>
      <em>Configure match format (Casual/Standard/Long), team names, player names, and upload player photos.</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="public/screenshots/desktop-stats-view.png" alt="Desktop – Stats View" />
      <br/><strong>Stats & Analytics</strong><br/>
      <em>Live win probability, momentum tracker, and detailed match metrics table comparing both teams.</em>
    </td>
    <td align="center" width="50%">
      <img src="public/screenshots/desktop-players-view.png" alt="Desktop – Players View" />
      <br/><strong>Players View</strong><br/>
      <em>Visual player profiles for both teams with avatars, names, current score, and serving status.</em>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="public/screenshots/desktop-history-view.png" alt="Desktop – History View" width="600" />
      <br/><strong>Match History</strong><br/>
      <em>Chronological timeline of every game event — points, faults, side-outs, and game boundaries.</em>
    </td>
  </tr>
</table>

---

### Mobile

<table>
  <tr>
    <td align="center" width="33%">
      <img src="public/screenshots/mobile-main-scoring.png" alt="Mobile – Scoring View" width="280" />
      <br/><strong>Scoring</strong>
    </td>
    <td align="center" width="33%">
      <img src="public/screenshots/mobile-match-options.png" alt="Mobile – Match Setup" width="280" />
      <br/><strong>Match Setup</strong>
    </td>
    <td align="center" width="33%">
      <img src="public/screenshots/mobile-stats-view.png" alt="Mobile – Stats" width="280" />
      <br/><strong>Stats</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="public/screenshots/mobile-players-view.png" alt="Mobile – Players View" width="280" />
      <br/><strong>Players</strong>
    </td>
    <td align="center" width="33%">
      <img src="public/screenshots/mobile-history-view.png" alt="Mobile – History" width="280" />
      <br/><strong>History</strong>
    </td>
    <td align="center" width="33%"></td>
  </tr>
</table>

---

## 🎮 How to Use

### Step 1 — Match Setup

<img src="public/screenshots/desktop-match-options.png" alt="Match Setup Dialog" width="600" />

1. Tap the **⚙️ gear icon** in the top-right corner to open the **Match Setup** dialog.
2. **Choose your match format:**
   - **Casual** — Single game to 11 (win by 2). Great for pick-up games.
   - **Standard** — Best of 3 games. The most common competitive format.
   - **Long** — Best of 5 games. For serious, professional-style matches.
3. **Set team names** — Enter custom names for Team 1 and Team 2 (e.g., "Thunder" vs "Lightning").
4. **Set player names** — Each team has two players: Player 1 (Left) and Player 2 (Right). Enter their names.
5. **Upload player photos** *(optional)* — Tap "Upload Photo" to add a profile picture for each player. Photos are stored locally in your browser.
6. Close the dialog when ready — your settings are saved automatically.

---

### Step 2 — Scoring

<img src="public/screenshots/mobile-main-scoring.png" alt="Scoring Controls" width="300" align="right" />

The **Scoring** tab is the main view you'll use during a game.

- **POINT** button — Awards a point to the **serving team**. The button label tells you which team scores (e.g., "Point to Team A").
- **SIDE OUT / SECOND SERVER** button — Ends the current server's turn:
  - If the serving team's **Server 1** faults → their partner takes over as **Server 2**.
  - If **Server 2** faults → it's a **Side Out** and the other team gets to serve.
  - *Exception:* On the first serve of every game, the serving team starts on "Server 2", so their first fault is an immediate side-out.
- **UNDO** button — Made a mistake? Step back through up to 25 recent actions.
- The **SERVING** badge and **S1/S2** indicator always show who is currently serving and which server they are.
- The **court diagram** below the controls shows where each player should be standing.

> **Tip:** On desktop, use keyboard shortcuts for faster scoring — see the [Keyboard Shortcuts](#-keyboard-shortcuts) section.

<br clear="right" />

---

### Step 3 — Court Positions

The court diagram appears below the scoring controls and updates automatically after every action. It shows:

- **Both teams** on their respective sides of the court
- **The server** — marked with a dot, standing in the correct court (right for even score, left for odd)
- **The receiver** — the player diagonally opposite the server, highlighted with a dashed arrow
- **The kitchen (NVZ)** — the no-volley zone shown as a hatched area at the net

Use this to confirm that everyone is standing in the right position before serving.

---

### Step 4 — Stats & Analytics

<img src="public/screenshots/desktop-stats-view.png" alt="Stats View" width="600" />

Tap the **📊 Stats** tab in the bottom navigation to view live match analytics:

- **Win Probability** — A real-time estimate based on score, games won, and momentum. Displayed as a split bar chart (e.g., 60% Team A / 40% Team B). *This is a transparent heuristic — labelled as an estimate, not a prediction.*
- **Momentum** — Shows which team is "hot" based on the last 5 points scored. You'll see colored dots representing each of the last 5 points.
- **Match Metrics Table** — A side-by-side comparison including:
  - Score (current game)
  - Total Points Won (entire match)
  - Longest Run (consecutive points)
  - Serve Conversion Rate
  - Serve Faults
  - Side-outs
- **Score Badge** — The traditional pickleball score call displayed in the top-right (e.g., `0-0-2` = serving team score, receiving team score, server number).

---

### Step 5 — Players View

<img src="public/screenshots/desktop-players-view.png" alt="Players View" width="600" />

Tap the **👥 Players** tab to see a visual overview of all four players:

- Player photos (or default silhouettes) displayed prominently for both teams
- Team names and player names
- Current score displayed centrally between the teams
- Serving status indicator showing which team is serving and the server number
- Tap **"Manage Players"** to quickly edit names or photos without leaving the view

This view works great as a **spectator display** — perfect for projecting on a big screen or TV courtside.

---

### Step 6 — History

<img src="public/screenshots/desktop-history-view.png" alt="History View" width="600" />

Tap the **📜 History** tab to review the full timeline of the match:

- Every event is logged: points scored, faults, side-outs, server changes, and game boundaries
- Events are listed in chronological order with timestamps
- The event counter in the top-right shows total events
- Use this to settle disputes about what happened earlier in the game
- In multi-game matches, events are organized by game for easy navigation

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` or `P` | Award a point to the serving team |
| `F` | Fault / Second Server / Side Out |
| `Z` | Undo the last action |
| `N` | Start the next game (after a game is won) |
| `1` | Switch to Scoring tab |
| `2` | Switch to Stats tab |
| `3` | Switch to Players tab |
| `4` | Switch to History tab |

---

## 🧠 Scoring Rules

Kitchen Counter implements all official pickleball doubles scoring rules:

| Rule | Behaviour |
|------|-----------|
| Side-out scoring | Only the serving team can score a point |
| Game to 11, win by 2 | 11–10 continues; 12–10 wins |
| First serve of a game | Serving team starts on "server 2", so their first fault is a side-out |
| Server rotation | Server 1 fault → partner serves; server 2 fault → side-out |
| Court positions | The serving team swaps sides on every point they win — never on a fault |
| Serving court | First server is on the right when their team's score is even, left when odd. Second server serves from the opposite court |
| Correct receiver | The player diagonally opposite the server |
| Next game | The team that lost the previous game serves first |

---

## 🛠️ Technical Stack

- **Framework:** Next.js 16 with React 19 and TypeScript
- **Styling:** Tailwind CSS v4 with a custom CSS-variable design system
- **State Management:** Pure reducer in `lib/pickleball-state.ts`, wrapped by the `usePickleballGame` hook
- **Icons:** Google Material Symbols
- **Analytics:** Vercel Analytics
- **Persistence:** Browser `localStorage`

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm, yarn, or pnpm

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd pickleball_scoreboard_doubles

# 2. Install dependencies
npm install
# or
pnpm install

# 3. Run the development server
npm run dev
# or
pnpm dev

# 4. Open in your browser
open http://localhost:3000
```

### Production Build

```bash
npm run build
npm run start
```

---

## 📄 License

Built with ❤️ for the Pickleball community.

---

<p align="center">
  <strong>Kitchen Counter</strong> — Never lose track of the score again. 🏓
</p>
]]>
