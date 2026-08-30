/**
 * A field no person can see or tab into, so anything that fills it is a bot.
 * Kept off-screen rather than `display:none`, which some scripts skip.
 */
export default function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
