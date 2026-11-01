import { useState } from "react";
import Button from "../Button/Button.jsx";
import Status from "../Status/Status.jsx";
import TaskCard from "../TaskCard/TaskCard.jsx";
import TaskForm from "../TaskForm/TaskForm.jsx";
import { useTasks, useToggleTask } from "../../hooks/useTasks.js";
import { calcStreak } from "../../lib/progress.js";
import { FILTERS, filterTasks, formatDue, getStats, isDone, isOverdue } from "../../lib/tasks.js";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { data: tasks = [], isPending, error } = useTasks();
  const toggleTask = useToggleTask();
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const stats = getStats(tasks);
  const visible = filterTasks(tasks, filter);
  const summary = [
    { label: "Усього завдань", value: stats.total },
    { label: "Виконано", value: stats.done },
    { label: "Прострочено", value: stats.overdue },
    { label: "Серія днів", value: calcStreak(tasks) },
  ];

  return (
    <section>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Мій тиждень</p>
          <h1 className={styles.title}>Завдання</h1>
        </div>
        <Button icon={showForm ? "close" : "add"} onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Закрити" : "Нове завдання"}
        </Button>
      </header>

      {showForm && <TaskForm onDone={() => setShowForm(false)} />}

      <div className={styles.stats}>
        {summary.map((item) => (
          <div key={item.label} className={styles.stat}>
            <strong className={styles.statValue}>{item.value}</strong>
            <span className={styles.statLabel}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.filters} role="tablist">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={filter === item.id}
            className={`${styles.filter} ${filter === item.id ? styles.filterActive : ""}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Status
        loading={isPending}
        error={error ?? toggleTask.error}
        empty={!isPending && !error && visible.length === 0}
        emptyText="Завдань поки немає"
      />

      <div className={styles.list}>
        {visible.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            course={task.courses?.name}
            due={formatDue(task.due_at)}
            done={isDone(task)}
            overdue={isOverdue(task)}
            onToggle={(id, done) => toggleTask.mutate({ id, done })}
          />
        ))}
      </div>
    </section>
  );
}
