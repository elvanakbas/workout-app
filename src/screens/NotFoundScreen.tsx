import { Link } from "react-router-dom";
import styles from "./NotFoundScreen.module.css";

export default function NotFoundScreen() {
  return (
    <div className={styles.screen}>
      <p>Page not found.</p>
      <Link to="/">Back to program</Link>
    </div>
  );
}
