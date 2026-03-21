"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

type ActivityMedia = {
  id: number;
  type: "image" | "youtube";
  url: string;
  thumbnail_url?: string | null;
  sort_order: number;
};

type Activity = {
  id: number;
  name: string | null;
  description: string | null;
  created_at: string;
  sort_order: number;
  media: ActivityMedia[];
};

export default function ActivitiesAdminPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");

  const [mediaActivityId, setMediaActivityId] = useState<number | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "youtube">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([""]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [items]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activities", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load activities");
      const data = (await res.json()) as Activity[];
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  const create = async () => {
    setError(null);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to create activity");
      return;
    }
    setName("");
    setDescription("");
    await fetchItems();
  };

  const startEdit = (a: Activity) => {
    flushSync(() => {
      setEditName(a.name ?? "");
      setEditDescription(a.description ?? "");
      setEditingId(a.id);
    });
  };

  const cancelEdit = () => {
    setEditName("");
    setEditDescription("");
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    setError(null);

    const res = await fetch(`/api/activities/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription || null }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to update activity");
      return;
    }

    cancelEdit();
    await fetchItems();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this activity?")) return;
    setError(null);
    const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to delete activity");
      return;
    }
    await fetchItems();
  };

  const moveActivity = async (activityId: number, direction: "up" | "down") => {
    setError(null);
    const res = await fetch(`/api/activities/${activityId}/sort`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to reorder activity");
      return;
    }
    await fetchItems();
  };

  const addMedia = async () => {
    if (!mediaActivityId) {
      setError("Select an activity to add media");
      return;
    }
    setError(null);

    try {
      setMediaUploading(true);

      if (mediaType === "image") {
        if (mediaFiles.length === 0) {
          setError("Please choose at least one image file");
          return;
        }

        // Upload each image and collect URLs
        const uploadedUrls: string[] = [];
        for (const file of mediaFiles) {
          const fd = new FormData();
          fd.append("file", file);
          const up = await fetch("/api/upload", { method: "POST", body: fd });
          if (!up.ok) {
            const data = (await up.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error || "Failed to upload image");
            return;
          }
          const data = (await up.json()) as { url: string };
          uploadedUrls.push(data.url);
        }

        // Save all media entries
        for (const url of uploadedUrls) {
          const res = await fetch("/api/activities/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activityId: mediaActivityId, type: "image", url }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error || "Failed to add media");
            return;
          }
        }
      } else {
        // YouTube URLs
        const validUrls = youtubeUrls.map(u => u.trim()).filter(u => u);
        if (validUrls.length === 0) {
          setError("Please enter at least one YouTube URL");
          return;
        }

        for (const url of validUrls) {
          const res = await fetch("/api/activities/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activityId: mediaActivityId, type: "youtube", url }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error || "Failed to add media");
            return;
          }
        }
      }

      setMediaFiles([]);
      setYoutubeUrls([""]);
      await fetchItems();
    } finally {
      setMediaUploading(false);
    }
  };

  const deleteMedia = async (mediaId: number) => {
    if (!confirm("Delete this media?")) return;
    setError(null);
    const res = await fetch(`/api/activities/media/${mediaId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to delete media");
      return;
    }
    await fetchItems();
  };

  const moveMedia = async (mediaId: number, direction: "up" | "down") => {
    setError(null);
    const res = await fetch(`/api/activities/media/${mediaId}/sort`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to reorder media");
      return;
    }
    await fetchItems();
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-gray-900">Admin Panel</div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <a className="text-xs sm:text-sm text-blue-700 hover:underline" href="/activities">Activities</a>
            <a className="text-xs sm:text-sm text-blue-700 hover:underline" href="/results">Results</a>
            <a className="text-xs sm:text-sm text-blue-700 hover:underline" href="/gallery">Gallery</a>
            <a className="text-xs sm:text-sm text-blue-700 hover:underline" href="/quick-needs">Quick Needs</a>
            <button onClick={logout} className="text-xs sm:text-sm rounded-md border px-2 sm:px-3 py-1 hover:bg-gray-50">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Activities</h1>
        <p className="text-sm text-gray-600 mt-1">Create, edit, and manage activity media.</p>

        {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-gray-900">Add Activity</h2>
            <div className="mt-4 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-lg border px-3 py-2" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-lg border px-3 py-2 min-h-24" />
              <button onClick={create} className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700">Create</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-gray-900">Add Media</h2>
            <div className="mt-4 space-y-3">
              <select
                value={mediaActivityId ?? ""}
                onChange={(e) => setMediaActivityId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select activity</option>
                {sorted.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} - {a.name}
                  </option>
                ))}
              </select>
              <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)} className="w-full rounded-lg border px-3 py-2">
                <option value="image">Image</option>
                <option value="youtube">YouTube</option>
              </select>
              {mediaType === "image" ? (
                <div className="space-y-2">
                  <input
                    key="media-image"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  />
                  {mediaFiles.length > 0 && (
                    <div className="text-sm text-gray-600">{mediaFiles.length} file(s) selected</div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {youtubeUrls.map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={url}
                        onChange={(e) => {
                          const updated = [...youtubeUrls];
                          updated[idx] = e.target.value;
                          setYoutubeUrls(updated);
                        }}
                        placeholder="YouTube URL"
                        className="flex-1 rounded-lg border px-3 py-2"
                      />
                      {youtubeUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setYoutubeUrls(youtubeUrls.filter((_, i) => i !== idx));
                          }}
                          className="text-red-600 hover:text-red-700 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setYoutubeUrls([...youtubeUrls, ""])}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add another YouTube URL
                  </button>
                </div>
              )}
              <button
                onClick={addMedia}
                disabled={mediaUploading}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {mediaUploading ? "Uploading..." : "Add Media"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Activities</h2>
            <button onClick={fetchItems} className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50">Refresh</button>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Loading...</div>
          ) : (
            <div className="mt-4 space-y-4">
              {sorted.map((a, idx, arr) => (
                <div key={a.id} className="bg-white rounded-2xl shadow p-5">
                  {editingId === a.id ? (
                    <div className="space-y-3" key={`edit-${a.id}`}>
                      <input key={`edit-name-${a.id}`} value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
                      <textarea key={`edit-desc-${a.id}`} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full rounded-lg border px-3 py-2 min-h-24" />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700">Save</button>
                        <button onClick={cancelEdit} className="rounded-lg border px-4 py-2 hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-gray-500">#{a.id}</div>
                          <div className="text-lg font-semibold text-gray-900">{a.name}</div>
                          {a.description && <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{a.description}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => moveActivity(a.id, "up")}
                            disabled={idx === 0}
                            className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveActivity(a.id, "down")}
                            disabled={idx === arr.length - 1}
                            className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button onClick={() => startEdit(a)} className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50">Edit</button>
                          <button onClick={() => remove(a.id)} className="text-sm rounded-md border border-red-200 text-red-700 px-3 py-1.5 hover:bg-red-50">Delete</button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm font-semibold text-gray-900">Media</div>
                        {a.media.length === 0 ? (
                          <div className="text-sm text-gray-600 mt-1">No media</div>
                        ) : (
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[...a.media]
                              .sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0))
                              .map((m, idx, arr) => (
                                <div key={m.id} className="rounded-xl border p-3 flex items-start justify-between gap-3">
                                  <div className="text-sm">
                                    <div className="font-semibold text-gray-900">{m.type}</div>
                                    <a href={m.url} className="text-blue-700 break-all" target="_blank" rel="noreferrer">
                                      {m.url}
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => moveMedia(m.id, "up")}
                                      disabled={idx === 0}
                                      className="rounded-md border px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                                      title="Move up"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => moveMedia(m.id, "down")}
                                      disabled={idx === arr.length - 1}
                                      className="rounded-md border px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                                      title="Move down"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteMedia(m.id)}
                                      className="rounded-md border border-red-200 text-red-700 px-2 py-1 hover:bg-red-50"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              {sorted.length === 0 && <div className="text-sm text-gray-600">No activities yet.</div>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
