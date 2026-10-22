import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../Button/Button.jsx";
import { tasks } from "../../data/mock.js";
import styles from "./TaskDetails.module.css";

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const task = tasks.find((item) => String(item.id) === taskId);

  if (!task) {
    return (
      <section>
        <h1 className={styles.title}>Завдання не знайдено</h1>
        <p className={styles.note}>Завдання з номером {taskId} не існує.</p>
        <Link to="/tasks" className={styles.back}>
          ← До списку завдань
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link to="/tasks" className={styles.back}>
        ← До списку завдань
      </Link>
      <h1 className={styles.title}>{task.title}</h1>

      <dl className={styles.info}>
        <div>
          <dt>Курс</dt>
          <dd>{task.course}</dd>
        </div>
        <div>
          <dt>Термін</dt>
          <dd>{task.due}</dd>
        </div>
        <div>
          <dt>Статус</dt>
          <dd>{task.done ? "Виконано" : task.overdue ? "Прострочено" : "В процесі"}</dd>
        </div>
      </dl>

      <p className={styles.description}>{task.description}</p>

      <Button variant="secondary" icon="arrow_back" onClick={() => navigate(-1)}>
        Назад
      </Button>
    </section>
  );
}
