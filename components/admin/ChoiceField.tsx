"use client";
import { useId, useState } from "react";
import {
  closingMode,
  monthLabel,
  monthValue,
} from "@/lib/admin/editor-options";

export default function ChoiceField({
  label,
  value,
  choices,
  onChange,
  error,
  customLabel = "Add a custom option…",
}: {
  label: string;
  value: string;
  choices: string[];
  onChange: (value: string) => void;
  error?: string;
  customLabel?: string;
}) {
  const id = useId();
  const [custom, setCustom] = useState(false);
  const options = [
    ...new Set([...choices.filter(Boolean), ...(value ? [value] : [])]),
  ];
  return (
    <div className="story-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={custom ? "__custom" : value}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          const isCustom = e.target.value === "__custom";
          setCustom(isCustom);
          onChange(isCustom ? "" : e.target.value);
        }}
      >
        <option value="">Choose {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__custom">{customLabel}</option>
      </select>
      {custom && (
        <input
          className="choice-custom"
          aria-label={`Custom ${label.toLowerCase()}`}
          value={value}
          maxLength={200}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      )}
      {error && (
        <span id={`${id}-error`} className="story-field-error">
          {error}
        </span>
      )}
    </div>
  );
}
export function ClosingField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [mode, setMode] = useState(closingMode(value));
  return (
    <div className="story-field">
      <label htmlFor="closing-mode">Closing schedule</label>
      <select
        id="closing-mode"
        aria-label="Closing date type"
        value={mode}
        onChange={(e) => {
          setMode(e.target.value);
          onChange(e.target.value === "tba" ? "To be announced" : "");
        }}
      >
        <option value="tba">To be announced</option>
        <option value="date">Choose a date</option>
        <option value="month">Choose a month</option>
        <option value="custom">Custom closing note</option>
      </select>
      {mode === "date" && (
        <input
          className="choice-custom"
          type="date"
          aria-label="Closing date"
          aria-invalid={!!error}
          value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {mode === "month" && (
        <input
          className="choice-custom"
          type="month"
          aria-label="Closing month"
          aria-invalid={!!error}
          value={monthValue(value)}
          onChange={(e) => onChange(monthLabel(e.target.value))}
        />
      )}
      {mode === "custom" && (
        <input
          className="choice-custom"
          aria-label="Custom closing note"
          aria-invalid={!!error}
          maxLength={100}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <span className="story-field-error">{error}</span>}
    </div>
  );
}
