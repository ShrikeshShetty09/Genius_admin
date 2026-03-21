"use client";

import { useEffect, useState } from "react";
import { Trash2, Play, Pause, Image as ImageIcon, Video, Type } from "lucide-react";
import AdminHeader from "../components/AdminHeader";

type QuickNeed = {
  id: number;
  type: "tagline" | "image" | "video";
  content: string | null;
  media_url: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export default function QuickNeedsAdminPage() {
  const [items, setItems] = useState<QuickNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formType, setFormType] = useState<"tagline" | "image" | "video">("tagline");
  const [tagline, setTagline] = useState<string>("");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quick-needs", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load quick needs");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quick needs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!startDate || !endDate) {
      setError("Start and end dates are required");
      return;
    }

    if (formType === "tagline" && !tagline.trim()) {
      setError("Tagline content is required");
      return;
    }

    if (formType === "video" && !mediaUrl.trim()) {
      setError("YouTube URL is required");
      return;
    }

    if (formType === "image" && !imageFile && !mediaUrl.trim()) {
      setError("Image is required");
      return;
    }

    try {
      setUploading(true);

      let finalMediaUrl = mediaUrl;

      if (formType === "image" && imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) {
          const data = (await up.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error || "Failed to upload image");
          return;
        }
        const data = (await up.json()) as { url: string };
        finalMediaUrl = data.url;
      }

      const res = await fetch("/api/quick-needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          content: formType === "tagline" ? tagline : null,
          media_url: formType !== "tagline" ? finalMediaUrl : null,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Failed to create quick need");
        return;
      }

      setTagline("");
      setMediaUrl("");
      setImageFile(null);
      setStartDate("");
      setEndDate("");
      await fetchItems();
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    setError(null);
    const res = await fetch(`/api/quick-needs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentActive }),
    });
    if (!res.ok) {
      setError("Failed to update status");
      return;
    }
    await fetchItems();
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this quick need?")) return;
    setError(null);
    const res = await fetch(`/api/quick-needs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete item");
      return;
    }
    await fetchItems();
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const isCurrentlyActive = (item: QuickNeed) => {
    if (!item.is_active) return false;
    const now = new Date();
    const start = new Date(item.start_date);
    const end = new Date(item.end_date + "T23:59:59");
    return now >= start && now <= end;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader onLogout={logout} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Quick Needs</h1>
        <p className="text-sm text-gray-600 mt-1">Create promotional taglines and popup content for your website.</p>

        {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        {/* Create Form */}
        <section className="mt-6 bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-gray-900">Create Quick Need</h2>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formType ?? "tagline"}
                  onChange={(e) => {
                    const newType = e.target.value as "tagline" | "image" | "video";
                    setFormType(newType);
                    setTagline("");
                    setMediaUrl("");
                    setImageFile(null);
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="tagline">Tagline (Scrolling Banner)</option>
                  <option value="image">Image (Popup)</option>
                  <option value="video">Video (Popup)</option>
                </select>
              </div>
            </div>

            {formType === "tagline" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tagline Content</label>
                <input
                  type="text"
                  value={tagline || ""}
                  onChange={(e) => setTagline(e.target.value ?? "")}
                  placeholder="Enter tagline text..."
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            ) : formType === "image" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border px-3 py-2 bg-white"
                />
                {imageFile && (
                  <p className="mt-1 text-sm text-gray-600">Selected: {imageFile.name}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                <input
                  type="text"
                  value={mediaUrl || ""}
                  onChange={(e) => setMediaUrl(e.target.value ?? "")}
                  placeholder="https://youtube.com/..."
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={startDate || ""}
                  onChange={(e) => setStartDate(e.target.value ?? "")}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  value={endDate || ""}
                  onChange={(e) => setEndDate(e.target.value ?? "")}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? "Creating..." : "Create Quick Need"}
            </button>
          </div>
        </section>

        {/* Items List */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Quick Needs</h2>
            <button onClick={fetchItems} className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50">Refresh</button>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Loading...</div>
          ) : items.length === 0 ? (
            <div className="mt-4 text-sm text-gray-600">No quick needs yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => {
                const active = isCurrentlyActive(item);
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl shadow p-4 border-l-4 ${
                      active ? "border-l-green-500" : item.is_active ? "border-l-yellow-500" : "border-l-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-4 flex-col sm:flex-row">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {item.type === "tagline" ? (
                            <Type className="w-4 h-4 text-blue-600" />
                          ) : item.type === "image" ? (
                            <ImageIcon className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Video className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium text-gray-700 capitalize">{item.type}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              active
                                ? "bg-green-100 text-green-700"
                                : item.is_active
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {active ? "Active Now" : item.is_active ? "Scheduled" : "Stopped"}
                          </span>
                        </div>
                        {item.type === "tagline" ? (
                          <p className="text-gray-900 font-medium text-sm sm:text-base">{item.content}</p>
                        ) : (
                          <a
                            href={item.media_url || "#"}
                            className="text-blue-600 hover:underline text-xs sm:text-sm block break-all whitespace-normal"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.media_url}
                          </a>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleActive(item.id, item.is_active)}
                          className={`rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ${
                            item.is_active
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                          title={item.is_active ? "Stop displaying" : "Start displaying"}
                        >
                          {item.is_active ? (
                            <span className="flex items-center gap-1">
                              <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> Stop
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3 sm:w-4 sm:h-4" /> Start
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="rounded-md border border-red-200 text-red-700 px-2 sm:px-3 py-1.5 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
