"use client";
export default function StarButton({
  title,
  starred,
  disabled,
  reason,
  onClick,
  showLabel = false,
}: {
  title: string;
  starred: boolean;
  disabled?: boolean;
  reason?: string;
  onClick: () => void;
  showLabel?: boolean;
}) {
  const label = starred
    ? `Remove ${title} from homepage`
    : `Feature ${title} on homepage`;
  return (
    <button
      type="button"
      className={`admin-star ${starred ? "is-starred" : ""}`}
      aria-label={label}
      aria-pressed={starred}
      disabled={disabled}
      title={
        reason ||
        (starred
          ? "On the homepage. Click to remove."
          : "Star to show on the homepage. Two stories maximum.")
      }
      onClick={onClick}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill={starred ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91L12 3Z" />
      </svg>
      {showLabel && (
        <span>{starred ? "On homepage" : "Star for homepage"}</span>
      )}
    </button>
  );
}
