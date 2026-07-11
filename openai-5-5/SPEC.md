# Kanban + Eisenhower Task Board Spec

## Build Goal

Build a complete, local-first web app that combines a Kanban task board with an Eisenhower Matrix. The finished app must run entirely without an LLM, backend, account system, or network dependency after dependencies are installed. Users can create tasks, organize them by workflow status, classify them by urgency and importance, drag tasks between views, filter/search them, and persist all data locally in the browser.

The app should feel like a practical productivity tool, not a demo or landing page.

## Recommended Stack

Use this stack unless the target repository already has a different working stack:

- React
- TypeScript
- Vite
- Plain CSS or CSS Modules
- `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop
- `lucide-react` for icons
- `date-fns` for date formatting and due-date helpers
- Browser `localStorage` for persistence

Do not use:

- Backend services
- Authentication
- Database servers
- LLM APIs
- Cloud sync
- Marketing pages
- Placeholder-only UI

## Core Concept

Every task has two independent classifications:

1. **Workflow status** for Kanban:
   - Backlog
   - To Do
   - In Progress
   - Done

2. **Priority quadrant** for Eisenhower:
   - Do Now: urgent and important
   - Schedule: not urgent and important
   - Delegate: urgent and not important
   - Eliminate: not urgent and not important

The user can switch between:

- **Kanban View**, where tasks are grouped by workflow status.
- **Matrix View**, where tasks are grouped by urgency/importance quadrant.
- **List View**, where tasks are shown in a sortable table/list for bulk scanning.

Dragging a task in Kanban changes its `status`. Dragging a task in Matrix changes its `urgent` and `important` flags.

## Primary User Stories

- As a user, I can add a task quickly with a title and optional details.
- As a user, I can assign each task a workflow status.
- As a user, I can mark each task as urgent, important, both, or neither.
- As a user, I can drag tasks between Kanban columns.
- As a user, I can drag tasks between Eisenhower quadrants.
- As a user, I can edit task fields after creation.
- As a user, I can mark tasks complete.
- As a user, I can delete tasks.
- As a user, I can search tasks by title, description, or tag.
- As a user, I can filter tasks by status, quadrant, due date, tag, or completion state.
- As a user, I can see overdue and due-soon tasks at a glance.
- As a user, I can keep using the app after refreshing the page because data is saved locally.
- As a user, I can export my board to JSON and import it later.

## Data Model

Use a single local app state object.

```ts
type TaskStatus = "backlog" | "todo" | "inProgress" | "done";

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  dueDate: string | null; // ISO date string: YYYY-MM-DD
  tags: string[];
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  completedAt: string | null; // ISO datetime
  sortOrder: number;
};

type AppView = "kanban" | "matrix" | "list";

type AppState = {
  version: 1;
  tasks: Task[];
  activeView: AppView;
  searchQuery: string;
  filters: {
    statuses: TaskStatus[];
    quadrants: QuadrantKey[];
    tags: string[];
    due: "all" | "overdue" | "today" | "next7" | "none";
    completion: "all" | "open" | "done";
  };
};

type QuadrantKey = "doNow" | "schedule" | "delegate" | "eliminate";
```

Quadrant derivation:

```ts
function getQuadrant(task: Task): QuadrantKey {
  if (task.urgent && task.important) return "doNow";
  if (!task.urgent && task.important) return "schedule";
  if (task.urgent && !task.important) return "delegate";
  return "eliminate";
}
```

When a task is dropped into a matrix quadrant, update these fields:

```ts
const quadrantFlags = {
  doNow: { urgent: true, important: true },
  schedule: { urgent: false, important: true },
  delegate: { urgent: true, important: false },
  eliminate: { urgent: false, important: false },
};
```

## Persistence

Save the full `AppState` object to:

```txt
localStorage["kanban-eisenhower-state"]
```

Requirements:

- Load state on app startup.
- If no saved state exists, initialize with a small set of useful sample tasks.
- Save after every task, view, filter, or search change.
- Validate loaded JSON before using it.
- If loaded data is corrupt, preserve the corrupt payload under `localStorage["kanban-eisenhower-state-corrupt-backup"]`, then reset to default state.
- Include an export button that downloads current state as JSON.
- Include an import button that accepts a JSON file and replaces state after validation.

## Default Sample Tasks

On first load only, create 6 sample tasks:

- "Clarify project scope"  
  Status: To Do  
  Urgent: true  
  Important: true  
  Tag: Planning

- "Draft weekly review"  
  Status: Backlog  
  Urgent: false  
  Important: true  
  Tag: Review

- "Reply to vendor follow-up"  
  Status: To Do  
  Urgent: true  
  Important: false  
  Tag: Admin

- "Remove stale bookmarks"  
  Status: Backlog  
  Urgent: false  
  Important: false  
  Tag: Cleanup

- "Prepare launch checklist"  
  Status: In Progress  
  Urgent: false  
  Important: true  
  Tag: Launch

- "Archive completed notes"  
  Status: Done  
  Urgent: false  
  Important: false  
  Tag: Admin  
  Completed

## Layout

The first screen is the working app, not a landing page.

Desktop layout:

- Top app bar
  - App name: "Priority Board"
  - View switcher: Kanban, Matrix, List
  - Search input
  - Add Task button
  - Import/export menu or buttons

- Secondary filter bar
  - Status filter
  - Quadrant filter
  - Due-date filter
  - Tag filter
  - Completion filter
  - Clear filters button

- Main content area
  - Displays the active view

Mobile layout:

- App bar wraps cleanly.
- View switcher remains easy to tap.
- Search becomes full-width below the title row if needed.
- Kanban columns stack vertically.
- Matrix quadrants stack in a 1-column layout.
- List view becomes cards instead of a cramped table.

Do not let text overflow buttons, cards, columns, or filter controls.

## Visual Design

Use a restrained productivity-app style:

- Light theme by default.
- White or near-white page background.
- Subtle gray borders.
- Compact spacing.
- 8px maximum border radius for cards and panels.
- Use color as an accent, not as the entire theme.
- Avoid decorative blobs, gradients, oversized hero sections, and marketing-style cards.

Suggested color semantics:

- Do Now: red accent
- Schedule: blue accent
- Delegate: amber accent
- Eliminate: gray accent
- Done: green accent
- Overdue: red text/badge
- Due today: amber text/badge

Use icons from `lucide-react` for:

- Add
- Search
- Calendar
- Trash
- Edit
- Check
- Import
- Export/download
- Filter
- X/clear

## Task Card

Each task card should show:

- Title
- Description preview, if present
- Status badge
- Quadrant badge
- Due-date badge, if present
- Tags
- Completion indicator
- Compact action buttons:
  - Edit
  - Mark done / reopen
  - Delete

Task cards must have stable dimensions and not resize dramatically on hover. Hover/focus states can change border, shadow, or background subtly.

## Add/Edit Task Modal

Use the same modal for creating and editing tasks.

Fields:

- Title, required, max 120 chars
- Description, optional, max 1000 chars
- Status select
- Urgent toggle
- Important toggle
- Due date picker
- Tags input

Tag behavior:

- Users can type comma-separated tags.
- Trim whitespace.
- Remove empty tags.
- Deduplicate case-insensitively while preserving the first typed casing.

Validation:

- Title cannot be empty after trimming.
- Title max length: 120 chars.
- Description max length: 1000 chars.
- Due date must be a valid date string or empty.

Modal actions:

- Save
- Cancel
- Delete, only when editing an existing task

Keyboard behavior:

- Escape closes the modal without saving.
- Cmd/Ctrl+Enter saves if valid.
- Focus starts in the title field.
- Focus is trapped inside the modal while open.

## Kanban View

Columns:

- Backlog
- To Do
- In Progress
- Done

Each column shows:

- Column title
- Count of visible tasks
- Empty state text when no tasks are visible
- Droppable task area

Behavior:

- Dragging a task into a column updates `status`.
- Dropping within the same column updates `sortOrder`.
- New tasks default to `todo`.
- Marking a task complete sets:
  - `status = "done"`
  - `completedAt = new Date().toISOString()`
- Reopening a task sets:
  - `status = "todo"`
  - `completedAt = null`

Sort tasks within Kanban columns by:

1. `sortOrder`
2. `updatedAt` descending as a fallback

## Eisenhower Matrix View

Quadrants:

- Do Now
  - Urgent: yes
  - Important: yes
  - Description: "Urgent and important"

- Schedule
  - Urgent: no
  - Important: yes
  - Description: "Important, not urgent"

- Delegate
  - Urgent: yes
  - Important: no
  - Description: "Urgent, less important"

- Eliminate
  - Urgent: no
  - Important: no
  - Description: "Neither urgent nor important"

Behavior:

- Dragging a task into a quadrant updates `urgent` and `important`.
- Dropping within the same quadrant updates `sortOrder`.
- Each quadrant shows visible-task count.
- Quadrants use distinct but restrained accent colors.
- The 2x2 grid must be readable at desktop width.
- On mobile, quadrants stack vertically.

## List View

Show all visible tasks in a scannable list or table.

Desktop columns:

- Done checkbox
- Title
- Status
- Quadrant
- Due date
- Tags
- Updated
- Actions

Mobile:

- Use task-card rows instead of a table.

Sorting:

- User can sort by due date, status, quadrant, title, or updated date.
- Default sort:
  1. Open tasks before done tasks
  2. Overdue first
  3. Due today
  4. Due soon
  5. Important
  6. Urgent
  7. Updated newest first

## Search and Filters

Search:

- Match case-insensitively against:
  - Title
  - Description
  - Tags

Filters:

- Status: multi-select
- Quadrant: multi-select
- Tags: multi-select generated from existing task tags
- Due:
  - All
  - Overdue
  - Today
  - Next 7 days
  - No due date
- Completion:
  - All
  - Open
  - Done

Clear filters:

- Resets all filters.
- Does not clear search unless there is a separate "Clear search" icon in the search box.

Visible count:

- Show a small summary such as "12 tasks · 8 visible" when filters/search are active.

## Due Date Logic

Use local dates, not UTC datetime comparisons, for due-date categories.

Definitions:

- Overdue: due date is before today and task is not done.
- Today: due date equals today and task is not done.
- Next 7 days: due date is after today and no more than 7 days from today.
- Done tasks should not be visually marked overdue, even if their due date is in the past.

Display:

- No due date: omit badge or show a muted "No date" only in List View.
- Overdue: "Overdue"
- Today: "Today"
- Tomorrow: "Tomorrow"
- Within 7 days: formatted short date
- Otherwise: formatted medium date

## Empty States

Global empty state:

- If there are zero tasks, show a focused empty state in the main area:
  - "No tasks yet"
  - Add Task button

Filtered empty state:

- If tasks exist but none match current filters/search:
  - "No tasks match the current filters"
  - Clear filters button

Column/quadrant empty state:

- Small muted text:
  - "Drop tasks here"

## Accessibility

Requirements:

- All buttons have accessible labels.
- Icon-only buttons use `aria-label`.
- Inputs have labels.
- Modal uses `role="dialog"` and `aria-modal="true"`.
- Keyboard users can create, edit, delete, search, filter, and switch views.
- Drag-and-drop must have a non-drag fallback:
  - The edit modal lets users change status, urgent, and important fields.
- Focus states are clearly visible.
- Color is not the only indicator of task state; use text badges too.

## State Update Rules

Task creation:

- Generate `id` with `crypto.randomUUID()` if available.
- Fallback to a timestamp/random string if unavailable.
- Set `createdAt` and `updatedAt`.
- Set `completedAt` if initial status is done, otherwise null.
- Assign a `sortOrder` greater than the current max sort order in the target grouping.

Task editing:

- Update fields from modal.
- Always update `updatedAt`.
- If status changes to done and `completedAt` is null, set `completedAt`.
- If status changes away from done, set `completedAt` to null.

Task completion toggle:

- If marking done, set status to done and `completedAt`.
- If reopening, set status to todo and clear `completedAt`.
- Always update `updatedAt`.

Task deletion:

- Confirm before deleting.
- Remove permanently from local state.

Drag/drop:

- Update the changed classification field.
- Recompute `sortOrder` for the destination group.
- Update `updatedAt`.

## Import/Export

Export:

- Download a `.json` file named `priority-board-export-YYYY-MM-DD.json`.
- Include full `AppState`.

Import:

- Accept only JSON files.
- Validate that the imported object has `version`, `tasks`, and valid task records.
- If valid, replace current state.
- If invalid, show an error message and keep current state unchanged.

## Error Handling

Use inline, recoverable errors:

- Invalid import file
- Corrupt saved state reset
- Required title missing
- Max length exceeded

Do not use blocking alerts except for delete confirmation if no custom confirmation modal is implemented.

## Suggested Component Structure

```txt
src/
  App.tsx
  main.tsx
  styles.css
  types.ts
  constants.ts
  storage.ts
  taskUtils.ts
  components/
    AppHeader.tsx
    FilterBar.tsx
    TaskCard.tsx
    TaskModal.tsx
    KanbanView.tsx
    MatrixView.tsx
    ListView.tsx
    EmptyState.tsx
    Badge.tsx
```

This structure is recommended, not mandatory. Keep the code simple and readable.

## Utility Functions

Implement utilities for:

- `getQuadrant(task)`
- `getQuadrantLabel(quadrant)`
- `getStatusLabel(status)`
- `createTask(input)`
- `updateTask(task, patch)`
- `filterTasks(tasks, searchQuery, filters)`
- `sortTasksForList(tasks)`
- `isOverdue(task)`
- `isDueToday(task)`
- `isDueWithinNext7Days(task)`
- `formatDueDate(task)`
- `normalizeTags(input)`
- `validateAppState(value)`
- `loadState()`
- `saveState(state)`
- `exportState(state)`
- `importState(file)`

## Acceptance Criteria

The app is complete when all of these are true:

- The app launches to the task board, not a landing page.
- User can create a task with title, description, status, urgency, importance, due date, and tags.
- User can edit every task field.
- User can delete a task after confirmation.
- User can mark a task done and reopen it.
- Kanban View shows four workflow columns.
- Matrix View shows four Eisenhower quadrants.
- List View shows all visible tasks in a sortable scanning view.
- Dragging in Kanban changes task status.
- Dragging in Matrix changes urgent/important flags.
- Search works across title, description, and tags.
- Filters work for status, quadrant, due date, tags, and completion.
- Overdue/today/due-soon badges are accurate using local dates.
- State persists after page refresh.
- Export downloads a JSON file.
- Import restores a valid exported JSON file.
- Invalid imports do not destroy current state.
- The UI is responsive on mobile and desktop.
- Buttons, inputs, modal, and icon actions are accessible.
- There are no console errors during normal use.
- `npm run build` succeeds.

## One-Shot Build Instruction

When asking an LLM to build this app, give it this spec and instruct it to:

1. Implement the full app, not a prototype.
2. Use local browser persistence only.
3. Include all views, filters, modals, import/export, and drag-and-drop behavior.
4. Keep the UI compact, responsive, and production-usable.
5. Run formatting and build checks before finishing.

