import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "./Layout.module.css";

const links = [
  { to: "/tasks", label: "Завдання", icon: "task_alt" },
  { to: "/calendar", label: "Календар", icon: "calendar_month" },
  { to: "/courses", label: "Курси", icon: "menu_book" },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || user?.email || "Користувач";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

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
          <span className={styles.avatar}>{initials}</span>
          <div>
            <p className={styles.userName}>{name}</p>
            <button type="button" className={styles.logout} onClick={handleLogout}>
              Вийти
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
