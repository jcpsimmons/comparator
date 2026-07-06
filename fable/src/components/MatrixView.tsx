import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { QUADRANT_DESCRIPTIONS, QUADRANT_LABELS, QUADRANT_ORDER } from "../constants";
import { getQuadrant, sortByGroupOrder } from "../taskUtils";
import { SortableTaskCard } from "./SortableTaskCard";
import { TaskCard } from "./TaskCard";
import type { DropTarget, QuadrantKey, Task } from "../types";

type MatrixViewProps = {
  tasks: Task[];
  onTaskDrop: (taskId: string, target: DropTarget, overTaskId: string | null) => void;
  onEdit: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
};

const QUADRANT_ID_PREFIX = "quadrant:";

type MatrixQuadrantProps = {
  quadrant: QuadrantKey;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function MatrixQuadrant({ quadrant, tasks, onEdit, onToggleDone, onDelete }: MatrixQuadrantProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${QUADRANT_ID_PREFIX}${quadrant}` });

  return (
    <section
      className={`board-column matrix-quadrant matrix-quadrant-${quadrant}`}
      aria-label={`${QUADRANT_LABELS[quadrant]} quadrant: ${QUADRANT_DESCRIPTIONS[quadrant]}`}
    >
      <header className="board-column-header">
        <div>
          <h2 className="board-column-title">{QUADRANT_LABELS[quadrant]}</h2>
          <p className="board-column-subtitle">{QUADRANT_DESCRIPTIONS[quadrant]}</p>
        </div>
        <span className="board-column-count" aria-label={`${tasks.length} tasks visible`}>
          {tasks.length}
        </span>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`board-column-body${isOver ? " board-column-body-over" : ""}`}
        >
          {tasks.length === 0 && <p className="drop-hint">Drop tasks here</p>}
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              showQuadrant={false}
              onEdit={onEdit}
              onToggleDone={onToggleDone}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

export function MatrixView({ tasks, onTaskDrop, onEdit, onToggleDone, onDelete }: MatrixViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const quadrants = useMemo(() => {
    const byQuadrant = new Map<QuadrantKey, Task[]>(QUADRANT_ORDER.map((q) => [q, []]));
    for (const task of tasks) {
      byQuadrant.get(getQuadrant(task))?.push(task);
    }
    return QUADRANT_ORDER.map((quadrant) => ({
      quadrant,
      tasks: sortByGroupOrder(byQuadrant.get(quadrant) ?? []),
    }));
  }, [tasks]);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(taskById.get(String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (overId.startsWith(QUADRANT_ID_PREFIX)) {
      const quadrant = overId.slice(QUADRANT_ID_PREFIX.length) as QuadrantKey;
      onTaskDrop(activeId, { type: "quadrant", value: quadrant }, null);
      return;
    }
    const overTask = taskById.get(overId);
    if (!overTask) return;
    onTaskDrop(activeId, { type: "quadrant", value: getQuadrant(overTask) }, overId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="matrix-grid">
        {quadrants.map(({ quadrant, tasks: quadrantTasks }) => (
          <MatrixQuadrant
            key={quadrant}
            quadrant={quadrant}
            tasks={quadrantTasks}
            onEdit={onEdit}
            onToggleDone={onToggleDone}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            showQuadrant={false}
            onEdit={() => {}}
            onToggleDone={() => {}}
            onDelete={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
