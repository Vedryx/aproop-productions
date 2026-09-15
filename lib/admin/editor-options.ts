export const STORY_FORMATS = [
  "Short film",
  "Feature film",
  "Documentary",
  "Music video",
  "Song",
  "Web series",
  "Animation",
];
export const PRODUCTION_STAGES = [
  "Development",
  "Writing",
  "Pre-production",
  "Production",
  "Post-production",
  "Ready for release",
  "Released",
];
export const CONTRIBUTION_PRESETS = [
  { name: "Community", amounts: [500, 1000, 2500] },
  { name: "Standard", amounts: [1000, 5000, 10000] },
  { name: "Producer", amounts: [5000, 10000, 50000] },
];
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export function closingMode(value: string) {
  if (value === "To be announced") return "tba";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "date";
  if (new RegExp(`^(${MONTHS.join("|")}) \\d{4}$`).test(value)) return "month";
  return "custom";
}
export function monthValue(label: string) {
  const [month, year] = label.split(" ");
  return MONTHS.includes(month) && year
    ? `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}`
    : "";
}
export function monthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return "";
  const [year, month] = value.split("-");
  return MONTHS[Number(month) - 1]
    ? `${MONTHS[Number(month) - 1]} ${year}`
    : "";
}
