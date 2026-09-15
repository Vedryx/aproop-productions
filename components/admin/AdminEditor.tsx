"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminFilm, AdminProject, Content } from "@/lib/admin/schema";
import { youtubeId } from "@/lib/admin/schema";

type Selection =
  { kind: "film"; id: string } | { kind: "project"; id: string } | null;
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
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [tab, setTab] = useState<"work" | "stories" | "homepage">("work");
  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = JSON.stringify(content) !== saved;
  useEffect(() => {
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
  };
  const films = content.shelves.flatMap((s, si) =>
    s.films.map((f) => ({ ...f, si, category: s.key })),
  );
  const film =
    selection?.kind === "film"
      ? films.find((f) => f.id === selection.id)
      : undefined;
  const project =
    selection?.kind === "project"
      ? content.projects.find((p) => p.id === selection.id)
      : undefined;
  const editFilm = (patch: Partial<AdminFilm>) =>
    update((draft) => {
      const f = draft.shelves
        .flatMap((s) => s.films)
        .find((f) => f.id === film?.id);
      if (f) Object.assign(f, patch);
    });
  const editProject = (patch: Partial<AdminProject>) =>
    update((draft) => {
      const p = draft.projects.find((p) => p.id === project?.id);
      if (p) {
        Object.assign(p, patch);
        if (!p.published) p.homepageSlot = 0;
      }
    });
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
  const addProject = () => {
    const id = crypto.randomUUID();
    update((d) => {
      d.projects.unshift({
        id,
        title: "Untitled story",
        kind: "Short film",
        ph: "Story poster",
        poster: "/uploads/datan-poster.jpg",
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
    setSelection({ kind: "project", id });
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
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setContent(data);
      setSaved(JSON.stringify(data));
      setNotice("Saved. Published content is now live on the website.");
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
    if (file.size > 5 * 1024 * 1024) {
      setError("Images must be smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      editProject({ poster: data.url });
      setNotice("Poster uploaded. Save changes to publish it.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-shell">
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
              ["homepage", "✲", "Homepage stories"],
            ] as const
          ).map(([key, number, label]) => (
            <button
              key={key}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => {
                setTab(key);
                setSelection(null);
                setQuery("");
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
                const response = await fetch("/api/admin/logout", {
                  method: "POST",
                });
                if (!response.ok)
                  throw new Error("Sign out failed. Try again.");
                setSaved(JSON.stringify(content));
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
            {dirty ? "Unsaved changes" : "All changes saved"}
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
              disabled={busy || !dirty}
              onClick={save}
            >
              {busy ? "Working…" : "Save changes ↗"}
            </button>
          </div>
        </header>
        <div className="admin-content">
          <p className="admin-kicker">YOUR STUDIO, ON SCREEN</p>
          <h1>
            {tab === "work"
              ? "Final outputs"
              : tab === "stories"
                ? "Be the producer"
                : "The homepage pair"}
            <span>.</span>
          </h1>
          <p className="admin-description">
            {tab === "work"
              ? "Keep your portfolio current. Add films, organise categories and choose what goes live."
              : tab === "stories"
                ? "Give your next stories a home. Manage posters, project details and contribution options."
                : "Choose the two stories visitors see in the homepage’s Be the Producer section."}
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
            {tab === "homepage" ? (
              <>
                <div className="admin-home-grid">
                  {([1, 2] as const).map((slot) => {
                    const featured = content.projects.find(
                      (p) => p.homepageSlot === slot,
                    );
                    return (
                      <section className="admin-panel" key={slot}>
                        <p className="admin-kicker">HOMEPAGE / STORY 0{slot}</p>
                        <div className="admin-feature-preview">
                          {featured ? (
                            <Image
                              unoptimized
                              width={800}
                              height={500}
                              src={featured.poster}
                              alt={featured.ph}
                            />
                          ) : (
                            <span>Select a story</span>
                          )}
                        </div>
                        <label>
                          Featured story {slot}
                          <select
                            value={featured?.id || ""}
                            onChange={(e) =>
                              update((d) => {
                                d.projects.forEach((p) => {
                                  if (p.homepageSlot === slot)
                                    p.homepageSlot = 0;
                                });
                                const p = d.projects.find(
                                  (p) => p.id === e.target.value,
                                );
                                if (p) p.homepageSlot = slot;
                              })
                            }
                          >
                            <option value="">No story selected</option>
                            {content.projects
                              .filter((p) => p.published)
                              .map((p) => (
                                <option
                                  value={p.id}
                                  key={p.id}
                                  disabled={
                                    p.homepageSlot !== 0 &&
                                    p.homepageSlot !== slot
                                  }
                                >
                                  {p.title}
                                </option>
                              ))}
                          </select>
                        </label>
                        <p className="admin-help">
                          {slot === 1
                            ? "The larger poster at the back."
                            : "The smaller poster at the front."}{" "}
                          Only published stories can be selected.
                        </p>
                      </section>
                    );
                  })}
                </div>
                <p className="admin-help">
                  Select one story for each slot to show two posters.
                  Unpublishing or removing a story clears its slot.
                </p>
              </>
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
                              .filter((f) =>
                                `${f.title} ${s.key}`
                                  .toLowerCase()
                                  .includes(query.toLowerCase()),
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
                                  <span
                                    className={`admin-badge ${f.published ? "live" : ""}`}
                                  >
                                    {f.published ? "Published" : "Draft"}
                                  </span>
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
                      : content.projects
                          .filter((p) =>
                            p.title.toLowerCase().includes(query.toLowerCase()),
                          )
                          .map((p) => (
                            <button
                              className={`admin-row ${selection?.id === p.id ? "selected" : ""}`}
                              key={p.id}
                              onClick={() =>
                                setSelection({ kind: "project", id: p.id })
                              }
                            >
                              <div className="admin-thumb">
                                <Image
                                  unoptimized
                                  width={800}
                                  height={500}
                                  src={p.poster}
                                  alt=""
                                />
                              </div>
                              <div className="admin-row-copy">
                                <strong>{p.title}</strong>
                                <small>
                                  {p.kind}
                                  {p.homepageSlot
                                    ? ` · Homepage ${p.homepageSlot}`
                                    : ""}
                                </small>
                              </div>
                              <span
                                className={`admin-badge ${p.published ? "live" : ""}`}
                              >
                                {p.published ? "Published" : "Draft"}
                              </span>
                              <span>↗</span>
                            </button>
                          ))}
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
                  {(film || project) && (
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
                        </>
                      )}
                      {project && (
                        <>
                          <Field
                            label="Story title"
                            value={project.title}
                            onChange={(title) => editProject({ title })}
                          />
                          <Field
                            label="Type / format"
                            value={project.kind}
                            onChange={(kind) => editProject({ kind })}
                          />
                          <div className="admin-feature-preview">
                            <Image
                              unoptimized
                              width={800}
                              height={500}
                              src={project.poster}
                              alt={project.ph}
                            />
                          </div>
                          <label className="admin-upload">
                            Upload poster
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                void upload(e.target.files?.[0]);
                                e.target.value = "";
                              }}
                            />
                            <small>JPG, PNG or WebP · up to 5 MB</small>
                          </label>
                          <Field
                            label="Poster URL"
                            value={project.poster}
                            onChange={(poster) => editProject({ poster })}
                          />
                          <Field
                            label="Image description"
                            value={project.ph}
                            onChange={(ph) => editProject({ ph })}
                          />
                          <Field
                            label="Synopsis"
                            multiline
                            value={project.synopsis}
                            onChange={(synopsis) => editProject({ synopsis })}
                          />
                          <Field
                            label="Director"
                            value={project.director}
                            onChange={(director) => editProject({ director })}
                          />
                          <Field
                            label="Production stage"
                            value={project.stage}
                            onChange={(stage) => editProject({ stage })}
                          />
                          <Field
                            label="Closing date / label"
                            value={project.closes}
                            onChange={(closes) => editProject({ closes })}
                          />
                          <div className="admin-two-fields">
                            <Field
                              label="Funding goal (₹)"
                              type="number"
                              min={1}
                              value={project.need}
                              onChange={(v) => editProject({ need: Number(v) })}
                            />
                            <Field
                              label="Raised so far (₹)"
                              type="number"
                              value={project.raised}
                              onChange={(v) =>
                                editProject({ raised: Number(v) })
                              }
                            />
                          </div>
                          <Field
                            label="Producer count"
                            type="number"
                            value={project.backers}
                            onChange={(v) =>
                              editProject({ backers: Number(v) })
                            }
                          />
                          <p className="admin-help">
                            Funding totals are manually recorded for now. The
                            existing figures came from the original site; verify
                            them before launch.
                          </p>
                          <label>Contribution amounts (₹)</label>
                          {project.options.map((amount, i) => (
                            <div className="admin-tier" key={i}>
                              <input
                                aria-label={`Contribution amount ${i + 1}`}
                                type="number"
                                min={1}
                                value={amount}
                                onChange={(e) =>
                                  editProject({
                                    options: project.options.map((v, n) =>
                                      n === i ? Number(e.target.value) : v,
                                    ),
                                  })
                                }
                              />
                              <button
                                aria-label={`Remove amount ${i + 1}`}
                                disabled={project.options.length === 1}
                                onClick={() =>
                                  editProject({
                                    options: project.options.filter(
                                      (_, n) => n !== i,
                                    ),
                                  })
                                }
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            disabled={project.options.length >= 6}
                            onClick={() =>
                              editProject({
                                options: [
                                  ...project.options,
                                  Math.max(...project.options) + 1000,
                                ],
                              })
                            }
                          >
                            + Add contribution amount
                          </button>
                          <label className="admin-check">
                            <input
                              type="checkbox"
                              checked={project.published}
                              onChange={(e) =>
                                editProject({ published: e.target.checked })
                              }
                            />
                            Published on website
                          </label>
                          <p className="admin-help">
                            {project.homepageSlot
                              ? `Featured in homepage slot ${project.homepageSlot}.`
                              : "Not featured on the homepage."}{" "}
                            Choose featured stories in Homepage stories.
                          </p>
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
            Changes go live when you save. Drafts stay private.{" "}
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
