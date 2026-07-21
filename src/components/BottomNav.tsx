import { NavLink } from "react-router-dom";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.link} ${styles.linkActive}` : styles.link;

  return (
    <nav className={styles.nav} aria-label="Primary">
      <NavLink to="/" className={linkClassName} end>
        Program
      </NavLink>
      <NavLink to="/history" className={linkClassName}>
        History
      </NavLink>
    </nav>
  );
}
