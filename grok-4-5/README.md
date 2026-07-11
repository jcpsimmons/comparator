# Priority Board

Local-first Kanban + Eisenhower Matrix task board.

## Stack

- React + TypeScript + Vite
- `@dnd-kit` for drag-and-drop
- `lucide-react` icons, `date-fns` dates
- Browser `localStorage` persistence (no backend)

## Scripts

```bash
npm install
npm run dev      # development server
npm run build    # production build
npm run preview  # serve dist/
npm test         # unit tests (Vitest)
```

## Features

- **Kanban** — Backlog / To Do / In Progress / Done
- **Matrix** — Do Now / Schedule / Delegate / Eliminate
- **List** — sortable scanning view
- Search + filters (status, quadrant, tags, due, completion)
- Add/edit modal with keyboard support
- Import / export JSON
