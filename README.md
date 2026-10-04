# Kitchen Counter — Pickleball Open Play & Doubles Scoreboard

<p align="center">
  <img src="public/screenshots/desktop-main-scoring.png" alt="Kitchen Counter – Desktop Scoring View" width="800" />
</p>

A courtside app for **Pickleball Doubles** with two halves:

- **Open Play** — check in any number of players with a skill rating, set how many courts you have, and Kitchen Counter builds the matches: similar levels together, fair teams, a queue where whoever has waited longest plays next, and live standings.
- **Scoreboard** — score a single match point by point, with the server number, court positions and match analytics tracked for you.

The two stay in step: the scoreboard follows an open play court and moves on to that court's next match by itself, every court keeps its own score, and a finished game is recorded back on its court.

---

## Table of Contents

- [Key Features](#key-features)
- [Screenshots](#screenshots)
- [Running Open Play](#running-open-play)
- [How to Use the Scoreboard](#how-to-use-the-scoreboard)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Scoring Rules](#scoring-rules)
- [Technical Stack](#technical-stack)
- [Getting Started](#getting-started)

---

## Key Features

### Open Play
- **Any number of players and courts** — up to 16 courts; check players in one at a time or paste a whole list (`Jordan 3.5`, one per line).
- **Skill ratings** — 2.0 to 5.0+, the self-rating scale players already know from DUPR and club ladders.
- **Player photos** — snap a selfie at check-in or tap anyone's avatar later; faces show on the roster, queue, Up Next, courts and standings, and follow players onto the scoreboard. Photos are cropped and compressed (~20KB) and never leave the device.
- **Three matching modes:**

  | Mode | How matches are built |
  |------|-----------------------|
  | **Skill matched** *(default)* | Players of similar level share a court, picked at random among the closest fits |
  | **Balanced** | Strict queue order; strongest paired with weakest so the teams are even |
  | **Random** | Anyone near the front of the line, teams drawn at random |

- **Fair queue in every mode** — the player who has waited longest always plays next, anyone who sat out is prioritised so nobody sits twice in a row, and repeat partners, repeat opponents and the same four coming straight back on together are all avoided.
- **Up next** — the next match is staged ahead of time so players can get ready, with **Shuffle** to draw it again.
- **One-tap results** — "Team 1 won" / "Team 2 won", or enter the final score. With auto-start on, the up-next match takes the court immediately.
- **Sit out / check back in** — players can step out without leaving the roster.
- **Standings** — ranked by wins, then win rate, then point differential, with a log of every game.
- **Undo** — step back through the last 25 court actions.

### Scoring Logic
- **Side-out scoring** — only the serving team scores, per official rules.
- **Server tracking** — tracks Server 1 and Server 2, including the one-server exception on the first serve of each game.
- **Win by two** — games go to 11 with a two-point margin required.
- **Correct server & court** — tracks which partner is serving and from which court.
- **Correct receiver** — highlights the player diagonally opposite the server.

### Scoreboard Match Formats

| Mode | Description |
|------|-------------|
| **Casual** | Single game to 11 (win by 2) |
| **Standard** | Best of 3 games |
| **Long** | Best of 5 games |

### Player & Team Customization
- Custom team and player names
- Upload player photos (stored locally in the browser)
- Real-time court diagram showing player positions

### Live Analytics
- **Win probability** — a heuristic blending score, games won, and momentum
- **Momentum** — which team is winning the last 5 points
- **Scoring streaks** and **longest run** per team
- **Serve conversion** rate
- **Match timeline** — every point, fault, side-out, and game boundary

### UX & Reliability
- **Local persistence** — match state saved to `localStorage`; refresh without losing progress
- **Saved match history** — finished matches are archived on your device and survive a reset
- **Multi-step undo** — step back through the last 25 actions
- **Screen wake lock** — keeps your screen on courtside
- **Keyboard shortcuts** — score without touching the screen
- **Safe reset** — confirmation dialog with restart options
- **Accessible** — live announcements, labelled controls, focus rings, reduced-motion support

---

## Screenshots

### Desktop

<table>
  <tr>
    <td align="center" width="50%">
      <img src="public/screenshots/desktop-main-scoring.png" alt="Desktop – Scoring View" />
      <br/><strong>Scoring View</strong><br/>
      <em>Main scoreboard with team scores, serving indicator, Point/Side Out/Undo controls, and court diagram.</em>
    </td>
    <td align="center" width="50%">
      <img src="public/screenshots/desktop-match-options.png" alt="Desktop – Match Setup" />
      <br/><strong>Match Setup</strong><br/>
      <em>Configure match format, team names, player names, and upload player photos.</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="public/screenshots/desktop-stats-view.png" alt="Desktop – Stats View" />
      <br/><strong>Stats & Analytics</strong><br/>
      <em>Win probability, momentum tracker, and match metrics comparing both teams.</em>
    </td>
    <td align="center" width="50%">
      <img src="public/screenshots/desktop-players-view.png" alt="Desktop – Players View" />
      <br/><strong>Players View</strong><br/>
      <em>Player profiles with avatars, names, score, and serving status.</em>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="public/screenshots/desktop-history-view.png" alt="Desktop – History View" width="600" />
      <br/><strong>Match History</strong><br/>
      <em>Timeline of every game event — points, faults, side-outs, and game boundaries.</em>
    </td>
  </tr>
</table>

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

## Running Open Play

1. Tap **Open Play** in the header (it is the default).
2. On **Players**, check everyone in: type a name, pick a skill level, optionally tap the **camera** for a selfie, then tap **Add**. Anyone without a photo can tap their avatar in the list to take one, or use **Edit** to upload one from the photo library. For a group, use **Paste a list of players** — one per line, with an optional rating after the name (`Sam, 4.0`). A name with no rating uses the level selected above.
3. Open the **gear icon → Session setup** to set the number of courts, the matching mode, and whether the next match starts automatically when a result comes in.
4. On **Courts**, tap **Fill all open courts** (or **Start on Court 1**) to put the first matches on.
5. When a game ends, tap **Team 1 won** / **Team 2 won** on that court, or **Enter score** for the points. The four players rejoin the back of the line, and the up-next match takes the court.
6. To score a court point by point, tap **Keep score** — or just open **Scoreboard** in the header, which shows a court in play automatically. A bar above the scoreboard switches between courts (each keeps its own score and undo history) and **Free play** (a scoreboard match of your own, set aside rather than lost). Live scores show on the court cards as well.
   - When a game is won, tap **Record on Court N** on the scoreboard, or **Record Team N win** on the court card.
   - The scoreboard follows the court, so its next match comes up on its own — leave a tablet on Court 1's scoreboard and it keeps up.
7. **Standings** shows the leaderboard and every game played; a wrongly recorded game can be deleted there.

Other controls:

- **Shuffle** on the Up Next card draws a different match.
- The **⏸** button sits a player out; tap their name under *Sitting out* to check them back in at the back of the line.
- The **↩** icon on a court sends its players back to the front of the line without recording a result.
- **Undo** (top right, or `Z`) reverses the last court action.
- **gear → End session** starts over, either keeping the roster or clearing it.

---

## How to Use the Scoreboard

### Step 1 — Match Setup

<img src="public/screenshots/desktop-match-options.png" alt="Match Setup Dialog" width="600" />

1. Switch to **Scoreboard** in the header, then tap the **gear icon** in the top-right corner to open **Match Setup**.
2. **Choose your match format:**
   - **Casual** — Single game to 11 (win by 2). Great for pick-up games.
   - **Standard** — Best of 3 games. The most common competitive format.
   - **Long** — Best of 5 games. For professional-style matches.
3. **Set team names** — enter custom names for Team 1 and Team 2.
4. **Set player names** — each team has Player 1 (Left) and Player 2 (Right).
5. **Upload player photos** *(optional)* — photos are stored locally in your browser.
6. Close the dialog when ready — settings are saved automatically.

---

### Step 2 — Scoring

<img src="public/screenshots/mobile-main-scoring.png" alt="Scoring Controls" width="300" align="right" />

The **Scoring** tab is the main view you'll use during a game.

- **POINT** — awards a point to the serving team. The label tells you which team scores.
- **SIDE OUT / SECOND SERVER** — ends the current server's turn:
  - Server 1 faults → partner takes over as Server 2.
  - Server 2 faults → Side Out, the other team serves.
  - *Exception:* On the first serve of every game, the serving team starts on Server 2, so their first fault is an immediate side-out.
- **UNDO** — step back through up to 25 recent actions.
- The **SERVING** badge and **S1/S2** indicator show who is currently serving.
- The **court diagram** below shows where each player should be standing.

> **Tip:** On desktop, use keyboard shortcuts for faster scoring — see [Keyboard Shortcuts](#keyboard-shortcuts).

<br clear="right" />

---

### Step 3 — Court Positions

The court diagram updates automatically after every action. It shows:

- Both teams on their respective sides
- The **server** marked with a dot in the correct court (right for even score, left for odd)
- The **receiver** diagonally opposite the server, highlighted with a dashed arrow
- The **kitchen (NVZ)** shown as a hatched area at the net

Use this to confirm everyone is in the right position before serving.

---

### Step 4 — Stats & Analytics

<img src="public/screenshots/desktop-stats-view.png" alt="Stats View" width="600" />

Tap the **Stats** tab to view live match analytics:

- **Win Probability** — real-time estimate based on score, games won, and momentum. Labelled as an estimate, not a prediction.
- **Momentum** — which team is "hot" based on the last 5 points, shown as colored dots.
- **Match Metrics** — side-by-side comparison: score, total points won, longest run, serve conversion rate, faults, and side-outs.
- **Score Badge** — the traditional pickleball score call (e.g., `0-0-2` = serving team score, receiving team score, server number).

---

### Step 5 — Players View

<img src="public/screenshots/desktop-players-view.png" alt="Players View" width="600" />

Tap the **Players** tab for the match lineup — a card per team with both players:

- Player photos (or initials) and names
- Who is **serving now**, the **second server**, and who is **receiving**, with the server number (`S1` / `S2`)
- Which court each player is standing in, kept in step with the score
- Current score and games won between the teams, the last few points, and the final stats once the match is decided
- **Swap court sides** — before the first rally of a game, put a team's partners in each other's courts to choose who serves or receives first
- Tap **"Manage Players"** to edit names or photos

The layout scales up on a large screen, so it still works as a **spectator display** projected courtside.

---

### Step 6 — History

<img src="public/screenshots/desktop-history-view.png" alt="History View" width="600" />

Tap the **History** tab to review the full match timeline:

- Every event is logged: points, faults, side-outs, server changes, game boundaries
- Events listed chronologically with timestamps
- Event counter in the top-right shows total events
- Useful for settling disputes about earlier plays
- In multi-game matches, events are organized by game

Switch to **Past matches** for the archive of finished matches:

- A match is saved the moment it is won, and removed again if you undo that point
- Each card shows the winner, the result, per-game scores, duration, and total points
- The archive survives a reset, so starting a new match no longer loses the old one
- Stored on your device only — up to the 50 most recent matches, deletable one at a
  time or all at once

---

## Keyboard Shortcuts

**Open Play**

| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Courts / Players / Standings |
| `Z` | Undo the last court action |

**Scoreboard**

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

## Scoring Rules

Kitchen Counter implements all official pickleball doubles scoring rules:

| Rule | Behaviour |
|------|-----------|
| Side-out scoring | Only the serving team can score a point |
| Game to 11, win by 2 | 11–10 continues; 12–10 wins |
| First serve of a game | Serving team starts on "server 2", so their first fault is a side-out |
| Server rotation | Server 1 fault → partner serves; server 2 fault → side-out |
| Court positions | The serving team swaps sides on every point they win — never on a fault |
| Serving court | First server is on the right when their team's score is even, left when odd |
| Correct receiver | The player diagonally opposite the server |
| Next game | The team that lost the previous game serves first |

---

## Technical Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS v4 with custom CSS variables
- **State:** Pure reducers — `lib/pickleball-state.ts` (scoreboard, wrapped by `usePickleballGame`) and `lib/open-play.ts` (roster, queue and matchmaking, wrapped by `useOpenPlay`). `useCourtScoreboard` keeps the two in step, parking each court's scoreboard while another is on screen. Matchmaking randomness runs off a seed passed in with each action, so every state transition is deterministic.
- **Icons:** Google Material Symbols
- **Analytics:** Vercel Analytics
- **Persistence:** Browser `localStorage`

---

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pickleball_scoreboard_doubles

# Install dependencies
npm install

# Run the development server
npm run dev

# Open in your browser
open http://localhost:3000
```

### Production Build

```bash
npm run build
npm run start
```

### Quality Checks

```bash
npm run lint       # ESLint 9 + eslint-config-next (flat config)
npm run typecheck  # tsc --noEmit
```

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 serocode.

---

Built for the Pickleball community.

<p align="center">
  <strong>Kitchen Counter</strong> — Never lose track of the score again.
</p>
