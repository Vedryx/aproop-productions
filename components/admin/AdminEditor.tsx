"use client";
import { adminRequest } from "@/lib/admin/request";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AdminFilm, AdminProject, Content } from "@/lib/admin/schema";
import { patchFilm, patchProject, indexSavedItems } from "@/lib/admin/editor-state";
import StarButton from "./StarButton";
import StoryEditor, { storyStepFor } from "./StoryEditor";
import { contentSchema, youtubeId } from "@/lib/admin/schema";

type Selection =
  { kind: "film"; id: string } | { kind: "project"; id: string } | null;
/** Visible labels for film fields, used when a save error names the field. */
const filmFieldLabels: Record<string, string> = {
  title: "Film title",
  vid: "YouTube link or video ID",
  client: "Client / credit",
  award: "Award winning",
  published: "Published on website",
};
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  min = 0,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  min?: number;
}) {
  return (
    <label>
      {label}
      {multiline ? (
        <textarea
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export default function AdminEditor({
  initial,
  email,
}: {
  initial: Content;
  email: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [savedContent, setSaved] = useState(initial);
  const [tab, setTab] = useState<"work" | "stories">("work");
  const [selection, setSelection] = useState<Selection>(null);
  const [storyStep, setStoryStep] = useState(0);
  const [storyErrors, setStoryErrors] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const savedWork = useMemo(() => JSON.stringify(savedContent.shelves), [savedContent.shelves]);
  const savedStories = useMemo(() => JSON.stringify(savedContent.projects), [savedContent.projects]);
  const currentWork = useMemo(() => JSON.stringify(content.shelves), [content.shelves]);
  const currentStories = useMemo(() => JSON.stringify(content.projects), [content.projects]);
  const workDirty = currentWork !== savedWork;
  const storiesDirty = currentStories !== savedStories;
  const dirty = workDirty || storiesDirty;
  const sectionDirty = tab === "work" ? workDirty : storiesDirty;
  const savedFilms = useMemo(() => savedContent.shelves.flatMap((s) => s.films), [savedContent.shelves]);
  const savedItems = useMemo(() => indexSavedItems(savedContent), [savedContent]);
  function publicationBadge(item: AdminFilm | AdminProject) {
    const entry = savedItems.get(item.id);
    const persisted = entry?.item;
    const changed = JSON.stringify(item) !== entry?.signature;
    const status =
      item.published !== !!persisted?.published
        ? item.published
          ? "Ready to publish"
          : "Unpublish pending"
        : persisted?.published
          ? "Published"
          : "Draft";
    return (
      <span className={`admin-badge ${persisted?.published ? "live" : ""}`}>
        {status}
        {changed ? " · Unsaved" : ""}
      </span>
    );
  }
  const matchesStatus = (item: { published: boolean; homepageSlot?: number }) =>
    statusFilter === "all" ||
    (statusFilter === "published" && item.published) ||
    (statusFilter === "draft" && !item.published) ||
    (statusFilter === "starred" && !!item.homepageSlot);
  const visibleProjects = content.projects.filter(
    (p) =>
      `${p.title} ${p.kind} ${p.director}`
        .toLowerCase()
        .includes(query.toLowerCase()) && matchesStatus(p),
  );
  async function toggleStar(id: string) {
    const target = content.projects.find((p) => p.id === id);
    if (!target || busy) return;
    const featured = !target.homepageSlot;
    if (
      featured &&
      content.projects.filter((p) => p.homepageSlot).length >= 2
    ) {
      setError("Only two stories can be starred. Unstar another story first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await adminRequest<Content>("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, featured, revision: content.revision }),
      });
      const persisted: Content = data;
      const slot = persisted.projects.find((p) => p.id === id)!.homepageSlot;
      // A star saves just the homepage flag, preserving any unfinished form edits.
      setContent((previous) => ({
        ...previous,
        revision: persisted.revision,
        projects: previous.projects.map((p) =>
          p.id === id ? { ...p, homepageSlot: slot } : p,
        ),
      }));
      setSaved(persisted);
      setNotice(
        featured
          ? `“${target.title}” is now on the homepage.`
          : `“${target.title}” was removed from the homepage.`,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to update the star.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const update = (fn: (draft: Content) => void) => {
    setContent((previous) => {
      const draft = structuredClone(previous);
      fn(draft);
      return draft;
    });
    setNotice("");
    setError("");
    setStoryErrors({});
  };
  const films = useMemo(() => content.shelves.flatMap((s, si) =>
    s.films.map((f) => ({ ...f, si, category: s.key })),
  ), [content.shelves]);
  const film =
    selection?.kind === "film"
      ? films.find((f) => f.id === selection.id)
      : undefined;
  const project =
    selection?.kind === "project"
      ? content.projects.find((p) => p.id === selection.id)
      : undefined;
  const clearFeedback = () => {
    setNotice("");
    setError("");
    setStoryErrors({});
  };
  const editFilm = (patch: Partial<AdminFilm>) => {
    if (!film) return;
    setContent((previous) => patchFilm(previous, film.id, patch));
    clearFeedback();
  };
  const editProject = (patch: Partial<AdminProject>) => {
    if (!project) return;
    setContent((previous) => patchProject(previous, project.id, patch));
    clearFeedback();
  };
  const addFilm = () => {
    const id = crypto.randomUUID();
    update((d) => {
      if (!d.shelves.length)
        d.shelves.push({
          key: "Films",
          num: "01",
          short: "Film",
          projectLine: "",
          title: "Films",
          line: "",
          meta: "",
          slot: "films",
          ph: "Film",
          list: "",
          films: [],
        });
      d.shelves[0].films.unshift({
        id,
        title: "Untitled film",
        vid: "",
        client: "",
        award: false,
        published: false,
      });
    });
    setSelection({ kind: "film", id });
  };
  const openProject = (id: string) => {
    setSelection({ kind: "project", id });
    setStoryStep(0);
    setStoryErrors({});
    window.scrollTo({ top: 0 });
  };
  const addProject = () => {
    const id = crypto.randomUUID();
    update((d) => {
      d.projects.unshift({
        id,
        title: "Untitled story",
        kind: "Short film",
        ph: "",
        poster: "",
        synopsis: "",
        director: "",
        stage: "Development",
        closes: "To be announced",
        need: 100000,
        raised: 0,
        backers: 0,
        options: [1000, 5000, 10000],
        published: false,
        homepageSlot: 0,
      });
    });
    openProject(id);
  };
  const remove = () => {
    const name = film?.title || project?.title;
    if (
      !window.confirm(
        `Remove “${name}”? This takes effect on the website when you save changes.`,
      )
    )
      return;
    update((d) => {
      if (film)
        d.shelves.forEach((s) => {
          s.films = s.films.filter((f) => f.id !== film.id);
        });
      if (project) d.projects = d.projects.filter((p) => p.id !== project.id);
    });
    setSelection(null);
  };
  const move = (direction: number) =>
    update((d) => {
      const list = film ? d.shelves[film.si].films : d.projects;
      const index = list.findIndex((item) => item.id === selection?.id);
      const target = index + direction;
      if (index >= 0 && target >= 0 && target < list.length)
        [list[index], list[target]] = [list[target], list[index]];
    });
  async function save() {
    // Keep unfinished edits in the other section out of this save, while the
    // shared revision still protects against another tab overwriting content.
    const candidate = {
      ...content,
      shelves: tab === "work" ? content.shelves : savedContent.shelves,
      projects: tab === "stories" ? content.projects : savedContent.projects,
    };
    setNotice("");
    const parsed = contentSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue.path[0] === "projects" && typeof issue.path[1] === "number") {
        const invalid = content.projects[issue.path[1]];
        setSelection({ kind: "project", id: invalid.id });
        setStoryStep(storyStepFor(String(issue.path[2])));
        const fields: Record<string, string> = {};
        for (const item of parsed.error.issues)
          if (item.path[0] === "projects" && item.path[1] === issue.path[1])
            fields[String(item.path[2])] = item.message;
        setStoryErrors(fields);
        setError(
          `Check the highlighted fields in “${invalid.title}”. Your changes have not been saved.`,
        );
      } else {
        const invalidFilm =
          issue.path[0] === "shelves" &&
          typeof issue.path[1] === "number" &&
          issue.path[2] === "films" &&
          typeof issue.path[3] === "number"
            ? content.shelves[issue.path[1]].films[issue.path[3]]
            : undefined;
        if (invalidFilm) {
          setSelection({ kind: "film", id: invalidFilm.id });
          setQuery("");
          setStatusFilter("all");
        }
        const fieldLabel =
          invalidFilm && typeof issue.path[4] === "string"
            ? filmFieldLabels[issue.path[4]]
            : undefined;
        const where = invalidFilm
          ? `${fieldLabel ?? "A field"} in “${invalidFilm.title || "Untitled film"}”: `
          : "";
        setError(`${where}${issue.message} Your changes have not been saved.`);
      }
      window.scrollTo({ top: 0 });
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await adminRequest<Content>("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setContent((previous) => ({
        ...previous,
        revision: data.revision,
        ...(tab === "work"
          ? { shelves: data.shelves }
          : { projects: data.projects }),
      }));
      setSaved(data);
      const savedFilm = film
        ? data.shelves
            .flatMap((s: Content["shelves"][number]) => s.films)
            .find((f: AdminFilm) => f.id === film.id)
        : undefined;
      setNotice(
        savedFilm
          ? savedFilm.published
            ? `Saved. “${savedFilm.title}” is published in ${film?.category} on the homepage.`
            : `Saved. “${savedFilm.title}” is a draft and is not visible on the website.`
          : `Saved. ${tab === "work" ? "Final outputs" : "Be the producer"} updated. Published items are visible on the website; drafts stay private.`,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save. Your edits are still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file || !project) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Images must be at most 4 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await adminRequest<{ url: string }>("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      editProject({
        poster: data.url,
        ph: project.ph || `${project.title} — poster`,
      });
      setNotice("Poster uploaded. Save changes to publish it.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`admin-shell ${project ? "is-editing-story" : ""}`}>
      <aside className="admin-sidebar">
        <a className="admin-wordmark" href="/" target="_blank" rel="noreferrer">
          APROOP<span>PRODUCTION / STUDIO ADMIN</span>
        </a>
        <p className="admin-kicker">CONTENT</p>
        <nav aria-label="Admin sections">
          {(
            [
              ["work", "01", "Final outputs"],
              ["stories", "05", "Be the producer"],
            ] as const
          ).map(([key, number, label]) => (
            <button
              key={key}
              disabled={busy}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => {
                setTab(key);
                setSelection(null);
                setQuery("");
                setStatusFilter("all");
                setError("");
                setNotice("");
              }}
            >
              <span>{number}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <p>{email}</p>
          <a href="/" target="_blank" rel="noreferrer">
            View website ↗
          </a>
          <button
            disabled={busy}
            onClick={async () => {
              if (
                dirty &&
                !window.confirm("Sign out and discard unsaved changes?")
              )
                return;
              setBusy(true);
              try {
                await adminRequest("/api/admin/logout", {
                  method: "POST",
                });
                setSaved(content);
                router.replace("/admin/login");
                router.refresh();
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Sign out failed.",
                );
                setBusy(false);
              }
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className={`admin-dot ${dirty ? "pending" : ""}`} />
            {sectionDirty
              ? "Unsaved changes"
              : dirty
                ? `Unsaved changes in ${tab === "work" ? "Be the producer" : "Final outputs"}`
                : "All changes saved"}
          </div>
          <div className="admin-actions">
            <button
              disabled={busy || !dirty}
              onClick={() => {
                if (
                  window.confirm(
                    "Discard unsaved edits and reload the latest content?",
                  )
                )
                  window.location.reload();
              }}
            >
              Discard changes
            </button>
            <button
              className="admin-primary"
              disabled={busy || !sectionDirty}
              onClick={save}
            >
              {busy ? "Working…" : "Save changes ↗"}
            </button>
          </div>
        </header>
        <div className={`admin-content ${project ? "admin-story-active" : ""}`}>
          <p className="admin-kicker">YOUR STUDIO, ON SCREEN</p>
          <h1>
            {tab === "work" ? "Final outputs" : "Be the producer"}
            <span>.</span>
          </h1>
          <p className="admin-description">
            {tab === "work"
              ? "Keep your portfolio current. Add films, organise categories and choose what goes live."
              : "Manage your stories. Star up to two published stories to put them on the homepage."}
          </p>
          {error && (
            <div role="alert" className="admin-error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="admin-success">
              {notice}
            </div>
          )}
          <fieldset disabled={busy} className="admin-fieldset">
            {project ? (
              <StoryEditor
                key={project.id}
                project={project}
                step={storyStep}
                errors={storyErrors}
                busy={busy}
                dirty={storiesDirty}
                onChange={editProject}
                onStep={setStoryStep}
                onErrors={setStoryErrors}
                onUpload={upload}
                onSave={save}
                onClose={() => setSelection(null)}
                onRemove={remove}
                onMove={move}
                directorChoices={content.projects.map((p) => p.director)}
                formatChoices={content.projects.map((p) => p.kind)}
                stageChoices={content.projects.map((p) => p.stage)}
                onStar={() => void toggleStar(project.id)}
                starDisabled={
                  !project.published ||
                  !savedContent.projects.some(
                    (p) => p.id === project.id && p.published,
                  )
                }
              />
            ) : (
              <>
                <div className="admin-toolbar">
                  <label className="admin-search">
                    <span className="sr-only">Search content</span>
                    <input
                      placeholder={
                        tab === "work"
                          ? "Search films or categories…"
                          : "Search stories…"
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <label className="admin-filter">
                    <span className="sr-only">Filter content</span>
                    <select
                      aria-label="Filter content"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">
                        All {tab === "work" ? "films" : "stories"}
                      </option>
                      <option value="published">Published</option>
                      <option value="draft">Drafts</option>
                      {tab === "stories" && (
                        <option value="starred">Starred</option>
                      )}
                    </select>
                  </label>
                  <span className="admin-count">
                    {tab === "work"
                      ? `${films.length} films`
                      : `${content.projects.length} stories`}
                  </span>
                  <button
                    className="admin-primary"
                    onClick={tab === "work" ? addFilm : addProject}
                  >
                    + Add {tab === "work" ? "film" : "story"}
                  </button>
                </div>
                {tab === "stories" && (
                  <div className="admin-star-summary">
                    <span>
                      <strong>
                        {content.projects.filter((p) => p.homepageSlot).length}
                        /2
                      </strong>{" "}
                      on homepage
                    </span>
                    <p>
                      Stars save immediately. Publish a draft before starring
                      it.
                    </p>
                  </div>
                )}
                <div
                  className={`admin-edit-grid ${selection ? "has-selection" : ""}`}
                >
                  <div className="admin-list">
                    {tab === "work"
                      ? content.shelves.map((s, si) => (
                          <section className="admin-category" key={si}>
                            <div className="admin-category-heading">
                              <strong>
                                {s.num} / {s.key}
                              </strong>
                              <span>{s.films.length} films</span>
                              <button
                                aria-label={`Rename ${s.key}`}
                                onClick={() => {
                                  const name = window.prompt(
                                    "Category name",
                                    s.key,
                                  );
                                  if (name?.trim())
                                    update((d) => {
                                      d.shelves[si].key = name.trim();
                                    });
                                }}
                              >
                                Rename
                              </button>
                              <button
                                disabled={s.films.length > 0}
                                title={
                                  s.films.length
                                    ? "Move or remove films first"
                                    : "Remove empty category"
                                }
                                aria-label={`Remove ${s.key} category`}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove the empty ${s.key} category?`,
                                    )
                                  )
                                    update((d) => {
                                      d.shelves.splice(si, 1);
                                      d.shelves.forEach((s, i) => {
                                        s.num = String(i + 1).padStart(2, "0");
                                      });
                                    });
                                }}
                              >
                                ×
                              </button>
                            </div>
                            {s.films
                              .filter(
                                (f) =>
                                  `${f.title} ${s.key}`
                                    .toLowerCase()
                                    .includes(query.toLowerCase()) &&
                                  matchesStatus(f),
                              )
                              .map((f) => (
                                <button
                                  className={`admin-row ${selection?.id === f.id ? "selected" : ""}`}
                                  key={f.id}
                                  onClick={() =>
                                    setSelection({ kind: "film", id: f.id })
                                  }
                                >
                                  <div className="admin-thumb">
                                    {/^[\w-]{11}$/.test(youtubeId(f.vid)) ? (
                                      <Image
                                        unoptimized
                                        width={800}
                                        height={500}
                                        src={`https://i.ytimg.com/vi/${youtubeId(f.vid)}/mqdefault.jpg`}
                                        alt=""
                                      />
                                    ) : (
                                      <span>▶</span>
                                    )}
                                  </div>
                                  <div className="admin-row-copy">
                                    <strong>{f.title}</strong>
                                    <small>
                                      {f.client || "Add client / credit"}
                                    </small>
                                  </div>
                                  {publicationBadge(f)}
                                  <span>↗</span>
                                </button>
                              ))}
                            {!s.films.length && (
                              <p className="admin-help admin-empty">
                                No films in this category.
                              </p>
                            )}
                          </section>
                        ))
                      : visibleProjects.map((p) => (
                          <article className="admin-story-row" key={p.id}>
                            <button
                              className="admin-row"
                              onClick={() => openProject(p.id)}
                              aria-label={`Edit ${p.title}`}
                            >
                              <div className="admin-thumb">
                                {p.poster ? (
                                  <Image
                                    unoptimized
                                    width={800}
                                    height={500}
                                    src={p.poster}
                                    alt=""
                                  />
                                ) : (
                                  <span className="admin-poster-placeholder">
                                    No poster
                                  </span>
                                )}
                              </div>
                              <div className="admin-row-copy">
                                <strong>{p.title}</strong>
                                <small>
                                  {p.kind || "Choose a format"}
                                  {p.homepageSlot ? " · On homepage" : ""}
                                </small>
                              </div>
                              {publicationBadge(p)}
                              <span>↗</span>
                            </button>
                            <StarButton
                              title={p.title}
                              starred={!!p.homepageSlot}
                              disabled={
                                busy ||
                                !p.published ||
                                !savedContent.projects.some(
                                  (saved) =>
                                    saved.id === p.id && saved.published,
                                )
                              }
                              reason={
                                !p.published ||
                                !savedContent.projects.some(
                                  (saved) =>
                                    saved.id === p.id && saved.published,
                                )
                                  ? "Save and publish this story before starring it."
                                  : undefined
                              }
                              onClick={() => void toggleStar(p.id)}
                            />
                          </article>
                        ))}
                    {tab === "stories" &&
                      !visibleProjects.length &&
                      content.projects.length > 0 && (
                        <div className="admin-empty">
                          No stories match this filter.{" "}
                          <button
                            onClick={() => {
                              setQuery("");
                              setStatusFilter("all");
                            }}
                          >
                            Clear filters
                          </button>
                        </div>
                      )}
                    {tab === "work" && (
                      <button
                        className="admin-add-category"
                        onClick={() => {
                          const name = window.prompt("New category name");
                          if (!name?.trim()) return;
                          update((d) => {
                            d.shelves.push({
                              key: name.trim(),
                              num: String(d.shelves.length + 1).padStart(
                                2,
                                "0",
                              ),
                              short: name.trim(),
                              projectLine: "",
                              title: name.trim(),
                              line: "",
                              meta: "",
                              slot: crypto.randomUUID(),
                              ph: name.trim(),
                              list: "",
                              films: [],
                            });
                          });
                        }}
                      >
                        + Add category
                      </button>
                    )}
                    {tab === "stories" && !content.projects.length && (
                      <p className="admin-empty">
                        No stories yet. Add your first story to get started.
                      </p>
                    )}
                  </div>
                  {film && (
                    <section className="admin-panel admin-editor">
                      <div className="admin-editor-heading">
                        <p className="admin-kicker">
                          EDIT {film ? "FILM" : "STORY"}
                        </p>
                        <button
                          onClick={() => setSelection(null)}
                          aria-label="Close editor"
                        >
                          ×
                        </button>
                      </div>
                      {film && (
                        <>
                          <Field
                            label="Film title"
                            value={film.title}
                            onChange={(title) => editFilm({ title })}
                          />
                          <Field
                            label="YouTube link or video ID"
                            value={film.vid}
                            onChange={(vid) => editFilm({ vid })}
                          />
                          <Field
                            label="Client / credit"
                            value={film.client}
                            onChange={(client) => editFilm({ client })}
                          />
                          <label>
                            Category
                            <select
                              value={film.si}
                              onChange={(e) =>
                                update((d) => {
                                  const [item] = d.shelves[
                                    film.si
                                  ].films.splice(
                                    d.shelves[film.si].films.findIndex(
                                      (f) => f.id === film.id,
                                    ),
                                    1,
                                  );
                                  d.shelves[Number(e.target.value)].films.push(
                                    item,
                                  );
                                })
                              }
                            >
                              {content.shelves.map((s, i) => (
                                <option value={i} key={i}>
                                  {s.key}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="admin-check">
                            <input
                              type="checkbox"
                              checked={film.award}
                              onChange={(e) =>
                                editFilm({ award: e.target.checked })
                              }
                            />
                            Award winning
                          </label>
                          <label className="admin-check">
                            <input
                              type="checkbox"
                              checked={film.published}
                              onChange={(e) =>
                                editFilm({ published: e.target.checked })
                              }
                            />
                            Published on website
                          </label>
                          <p className="admin-help">
                            Publication changes take effect after saving. The
                            homepage shows four films per page; use its category
                            tabs to find more.
                          </p>
                          <button
                            className="admin-primary"
                            disabled={busy || !workDirty}
                            onClick={save}
                          >
                            {film.published
                              ? savedFilms.some(
                                  (f) => f.id === film.id && f.published,
                                )
                                ? "Save film changes ↗"
                                : "Publish film ↗"
                              : "Save film draft"}
                          </button>
                        </>
                      )}
                      <div className="admin-editor-bottom">
                        <div>
                          <button onClick={() => move(-1)}>↑ Move up</button>
                          <button onClick={() => move(1)}>↓ Move down</button>
                        </div>
                        <button className="admin-danger" onClick={remove}>
                          Remove {film ? "film" : "story"}
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              </>
            )}
          </fieldset>
          <footer className="admin-note">
            Save changes updates this section. Edits in the other section stay
            unsaved. Drafts stay private.{" "}
            <a
              href={tab === "work" ? "/#work" : "/be-the-producer"}
              target="_blank"
              rel="noreferrer"
            >
              Open website ↗
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
