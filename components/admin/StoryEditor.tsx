"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { projectSchema, type AdminProject } from "@/lib/admin/schema";
import { fmtINR } from "@/lib/producer";

export const STORY_STEPS = [
  "Story details",
  "Poster",
  "Funding",
  "Review & publish",
];
const FIELDS = [
  ["title", "kind", "synopsis", "director", "stage", "closes"],
  ["poster", "ph"],
  ["need", "raised", "backers", "options"],
  ["published", "homepageSlot"],
];
export function storyStepFor(field: string) {
  return Math.max(
    0,
    FIELDS.findIndex((fields) => fields.includes(field)),
  );
}
export function storyIssues(project: AdminProject, step?: number) {
  const result = projectSchema.safeParse(project);
  const errors: Record<string, string> = {};
  if (!result.success)
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      if (step === undefined || FIELDS[step].includes(field))
        errors[field] ??= issue.message;
    }
  return errors;
}

type Props = {
  project: AdminProject;
  step: number;
  errors: Record<string, string>;
  busy: boolean;
  dirty: boolean;
  onChange: (patch: Partial<AdminProject>) => void;
  onStep: (step: number) => void;
  onErrors: (errors: Record<string, string>) => void;
  onUpload: (file?: File) => Promise<void>;
  onSave: () => Promise<void>;
  onClose: () => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
};
export default function StoryEditor({
  project: p,
  step,
  errors,
  busy,
  dirty,
  onChange,
  onStep,
  onErrors,
  onUpload,
  onSave,
  onClose,
  onRemove,
  onMove,
}: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    if (!Object.keys(errors).length) return;
    heading.current
      ?.closest(".story-step-body")
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errors, step]);
  function navigate(next: number) {
    if (next > step) {
      const issues = storyIssues(p, step);
      onErrors(issues);
      if (Object.keys(issues).length) return;
    } else onErrors({});
    onStep(next);
  }
  function field(
    name: keyof AdminProject,
    label: string,
    multiline = false,
    type = "text",
    min = 0,
  ) {
    const id = `story-field-${name}`;
    const props = {
      id,
      value: String(p[name]),
      "aria-invalid": !!errors[name],
      "aria-describedby": errors[name] ? `${id}-error` : undefined,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) =>
        onChange({
          [name]:
            type === "number"
              ? e.target.value === ""
                ? Number.NaN
                : Number(e.target.value)
              : e.target.value,
        }),
    };
    // Keep an emptied numeric field empty until the user supplies its replacement.
    if (type === "number" && Number.isNaN(p[name])) props.value = "";
    return (
      <div className={`story-field ${multiline ? "story-field-wide" : ""}`}>
        <label htmlFor={id}>{label}</label>
        {multiline ? (
          <textarea {...props} rows={3} />
        ) : (
          <input {...props} type={type} min={min} />
        )}
        {errors[name] && (
          <span id={`${id}-error`} className="story-field-error">
            {errors[name]}
          </span>
        )}
      </div>
    );
  }
  const allIssues = storyIssues(p);
  return (
    <section
      className="story-workspace"
      aria-label="Story editor"
      aria-busy={busy}
    >
      <div className="story-editor-title">
        <button onClick={onClose}>← All stories</button>
        <span className={`admin-badge ${p.published ? "live" : ""}`}>
          {p.published ? "Published" : "Draft"}
        </span>
        <span className="story-editor-name">{p.title || "Untitled story"}</span>
      </div>
      <nav className="story-steps" aria-label="Story editing steps">
        {STORY_STEPS.map((label, i) => (
          <button
            key={label}
            aria-current={step === i ? "step" : undefined}
            onClick={() => navigate(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>
      <div className="story-step-body">
        <div className="story-step-heading">
          <div>
            <p className="admin-kicker">STEP {step + 1} OF 4</p>
            <h2 ref={heading} tabIndex={-1}>
              {
                [
                  "Start with the story.",
                  "Give it a face.",
                  "Set the contribution options.",
                  "Ready for your audience?",
                ][step]
              }
            </h2>
          </div>
          <p>
            {
              [
                "The essentials visitors need to understand your project.",
                "Upload a poster or use an image link. A landscape crop works best.",
                "Choose the goal and the amounts supporters can contribute.",
                "Check the details and choose whether this story is visible.",
              ][step]
            }
          </p>
        </div>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="story-validation">
            Check the highlighted fields before continuing.
          </p>
        )}
        {step === 0 && (
          <div className="story-fields">
            {field("title", "Story title")}
            {field("kind", "Type / format")}
            {field("synopsis", "Synopsis", true)}
            {field("director", "Director")}
            {field("stage", "Production stage")}
            {field("closes", "Closing date / label")}
          </div>
        )}
        {step === 1 && (
          <div className="story-poster-grid">
            <div className="story-poster-preview">
              <Image
                unoptimized
                width={800}
                height={500}
                src={p.poster}
                alt={p.ph || "Story poster preview"}
              />
              <span>Poster preview</span>
            </div>
            <div className="story-poster-controls">
              <label className="admin-upload">
                Upload poster
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    void onUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <small>JPG, PNG or WebP · up to 5 MB</small>
              </label>
              {field("poster", "Poster URL")}
              {field("ph", "Image description")}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="story-funding-grid">
            <div>
              {field("need", "Funding goal (₹)", false, "number", 1)}
              <fieldset className="story-tiers">
                <legend>Contribution amounts (₹)</legend>
                <p className="admin-help">
                  Up to six suggested amounts. Supporters can also choose a
                  custom amount.
                </p>
                <div className="story-tier-grid">
                  {p.options.map((amount, i) => (
                    <div className="admin-tier" key={i}>
                      <input
                        aria-label={`Contribution amount ${i + 1}`}
                        aria-invalid={!!errors.options}
                        type="number"
                        min={1}
                        value={Number.isNaN(amount) ? "" : amount}
                        onChange={(e) =>
                          onChange({
                            options: p.options.map((value, index) =>
                              index === i
                                ? e.target.value === ""
                                  ? Number.NaN
                                  : Number(e.target.value)
                                : value,
                            ),
                          })
                        }
                      />
                      <button
                        aria-label={`Remove amount ${i + 1}`}
                        disabled={p.options.length === 1}
                        onClick={() =>
                          onChange({
                            options: p.options.filter((_, n) => n !== i),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {errors.options && (
                  <p className="story-field-error">{errors.options}</p>
                )}
                <button
                  disabled={p.options.length >= 6}
                  onClick={() =>
                    onChange({
                      options: [
                        ...p.options,
                        Math.max(0, ...p.options.filter(Number.isFinite)) +
                          1000,
                      ],
                    })
                  }
                >
                  + Add amount
                </button>
              </fieldset>
            </div>
            <div className="story-recorded">
              <p className="admin-kicker">PROGRESS SO FAR</p>
              <p>Only record contributions you have already received.</p>
              {field("raised", "Raised so far (₹)", false, "number")}
              {field("backers", "Producer count", false, "number")}
              <p className="admin-help">
                These figures are entered manually. Verify the original site’s
                figures before publishing.
              </p>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="story-review-grid">
            <div className="story-review-card">
              <Image
                unoptimized
                width={600}
                height={375}
                src={p.poster}
                alt={p.ph}
              />
              <div>
                <span className="admin-kicker">{p.kind}</span>
                <h3>{p.title}</h3>
                <p>{p.synopsis}</p>
                <dl>
                  <div>
                    <dt>Director</dt>
                    <dd>{p.director}</dd>
                  </div>
                  <div>
                    <dt>Stage</dt>
                    <dd>{p.stage}</dd>
                  </div>
                  <div>
                    <dt>Goal</dt>
                    <dd>
                      {Number.isFinite(p.need) && p.need > 0
                        ? fmtINR(p.need)
                        : "Set a funding goal"}
                    </dd>
                  </div>
                  <div>
                    <dt>Closes</dt>
                    <dd>{p.closes}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="story-publish">
              <h3>Visibility</h3>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={p.published}
                  onChange={(e) => onChange({ published: e.target.checked })}
                />
                Published on website
              </label>
              <p className="admin-help">
                {p.published
                  ? "This story will appear on Be the Producer after saving."
                  : "This story stays private until you publish it."}
              </p>
              <p className="admin-help">
                {p.homepageSlot
                  ? `Selected for homepage slot ${p.homepageSlot}.`
                  : "Choose a homepage slot from Homepage stories after publishing."}
              </p>
              {Object.keys(allIssues).length > 0 && (
                <button
                  onClick={() => {
                    onErrors(allIssues);
                    onStep(storyStepFor(Object.keys(allIssues)[0]));
                  }}
                >
                  Complete missing details →
                </button>
              )}
              <details className="story-more">
                <summary>Ordering and removal</summary>
                <div className="admin-actions">
                  <button onClick={() => onMove(-1)}>↑ Move up</button>
                  <button onClick={() => onMove(1)}>↓ Move down</button>
                </div>
                <button className="admin-danger" onClick={onRemove}>
                  Remove story
                </button>
              </details>
            </div>
          </div>
        )}
      </div>
      <footer className="story-step-footer">
        <div>
          <button disabled={step === 0} onClick={() => navigate(step - 1)}>
            ← Back
          </button>
          <span>Step {step + 1} of 4</span>
        </div>
        {step < 3 ? (
          <button className="admin-primary" onClick={() => navigate(step + 1)}>
            Next: {STORY_STEPS[step + 1]} →
          </button>
        ) : (
          <button
            className="admin-primary"
            disabled={busy || !dirty}
            onClick={onSave}
          >
            Save story changes ↗
          </button>
        )}
      </footer>
    </section>
  );
}
