import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import { POSE_LABELS } from "../../utils/format";
import type { PhotoPose } from "../../types/photo";

const OPTIONS = (Object.keys(POSE_LABELS) as PhotoPose[]).map((pose) => ({
  value: pose,
  label: POSE_LABELS[pose],
}));

interface PoseSelectorProps {
  value: PhotoPose;
  onChange: (pose: PhotoPose) => void;
}

export function PoseSelector({ value, onChange }: PoseSelectorProps) {
  return <SegmentedControl label="Pose" value={value} options={OPTIONS} onChange={onChange} />;
}
