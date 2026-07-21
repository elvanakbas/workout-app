import { useState } from "react";
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
   * "detail" renders inline, with a compact "Visual coming soon" placeholder
   * while the real asset is still `"planned"`. "session" is collapsible and
   * renders nothing at all until a real asset is `"ready"`, keeping the fast
   * workout-logging flow uncluttered for movements that don't have one yet.
   */
  variant?: "detail" | "session";
}

/**
 * Renders the reusable visual for one movement, looked up from the
 * `EXERCISE_VISUALS` registry by `visualAssetKey`. The workout is always
 * fully usable without this component ever showing a real image - it never
 * renders a broken `<img>`, and completing a workout never depends on it.
 */
export default function ExerciseVisual({ visualAssetKey, variant = "detail" }: ExerciseVisualProps) {
  const [expanded, setExpanded] = useState(false);
  const asset = visualAssetKey ? getVisualAsset(visualAssetKey) : undefined;
  const isReady = !!asset && asset.status === "ready" && !!asset.assetPath;

  if (!asset) return null;

  if (variant === "session") {
    if (!isReady) return null;
    return (
      <div className={styles.sessionWrap}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} visual for ${asset.displayName}`}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Hide visual" : "Show visual"}
        </button>
        {expanded ? (
          <img
            className={styles.sessionImage}
            src={resolveAssetPath(asset.assetPath as string)}
            alt={asset.altText}
            width={800}
            height={600}
            loading="lazy"
          />
        ) : null}
      </div>
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
      loading="lazy"
    />
  );
}
