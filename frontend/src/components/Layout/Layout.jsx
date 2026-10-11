import { NavLink, Outlet } from "react-router-dom";
import styles from "./Layout.module.css";

const links = [
  { to: "/tasks", label: "Завдання", icon: "task_alt" },
  { to: "/calendar", label: "Календар", icon: "calendar_month" },
  { to: "/courses", label: "Курси", icon: "menu_book" },
];

export default function Layout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>
            <span className="material-symbols-outlined">school</span>
          </span>
          StudyTrack
        </div>

        <nav className={styles.nav}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.user}>
          <span className={styles.avatar}>СР</span>
          <div>
            <p className={styles.userName}>Станіслав Р.</p>
            <NavLink to="/login" className={styles.logout}>
              Вийти
            </NavLink>
          </div>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
