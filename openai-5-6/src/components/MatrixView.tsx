import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo } from "react";
import { QUADRANT_LABELS, QUADRANT_ORDER } from "../constants";
import { getQuadrant, sortTasksByOrder } from "../taskUtils";
import type { QuadrantKey, Task } from "../types";
import { TaskCard } from "./TaskCard";

export type MatrixMoveHandler = (
  taskId: string,
  destination: QuadrantKey,
  beforeTaskId: string | null,
) => void;

export type MatrixViewProps = {
  tasks: Task[];
  onMoveTask: MatrixMoveHandler;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
};

type MatrixQuadrantProps = {
  quadrant: QuadrantKey;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
};

const QUADRANT_DESCRIPTIONS: Record<QuadrantKey, string> = {
  doNow: "Urgent and important",
  schedule: "Important, not urgent",
  delegate: "Urgent, less important",
  eliminate: "Neither urgent nor important",
};

function MatrixQuadrant({
  quadrant,
  tasks,
  onEdit,
  onToggleComplete,
  onDelete,
}: MatrixQuadrantProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `quadrant:${quadrant}`,
    data: { type: "quadrant", quadrant },
  });

  return (
    <section
      className={`matrix-quadrant matrix-quadrant--${quadrant}`}
      aria-labelledby={`quadrant-${quadrant}`}
    >
      <header className="matrix-quadrant__header">
        <div>
          <h2 id={`quadrant-${quadrant}`}>{QUADRANT_LABELS[quadrant]}</h2>
          <p>{QUADRANT_DESCRIPTIONS[quadrant]}</p>
        </div>
        <span className="matrix-quadrant__count" role="status" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`matrix-quadrant__dropzone${isOver ? " matrix-quadrant__dropzone--over" : ""}`}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dragData={{ groupType: "quadrant", groupId: quadrant }}
              onEdit={onEdit}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 ? <p className="group-empty-state">Drop tasks here</p> : null}
      </div>
    </section>
  );
}

function getDestination(event: DragEndEvent): QuadrantKey | null {
  const overData = event.over?.data.current;
  if (!overData) return null;

  if (overData.type === "quadrant") return overData.quadrant as QuadrantKey;
  if (overData.type === "task" && overData.groupType === "quadrant") {
    return overData.groupId as QuadrantKey;
  }
  return null;
}

function getBeforeTaskId(
  event: DragEndEvent,
  destinationTasks: readonly Task[],
  source: QuadrantKey,
  destination: QuadrantKey,
): string | null | undefined {
  const over = event.over;
  if (over?.data.current?.type !== "task") return null;

  const activeId = String(event.active.id);
  const overId = String(over.id);
  if (activeId === overId) return undefined;

  const overIndex = destinationTasks.findIndex((task) => task.id === overId);
  if (overIndex < 0) return null;

  if (source === destination) {
    const activeIndex = destinationTasks.findIndex((task) => task.id === activeId);
    if (activeIndex < 0 || activeIndex === overIndex) return undefined;
    return activeIndex < overIndex ? (destinationTasks[overIndex + 1]?.id ?? null) : overId;
  }

  const translated = event.active.rect.current.translated;
  const droppedBelowTarget = translated
    ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2
    : false;

  return droppedBelowTarget ? (destinationTasks[overIndex + 1]?.id ?? null) : overId;
}

export function MatrixView({
  tasks,
  onMoveTask,
  onEdit,
  onToggleComplete,
  onDelete,
}: MatrixViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksByQuadrant = useMemo(() => {
    const grouped = {} as Record<QuadrantKey, Task[]>;
    for (const quadrant of QUADRANT_ORDER) {
      grouped[quadrant] = sortTasksByOrder(tasks.filter((task) => getQuadrant(task) === quadrant));
    }
    return grouped;
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current;
    if (!event.over || activeData?.type !== "task" || activeData.groupType !== "quadrant") {
      return;
    }

    const destination = getDestination(event);
    if (!destination) return;

    const source = activeData.groupId as QuadrantKey;
    const beforeTaskId = getBeforeTaskId(event, tasksByQuadrant[destination], source, destination);
    if (beforeTaskId === undefined) return;

    onMoveTask(String(event.active.id), destination, beforeTaskId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <section className="matrix-board" aria-label="Eisenhower matrix">
        {QUADRANT_ORDER.map((quadrant) => (
          <MatrixQuadrant
            key={quadrant}
            quadrant={quadrant}
            tasks={tasksByQuadrant[quadrant]}
            onEdit={onEdit}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
          />
        ))}
      </section>
    </DndContext>
  );
}

export default MatrixView;
