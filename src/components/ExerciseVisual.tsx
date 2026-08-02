import { getVisualAsset } from "../data/exerciseVisuals";
import styles from "./ExerciseVisual.module.css";

/**
 * Registry `assetPath` values are root-relative (e.g. "/exercise-visuals/leg-press.webp"),
 * but the app can be deployed under a sub-path (see `vite.config.ts`'s
 * `basePath`, used for GitHub Pages project sites). Resolving through Vite's
 * runtime `BASE_URL` keeps the image working in both cases instead of
 * silently 404ing once deployed under a sub-path.
 */
function resolveAssetPath(assetPath: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${normalizedBase}${normalizedPath}`;
}

interface ExerciseVisualProps {
  /** `Exercise.visualAssetKey` / `WarmupItem.visualAssetKey` / `CardioBlock.visualAssetKey`. */
  visualAssetKey?: string;
  /**
   * "detail" renders full width, with a compact "Visual coming soon" placeholder
   * while the real asset is still `"planned"`.
   * "thumb" renders a small square crop for scannable lists — a full-width image
   * per row turns a 6-exercise workout into an unreadable wall.
   * "session" renders the focused movement inline at a readable size and never
   * renders anything for a movement without a ready asset.
   */
  variant?: "detail" | "session" | "thumb";
  /**
   * Skips lazy loading. Set on the one visual the user is looking at right now
   * (the focused exercise in a session) so it is never blank on arrival.
   */
  eager?: boolean;
}

/**
 * Renders the reusable visual for one movement, looked up from the
 * `EXERCISE_VISUALS` registry by `visualAssetKey`. The workout is always
 * fully usable without this component ever showing a real image - it never
 * renders a broken `<img>`, and completing a workout never depends on it.
 */
export default function ExerciseVisual({
  visualAssetKey,
  variant = "detail",
  eager = false
}: ExerciseVisualProps) {
  const asset = visualAssetKey ? getVisualAsset(visualAssetKey) : undefined;
  const isReady = !!asset && asset.status === "ready" && !!asset.assetPath;

  if (!asset) return null;

  if (variant === "thumb") {
    if (!isReady) return <div className={styles.thumbPlaceholder} aria-hidden="true" />;
    return (
      <img
        className={styles.thumbImage}
        src={resolveAssetPath(asset.assetPath as string)}
        alt=""
        width={800}
        height={600}
        loading="lazy"
        decoding="async"
      />
    );
  }

  if (variant === "session") {
    if (!isReady) return null;
    return (
      <img
        className={styles.sessionImage}
        src={resolveAssetPath(asset.assetPath as string)}
        alt={asset.altText}
        width={800}
        height={600}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  if (!isReady) {
    return (
      <div className={styles.placeholder} aria-hidden="true">
        <span>Visual coming soon</span>
      </div>
    );
  }

  return (
    <img
      className={styles.detailImage}
      src={resolveAssetPath(asset.assetPath as string)}
      alt={asset.altText}
      width={800}
      height={600}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
