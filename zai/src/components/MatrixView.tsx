import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import {
  ACCENT_COLORS,
  QUADRANT_DESCRIPTIONS,
  QUADRANT_LABELS,
  QUADRANT_LIST,
} from "../constants";
import { getQuadrant, sortTasksForColumn } from "../taskUtils";
import type { QuadrantKey, Task } from "../types";

interface MatrixViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function MatrixView({
  tasks,
  onEdit,
  onToggleComplete,
  onDelete,
}: MatrixViewProps) {
  return (
    <div className="matrix">
      {QUADRANT_LIST.map((q) => {
        const inQ = tasks.filter((t) => getQuadrant(t) === q);
        return (
          <MatrixQuadrant
            key={q}
            quadrant={q}
            tasks={inQ}
            onEdit={onEdit}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

interface MatrixQuadrantProps {
  quadrant: QuadrantKey;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function MatrixQuadrant({
  quadrant,
  tasks,
  onEdit,
  onToggleComplete,
  onDelete,
}: MatrixQuadrantProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `matrix-${quadrant}` });
  const sorted = sortTasksForColumn(tasks);
  const ids = sorted.map((t) => t.id);
  const accent = ACCENT_COLORS[quadrant];

  return (
    <section
      ref={setNodeRef}
      className={`matrix-quadrant accent-${accent}${isOver ? " is-over" : ""}`}
      aria-label={`${QUADRANT_LABELS[quadrant]} quadrant`}
    >
      <header className="matrix-quadrant-header">
        <div>
          <h3>{QUADRANT_LABELS[quadrant]}</h3>
          <p className="matrix-quadrant-desc">
            {QUADRANT_DESCRIPTIONS[quadrant]}
          </p>
        </div>
        <span className="count-badge" aria-label={`${sorted.length} tasks`}>
          {sorted.length}
        </span>
      </header>
      <div className="matrix-quadrant-body">
        <SortableContext
          items={ids}
          strategy={verticalListSortingStrategy}
        >
          {sorted.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {sorted.length === 0 && (
          <p className="drop-hint">Drop tasks here</p>
        )}
      </div>
    </section>
  );
}
