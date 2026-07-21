import { Route, Routes } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import HomeScreen from "./screens/HomeScreen";
import WorkoutDetailScreen from "./screens/WorkoutDetailScreen";
import ActiveSessionScreen from "./screens/ActiveSessionScreen";
import HistoryScreen from "./screens/HistoryScreen";
import NotFoundScreen from "./screens/NotFoundScreen";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/workout/:workoutId" element={<WorkoutDetailScreen />} />
          <Route path="/workout/:workoutId/session" element={<ActiveSessionScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
