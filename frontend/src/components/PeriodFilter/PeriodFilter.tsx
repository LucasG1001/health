import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import { PERIOD_LABELS, type Period } from "../../utils/chartUtils";

const PERIODS: Period[] = ["week", "month", "year", "all"];
const OPTIONS = PERIODS.map((period) => ({ value: period, label: PERIOD_LABELS[period] }));

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return <SegmentedControl label="Período" value={value} options={OPTIONS} onChange={onChange} />;
}
