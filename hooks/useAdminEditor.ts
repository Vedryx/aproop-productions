"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import {
  contentSchema,
  type AdminFilm,
  type AdminProject,
  type Content,
} from "@/lib/admin/schema";
import { patchFilm, patchProject, indexSavedItems } from "@/lib/admin/editor-state";
import { storyStepFor } from "@/lib/admin/story-validation";

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

/** Owns the editor draft and saved snapshot for this mounted editor only. */
export function useAdminEditor(initial: Content) {
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
  const savedWork = useMemo(
    () => JSON.stringify(savedContent.shelves),
    [savedContent.shelves],
  );
  const savedStories = useMemo(
    () => JSON.stringify(savedContent.projects),
    [savedContent.projects],
  );
  const currentWork = useMemo(
    () => JSON.stringify(content.shelves),
    [content.shelves],
  );
  const currentStories = useMemo(
    () => JSON.stringify(content.projects),
    [content.projects],
  );
  const workDirty = currentWork !== savedWork;
  const storiesDirty = currentStories !== savedStories;
  const dirty = workDirty || storiesDirty;
  const sectionDirty = tab === "work" ? workDirty : storiesDirty;
  const savedFilms = useMemo(
    () => savedContent.shelves.flatMap((s) => s.films),
    [savedContent.shelves],
  );
  const savedItems = useMemo(() => indexSavedItems(savedContent), [savedContent]);
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
      const data = await adminApi.setFeatured({
        id, featured, revision: content.revision,
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
  const films = useMemo(
    () => content.shelves.flatMap((s, si) =>
      s.films.map((f) => ({ ...f, si, category: s.key })),
    ),
    [content.shelves],
  );
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
      const data = await adminApi.saveContent(parsed.data);
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
      const data = await adminApi.uploadPoster(file);
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
  function selectTab(next: "work" | "stories") {
    setTab(next);
    setSelection(null);
    setQuery("");
    setStatusFilter("all");
    setError("");
    setNotice("");
  }

  async function signOut() {
    if (dirty && !window.confirm("Sign out and discard unsaved changes?")) return;
    setBusy(true);
    try {
      await adminApi.logout();
      setSaved(content);
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign out failed.");
      setBusy(false);
    }
  }

  function discardChanges() {
    if (window.confirm("Discard unsaved edits and reload the latest content?"))
      window.location.reload();
  }
  return {
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
  };
}
