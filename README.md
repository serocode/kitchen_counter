# Pickleball Scoreboard — Doubles Edition

A premium, modern, and high-performance scoreboard application designed specifically for **Pickleball Doubles**. This application tracks score, server number, player positions on the court, and detailed match analytics all in real-time.

## 🚀 Key Features

### ⚖️ Advanced Scoring Logic
- **Side-out scoring**: Only the serving team scores, exactly as in the official rules.
- **Server tracking**: Tracks "Server 1" and "Server 2", including the one-server exception on the first serve of each game.
- **Win by two**: A game needs 11 points *and* a two-point margin, so 11–10 keeps play going.
- **Correct server & court**: Tracks which of the two partners is serving and which court they serve from — including the second server, who stands in the opposite court because partners only swap on a point.
- **Correct receiver**: Highlights the player diagonally opposite the server.

### 🏆 Multi-Game Match Modes
- **Casual**: Single game to 11 (win by 2).
- **Standard**: Best of 3 games.
- **Long**: Best of 5 games for professional-style matches.
- **Match Progression**: Tracks games won per team and automates the transition to the next game.

### 👥 Player & Team Customization
- **Team Names**: Customize names for Team A and Team B.
- **Player Profiles**: Upload player photos (persisted locally) and set individual names.
- **Visual Court Diagram**: Real-time visualization of player positions on the court to ensure correct serving order.

### 📊 Analytics & History
- **Live momentum**: Which team is winning the last 5 points of the current game.
- **Scoring streaks** and **longest run** per team.
- **Serve conversion**: Share of completed service turns that produced at least one point.
- **Win probability**: A transparent heuristic blending score, games won and momentum — labelled as an estimate, not a prediction.
- **Match timeline**: Every point, fault, side-out and game boundary, filterable by game.

### 🛠️ UX & Reliability
- **Local persistence**: Match state is saved to `localStorage`; refresh or close the browser without losing progress.
- **Multi-step undo**: Step back through the last 25 actions, including a credited game win.
- **Keep screen awake**: Holds a screen wake lock while a match is live, so the board doesn't sleep courtside.
- **Keyboard shortcuts**: `Space`/`P` point · `F` fault · `Z` undo · `N` next game · `1`–`4` switch views.
- **Safe reset**: A confirmation dialog once a match has started, with a clear choice between restarting with the same teams and a full reset.
- **Accessible**: Live score announcements, labelled controls, visible focus rings, and `prefers-reduced-motion` support.

## 🛠️ Technical Stack

- **Core**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4 with a custom CSS-variable design system
- **State**: A pure reducer in `lib/pickleball-state.ts`, wrapped by the `usePickleballGame` hook
- **Icons**: Google Material Symbols

## 🚦 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run the development server
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 How to Use

1. **Setup**: Click the **Settings** icon to configure team names, players, and match mode (Standard/Casual/Long).
2. **Scoring**: **Point** awards a rally to the serving team (named on the button). The second button passes the serve — it reads **Second Server** or **Side Out** depending on what will actually happen.
3. **Court Positions**: Refer to the live court diagram to see where each player should be standing.
4. **History**: Use the history tab to review the flow of the game.
5. **Match win**: Once a team wins a game, choose **Start Next Game** until the match criteria are met.

## 🧠 Scoring Rules Implemented

| Rule | Behaviour |
| --- | --- |
| Side-out scoring | Only the serving team can score a point |
| Game to 11, win by 2 | 11–10 continues; 12–10 wins |
| First serve of a game | Serving team starts on "server 2", so their first fault is a side-out |
| Server rotation | Server 1 fault → partner serves; server 2 fault → side-out |
| Court positions | The serving team swaps sides on every point they win — never on a fault |
| Serving court | The game's first server is on the right when their team's score is even, left when odd. The second server is their partner, so they serve from the opposite court |
| Correct receiver | The player diagonally opposite the server |
| Next game | The team that lost the previous game serves first |

---

Built with ❤️ for the Pickleball community.
