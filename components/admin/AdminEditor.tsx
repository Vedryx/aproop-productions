"use client";
import Image from "next/image";
import type { AdminFilm, AdminProject, Content } from "@/lib/admin/schema";
import { useAdminEditor } from "@/hooks/useAdminEditor";
import StarButton from "./StarButton";
import StoryEditor from "./StoryEditor";
import { youtubeId } from "@/lib/admin/schema";

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
  const {
    content, savedContent, tab, selection,
    setSelection, storyStep, setStoryStep, storyErrors,
    setStoryErrors, statusFilter, setStatusFilter, query,
    setQuery, busy, error, notice,
    dirty, workDirty, storiesDirty, sectionDirty,
    savedFilms, savedItems, matchesStatus, visibleProjects,
    toggleStar, update, films, film,
    project, editFilm, editProject, addFilm,
    openProject, addProject, remove, move,
    save, upload, selectTab, signOut,
    discardChanges,
  } = useAdminEditor(initial);
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
              onClick={() => selectTab(key)}
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
            onClick={signOut}
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
              onClick={discardChanges}
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
