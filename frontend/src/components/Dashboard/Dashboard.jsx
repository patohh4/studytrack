import Button from "../Button/Button.jsx";
import TaskCard from "../TaskCard/TaskCard.jsx";
import { tasks } from "../../data/mock.js";
import styles from "./Dashboard.module.css";

const stats = [
  { label: "Усього завдань", value: tasks.length },
  { label: "Виконано", value: tasks.filter((t) => t.done).length },
  { label: "Прострочено", value: tasks.filter((t) => t.overdue).length },
];

export default function Dashboard() {
  return (
    <section>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Мій тиждень</p>
          <h1 className={styles.title}>Завдання</h1>
        </div>
        <Button icon="add">Нове завдання</Button>
      </header>

      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <strong className={styles.statValue}>{stat.value}</strong>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.list}>
        {tasks.map((task) => (
          <TaskCard key={task.id} {...task} />
        ))}
      </div>
    </section>
  );
}
