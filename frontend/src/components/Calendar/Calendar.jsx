import { calendarEvents } from "../../data/mock.js";
import styles from "./Calendar.module.css";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const DAYS_IN_MONTH = 31;
const FIRST_WEEKDAY_OFFSET = 3; // 1 жовтня 2026 — четвер

const cells = Array.from({ length: 35 }, (_, i) => {
  const day = i - FIRST_WEEKDAY_OFFSET + 1;
  return day >= 1 && day <= DAYS_IN_MONTH ? day : null;
});

export default function Calendar() {
  return (
    <section>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Дедлайни</p>
        <h1 className={styles.title}>Жовтень 2026</h1>
      </header>

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
              (calendarEvents[day] ?? []).map((event) => (
                <span key={event} className={styles.event}>
                  {event}
                </span>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
