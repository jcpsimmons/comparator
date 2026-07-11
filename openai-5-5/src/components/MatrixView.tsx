import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { QUADRANT_META, QUADRANT_ORDER } from "../constants";
import { getQuadrant, getQuadrantLabel, sortTasksForBoard } from "../taskUtils";
import type { QuadrantKey, Task } from "../types";
import { SortableTaskCard } from "./TaskCard";

type MatrixViewProps = {
  tasks: Task[];
  onTaskDrop: (taskId: string, targetQuadrant: QuadrantKey, overTaskId: string | null) => void;
  onEditTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
};

function MatrixQuadrant({
  quadrant,
  tasks,
  onEditTask,
  onToggleComplete,
  onDeleteTask,
}: Omit<MatrixViewProps, "onTaskDrop" | "tasks"> & { quadrant: QuadrantKey; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `matrix-${quadrant}`,
    data: {
      type: "container",
      group: quadrant,
    },
  });
  const sortedTasks = sortTasksForBoard(tasks);

  return (
    <section className={`matrix-quadrant ${QUADRANT_META[quadrant].className} ${isOver ? "is-over" : ""}`} ref={setNodeRef}>
      <div className="quadrant-header">
        <div>
          <h2>{getQuadrantLabel(quadrant)}</h2>
          <p>{QUADRANT_META[quadrant].description}</p>
        </div>
        <span>{sortedTasks.length}</span>
      </div>
      <SortableContext items={sortedTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="task-stack">
          {sortedTasks.length > 0 ? (
            sortedTasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                group={quadrant}
                onEdit={onEditTask}
                onToggleComplete={onToggleComplete}
                onDelete={onDeleteTask}
              />
            ))
          ) : (
            <p className="drop-empty">Drop tasks here</p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function MatrixView({ tasks, onTaskDrop, onEditTask, onToggleComplete, onDeleteTask }: MatrixViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const targetQuadrant = over.data.current?.group as QuadrantKey | undefined;
    if (!targetQuadrant || !QUADRANT_ORDER.includes(targetQuadrant)) return;

    const overTaskId = over.data.current?.type === "task" ? String(over.id) : null;
    onTaskDrop(String(active.id), targetQuadrant, overTaskId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="matrix-grid">
        {QUADRANT_ORDER.map((quadrant) => (
          <MatrixQuadrant
            key={quadrant}
            quadrant={quadrant}
            tasks={tasks.filter((task) => getQuadrant(task) === quadrant)}
            onEditTask={onEditTask}
            onToggleComplete={onToggleComplete}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
