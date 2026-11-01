import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../Button/Button.jsx";
import Status from "../Status/Status.jsx";
import { useTasks } from "../../hooks/useTasks.js";
import { MONTH_NAMES, buildMonth, groupByDay, shiftMonth } from "../../lib/calendar.js";
import styles from "./Calendar.module.css";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export default function Calendar() {
  const today = new Date();
  const [{ year, month }, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const { data: tasks = [], isPending, error } = useTasks();

  const cells = buildMonth(year, month);
  const byDay = groupByDay(tasks, year, month);

  return (
    <section>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Дедлайни</p>
          <h1 className={styles.title}>
            {MONTH_NAMES[month]} {year}
          </h1>
        </div>
        <div className={styles.nav}>
          <Button
            variant="secondary"
            aria-label="Попередній місяць"
            icon="chevron_left"
            onClick={() => setView(shiftMonth(year, month, -1))}
          />
          <Button
            variant="secondary"
            aria-label="Наступний місяць"
            icon="chevron_right"
            onClick={() => setView(shiftMonth(year, month, 1))}
          />
        </div>
      </header>

      <Status loading={isPending} error={error} />

      <div className={styles.grid}>
        {weekdays.map((day) => (
          <div key={day} className={styles.weekday}>
            {day}
          </div>
        ))}

        {cells.map((day, index) => (
          <div key={index} className={`${styles.cell} ${day ? "" : styles.empty}`}>
            {day && <span className={styles.day}>{day}</span>}
            {day &&
              (byDay[day] ?? []).map((task) => (
                <Link key={task.id} to={`/tasks/${task.id}`} className={styles.event}>
                  {task.title}
                </Link>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
