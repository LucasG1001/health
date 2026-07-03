import type { ComponentType } from "react";
import type { BadgeWithAward } from "../../types/stats";
import { formatDate } from "../../utils/format";
import {
  CrownIcon,
  FlameIcon,
  MedalIcon,
  PlayIcon,
  StarIcon,
  TrophyIcon,
  WeightIcon,
} from "../Icon/icons";
import styles from "./BadgeGrid.module.css";

const BADGE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  play: PlayIcon,
  medal: MedalIcon,
  trophy: TrophyIcon,
  flame: FlameIcon,
  star: StarIcon,
  crown: CrownIcon,
  weight: WeightIcon,
};

interface BadgeGridProps {
  badges: BadgeWithAward[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <div className={styles.grid}>
      {badges.map((badge) => {
        const BadgeIcon = BADGE_ICONS[badge.icon] ?? StarIcon;
        const earned = badge.awardedAt !== null;
        return (
          <div
            key={badge.id}
            className={`${styles.badge} ${earned ? styles.earned : ""}`}
            title={badge.description}
          >
            <div className={styles.iconWrap}>
              <BadgeIcon className={styles.icon} />
            </div>
            <span className={styles.name}>{badge.name}</span>
            <span className={styles.status}>
              {earned ? formatDate(badge.awardedAt!.slice(0, 10)) : "bloqueada"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
