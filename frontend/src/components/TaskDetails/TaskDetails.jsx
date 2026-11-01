import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../Button/Button.jsx";
import Status from "../Status/Status.jsx";
import { useDeleteTask, useTasks, useToggleTask } from "../../hooks/useTasks.js";
import { formatDue, isDone, isOverdue } from "../../lib/tasks.js";
import styles from "./TaskDetails.module.css";

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { data: tasks = [], isPending, error } = useTasks();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();
  const task = tasks.find((item) => String(item.id) === taskId);

  if (isPending || error) {
    return <Status loading={isPending} error={error} />;
  }

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

  const done = isDone(task);
  const status = done ? "Виконано" : isOverdue(task) ? "Прострочено" : "В процесі";

  return (
    <section>
      <Link to="/tasks" className={styles.back}>
        ← До списку завдань
      </Link>
      <h1 className={styles.title}>{task.title}</h1>

      <dl className={styles.info}>
        <div>
          <dt>Курс</dt>
          <dd>{task.courses?.name ?? "Без курсу"}</dd>
        </div>
        <div>
          <dt>Термін</dt>
          <dd>{formatDue(task.due_at)}</dd>
        </div>
        <div>
          <dt>Статус</dt>
          <dd>{status}</dd>
        </div>
      </dl>

      {task.description && <p className={styles.description}>{task.description}</p>}

      {(toggleTask.error || deleteTask.error) && (
        <p className={styles.note}>{(toggleTask.error || deleteTask.error).message}</p>
      )}

      <div className={styles.actions}>
        <Button onClick={() => toggleTask.mutate({ id: task.id, done: !done })}>
          {done ? "Повернути в роботу" : "Позначити виконаним"}
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            deleteTask.mutate({ id: task.id }, { onSuccess: () => navigate("/tasks") })
          }
        >
          Видалити
        </Button>
        <Button variant="secondary" icon="arrow_back" onClick={() => navigate(-1)}>
          Назад
        </Button>
      </div>
    </section>
  );
}
