import { Select } from "@/components/app/ui";

export function SleepQualitySelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (quality: number) => void;
}) {
  return (
    <label className="block text-sm">
      Sleep quality
      <Select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1"
      >
        <option value={0}>Unrated</option>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
          <option key={rating} value={rating}>
            {rating}/10
          </option>
        ))}
      </Select>
    </label>
  );
}
