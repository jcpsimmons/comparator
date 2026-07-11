import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import {
  QUADRANT_DESCRIPTIONS,
  QUADRANT_KEYS,
  QUADRANT_LABELS,
} from "../constants";
import { getQuadrant, sortTasksInGroup } from "../taskUtils";
import type { QuadrantKey, Task } from "../types";
import { TaskCard } from "./TaskCard";

type MatrixViewProps = {
  tasks: Task[];
  onMove: (taskId: string, quadrant: QuadrantKey, index: number) => void;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function Quadrant({
  quadrant,
  tasks,
  onEdit,
  onToggleComplete,
  onDelete,
}: {
  quadrant: QuadrantKey;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `quadrant-${quadrant}` });
  const ids = tasks.map((t) => t.id);

  return (
    <section
      className={`matrix-quadrant q-${quadrant}${isOver ? " is-over" : ""}`}
      data-quadrant={quadrant}
      aria-label={QUADRANT_LABELS[quadrant]}
    >
      <header className="quadrant-header">
        <div>
          <h2>{QUADRANT_LABELS[quadrant]}</h2>
          <p className="quadrant-desc">{QUADRANT_DESCRIPTIONS[quadrant]}</p>
        </div>
        <span className="count-badge" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
      </header>
      <div ref={setNodeRef} className="quadrant-body">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <p className="drop-hint">Drop tasks here</p>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

export function MatrixView({
  tasks,
  onMove,
  onEdit,
  onToggleComplete,
  onDelete,
}: MatrixViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byQuadrant = useMemo(() => {
    const map: Record<QuadrantKey, Task[]> = {
      doNow: [],
      schedule: [],
      delegate: [],
      eliminate: [],
    };
    for (const t of tasks) {
      map[getQuadrant(t)].push(t);
    }
    for (const q of QUADRANT_KEYS) {
      map[q] = sortTasksInGroup(map[q]);
    }
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    let targetQuadrant: QuadrantKey | null = null;
    let targetIndex = 0;

    if (overId.startsWith("quadrant-")) {
      targetQuadrant = overId.replace("quadrant-", "") as QuadrantKey;
      targetIndex = byQuadrant[targetQuadrant].filter((t) => t.id !== taskId).length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetQuadrant = getQuadrant(overTask);
      const column = byQuadrant[targetQuadrant].filter((t) => t.id !== taskId);
      const idx = column.findIndex((t) => t.id === overId);
      targetIndex = idx >= 0 ? idx : column.length;
    }

    if (!targetQuadrant) return;
    onMove(taskId, targetQuadrant, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="matrix-board" data-view="matrix">
        {QUADRANT_KEYS.map((q) => (
          <Quadrant
            key={q}
            quadrant={q}
            tasks={byQuadrant[q]}
            onEdit={onEdit}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="task-card drag-overlay-card">
            <h3 className="task-card-title">{activeTask.title}</h3>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
