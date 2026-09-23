"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import ChoiceField, { ClosingField } from "./ChoiceField";
import StarButton from "./StarButton";
import {
  STORY_FORMATS,
  PRODUCTION_STAGES,
  CONTRIBUTION_PRESETS,
} from "@/lib/admin/editor-options";
import {
  projectSchema,
  imagePath,
  type AdminProject,
} from "@/lib/admin/schema";
import { fmtINR, formatClosingDate } from "@/lib/producer";

export const STORY_STEPS = [
  "Story details",
  "Poster",
  "Funding",
  "Review & publish",
];
const FIELDS = [
  ["title", "kind", "synopsis", "director", "stage", "closes"],
  ["poster", "ph"],
  [
    "need",
    "raised",
    "backers",
    "options",
    "fundingState",
    "fundingTerms",
    "minContribution",
    "maxContribution",
  ],
  ["published", "homepageSlot"],
];
export function storyStepFor(field: string) {
  return Math.max(
    0,
    FIELDS.findIndex((fields) => fields.includes(field)),
  );
}
export function storyIssues(project: AdminProject, step?: number) {
  const result = projectSchema.safeParse({ ...project, published: true });
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
  directorChoices: string[];
  formatChoices: string[];
  stageChoices: string[];
  onStar: () => void;
  starDisabled: boolean;
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
  directorChoices,
  formatChoices,
  stageChoices,
  onStar,
  starDisabled,
}: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const posterDetails = useRef<HTMLDetailsElement>(null);
  const descriptionDetails = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    if (!Object.keys(errors).length) return;
    if (errors.poster && posterDetails.current)
      posterDetails.current.open = true;
    if (errors.ph && descriptionDetails.current)
      descriptionDetails.current.open = true;
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
            <ChoiceField
              label="Type / format"
              value={p.kind}
              choices={[...STORY_FORMATS, ...formatChoices]}
              onChange={(kind) => onChange({ kind })}
              error={errors.kind}
            />
            {field("synopsis", "Synopsis", true)}
            <ChoiceField
              label="Director"
              value={p.director}
              choices={[...directorChoices, "Aproop team"]}
              onChange={(director) => onChange({ director })}
              error={errors.director}
              customLabel="Add a director…"
            />
            <ChoiceField
              label="Production stage"
              value={p.stage}
              choices={[...PRODUCTION_STAGES, ...stageChoices]}
              onChange={(stage) => onChange({ stage })}
              error={errors.stage}
            />
            <ClosingField
              value={p.closes}
              onChange={(closes) => onChange({ closes })}
              error={errors.closes}
            />
          </div>
        )}
        {step === 1 && (
          <div className="story-poster-grid">
            <div className="story-poster-preview">
              {imagePath.safeParse(p.poster).success ? (
                <Image
                  unoptimized
                  width={800}
                  height={500}
                  src={p.poster}
                  alt={p.ph || "Story poster preview"}
                />
              ) : (
                <div className="story-no-poster">
                  Upload your story’s poster
                </div>
              )}
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
                <small>JPG, PNG or WebP · up to 4 MB</small>
              </label>
              <details className="story-optional" ref={posterDetails}>
                <summary>Use an image URL</summary>
                {field("poster", "Poster URL")}
              </details>
              {errors.poster && (
                <span className="story-field-error">{errors.poster}</span>
              )}
              <details className="story-optional" ref={descriptionDetails}>
                <summary>Edit image description</summary>
                <p className="admin-help">
                  Starts with the story title. Describe the image here if more
                  detail would help.
                </p>
                {field("ph", "Image description")}
              </details>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="story-funding-grid">
            <div>
              {field("need", "Funding goal (₹)", false, "number", 1)}
              <div className="payment-funding-options">
                <label>
                  Online contributions
                  <select
                    value={p.fundingState || "setup"}
                    onChange={(e) =>
                      onChange({
                        fundingState: e.target
                          .value as AdminProject["fundingState"],
                      })
                    }
                  >
                    {(!p.fundingState || p.fundingState === "setup") && (
                      <option value="setup">Not enabled</option>
                    )}
                    <option value="open">Open for contributions</option>
                    <option value="paused">Paused</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                {p.fundingState && p.fundingState !== "setup" && (
                  <>
                    <label>
                      Minimum contribution (₹)
                      <input
                        type="number"
                        min={1}
                        value={p.minContribution ?? 100}
                        onChange={(e) =>
                          onChange({ minContribution: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Maximum contribution (₹)
                      <input
                        type="number"
                        min={1}
                        value={p.maxContribution ?? 200000}
                        onChange={(e) =>
                          onChange({ maxContribution: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Contribution and refund terms
                      <textarea
                        value={p.fundingTerms || ""}
                        maxLength={6000}
                        onChange={(e) =>
                          onChange({ fundingTerms: e.target.value })
                        }
                        placeholder="Explain the credits/rewards, cancellation and missed-goal policy, and how contributors can contact you."
                      />
                    </label>
                    <p className="admin-help">
                      The closing date is interpreted in India time. Fully
                      funded projects stop accepting payments automatically.
                      Refunds do not automatically reopen them.
                    </p>
                  </>
                )}
              </div>
              <label className="contribution-preset">
                Contribution preset
                <select
                  aria-label="Contribution preset"
                  value={
                    CONTRIBUTION_PRESETS.find(
                      (preset) =>
                        JSON.stringify(preset.amounts) ===
                        JSON.stringify(p.options),
                    )?.name || "custom"
                  }
                  onChange={(e) => {
                    const preset = CONTRIBUTION_PRESETS.find(
                      (preset) => preset.name === e.target.value,
                    );
                    if (preset) onChange({ options: [...preset.amounts] });
                  }}
                >
                  {CONTRIBUTION_PRESETS.map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name}: {preset.amounts.map(fmtINR).join(" / ")}
                    </option>
                  ))}
                  <option value="custom">Custom amounts</option>
                </select>
              </label>
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
              {!p.fundingState || p.fundingState === "setup" ? (
                <>
                  <p>
                    Confirm these existing figures before enabling real
                    payments.
                  </p>
                  {field("raised", "Raised so far (₹)", false, "number")}
                  {field("backers", "Producer count", false, "number")}
                </>
              ) : (
                <p>
                  Online payment totals are calculated from confirmed payments
                  and refunds. Opening balances cannot be edited after
                  fundraising starts.
                </p>
              )}
              <a href="/admin/contributions">
                View contributions & verified totals ↗
              </a>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="story-review-grid">
            <div className="story-review-card">
              {imagePath.safeParse(p.poster).success ? (
                <Image
                  unoptimized
                  width={600}
                  height={375}
                  src={p.poster}
                  alt={p.ph}
                />
              ) : (
                <div className="story-no-poster">Poster not added yet</div>
              )}
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
                    <dd>{formatClosingDate(p.closes)}</dd>
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
              <StarButton
                title={p.title}
                starred={!!p.homepageSlot}
                disabled={starDisabled || busy}
                reason={
                  starDisabled
                    ? "Save and publish this story before starring it."
                    : undefined
                }
                showLabel
                onClick={onStar}
              />
              <p className="admin-help">
                {starDisabled
                  ? "Save and publish first, then star this story for the homepage."
                  : "Stars update the homepage immediately. Maximum two stories."}
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
          {!p.published && step < 3 && (
            <button disabled={busy || !dirty} onClick={onSave}>
              Save draft
            </button>
          )}
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
            {p.published ? "Save story changes ↗" : "Save draft"}
          </button>
        )}
      </footer>
    </section>
  );
}
