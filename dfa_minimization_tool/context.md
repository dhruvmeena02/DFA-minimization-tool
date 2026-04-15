# DFA Minimizer — Enhanced Educational Tool

## Project Structure
```
enhanced-dfa-tool/
├── backend/
│   ├── app.py          Flask API server (port 5000)
│   ├── dfa.py          DFA data model
│   ├── minimizer.py    Table-filling algorithm + step tracking
│   └── validator.py    Input parsing and validation
├── frontend/
│   ├── index.html      Single-page app
│   ├── style.css       Light academic theme
│   └── js/
│       ├── api.js              Backend API calls
│       ├── diagram-editor.js   Interactive canvas DFA editor
│       ├── diagram-renderer.js Canvas DFA renderer
│       ├── ui.js               Step cards + table rendering
│       ├── modal.js            Interactive step explanation modal (NEW)
│       └── main.js             App controller
└── requirements.txt
```

## How to Run
1. Install dependencies:  `pip install flask flask-cors`
2. Start backend:         `cd backend && python app.py`
3. Open browser:          `http://localhost:5000`

## New Features (Enhanced Version)

### 1. Interactive Step Explanation Modal
- Click **"👉 Show Steps & Explain Process"** after minimizing
- Or use **"💡 Explain Process"** in the header
- Navigable modal with 5 steps, each explaining:
  - **What happened** — concrete facts from this step
  - **Why it happened** — conceptual explanation
  - **Automata Theory Connection** — formal theory
  - **Data summary** — step-specific data display
  - **Key Insight** — the "aha moment" for students
- Keyboard navigation: Arrow keys + Escape
- Click dots to jump to any step

### 2. Step-by-Step Visualization (Step Cards)
- 5 collapsible step cards in the "Step-by-Step" tab
- Each card shows the algorithm theory and concrete data
- Visual chips for states (color-coded: final/non-final/merged/unreachable)
- Pair chips for distinguishable/indistinguishable pairs
- Iteration blocks showing exactly which pairs were marked and why

### 3. Theory Guide Panel
- 4 color-coded theory cards
- Covers: What is DFA minimization, Why it matters, Algorithm steps, Key concepts
- Time complexity note
- Opens/closes from header button

### 4. Enhanced Examples
- DFA (minimizable) — 5 states → 4 states
- DFA (already minimal) — proves no merges possible
- Complex DFA — 6 states → 3 states (dramatic reduction)

### 5. Results Summary
- Inline "X → Y states (Z removed)" badge
- Banner at top of Step-by-Step tab
- Visual color coding for reduction vs. no-change

## Algorithm
Table-Filling (Myhill-Nerode) in 5 steps:
1. Remove unreachable states (BFS from start)
2. Initial partition: {F} vs {Q\F} — base case distinguishability
3. Iterative refinement: propagate distinguishability via transitions
4. Identify equivalence classes (unmarked pairs = indistinguishable)
5. Construct minimized DFA from equivalence classes
