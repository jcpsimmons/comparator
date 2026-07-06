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
import { STATUS_ORDER } from "../constants";
import { getStatusLabel, sortTasksForBoard } from "../taskUtils";
import type { Task, TaskStatus } from "../types";
import { SortableTaskCard } from "./TaskCard";

type KanbanViewProps = {
  tasks: Task[];
  onTaskDrop: (taskId: string, targetStatus: TaskStatus, overTaskId: string | null) => void;
  onEditTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
};

function KanbanColumn({
  status,
  tasks,
  onEditTask,
  onToggleComplete,
  onDeleteTask,
}: Omit<KanbanViewProps, "onTaskDrop" | "tasks"> & { status: TaskStatus; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-${status}`,
    data: {
      type: "container",
      group: status,
    },
  });

  const sortedTasks = sortTasksForBoard(tasks);

  return (
    <section className={`board-column ${isOver ? "is-over" : ""}`} ref={setNodeRef} aria-label={`${getStatusLabel(status)} column`}>
      <div className="column-header">
        <h2>{getStatusLabel(status)}</h2>
        <span>{sortedTasks.length}</span>
      </div>
      <SortableContext items={sortedTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="task-stack">
          {sortedTasks.length > 0 ? (
            sortedTasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                group={status}
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

export function KanbanView({ tasks, onTaskDrop, onEditTask, onToggleComplete, onDeleteTask }: KanbanViewProps) {
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

    const targetStatus = over.data.current?.group as TaskStatus | undefined;
    if (!targetStatus || !STATUS_ORDER.includes(targetStatus)) return;

    const overTaskId = over.data.current?.type === "task" ? String(over.id) : null;
    onTaskDrop(String(active.id), targetStatus, overTaskId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="kanban-grid">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
            onEditTask={onEditTask}
            onToggleComplete={onToggleComplete}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
