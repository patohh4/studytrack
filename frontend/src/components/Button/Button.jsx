import styles from "./Button.module.css";

export default function Button({ variant = "primary", icon, children, ...props }) {
  return (
    <button className={`${styles.button} ${styles[variant]}`} {...props}>
      {icon && <span className="material-symbols-outlined">{icon}</span>}
      {children}
    </button>
  );
}
