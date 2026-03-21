"use client";

import { useEffect, useState } from "react";
import { Trash2, ChevronUp, ChevronDown, Image as ImageIcon, Video } from "lucide-react";
import AdminHeader from "../components/AdminHeader";

type GalleryItem = {
  id: number;
  type: "image" | "video";
  url: string;
  thumbnail?: string | null;
  sort_order: number;
};

export default function GalleryAdminPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadType, setUploadType] = useState<"image" | "video">("image");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([""]);
  const [uploading, setUploading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gallery", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load gallery");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  const uploadItems = async () => {
    setError(null);

    try {
      setUploading(true);

      if (uploadType === "image") {
        if (imageFiles.length === 0) {
          setError("Please select at least one image");
          return;
        }

        for (const file of imageFiles) {
          const fd = new FormData();
          fd.append("file", file);
          const up = await fetch("/api/upload", { method: "POST", body: fd });
          if (!up.ok) {
            const data = (await up.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error || "Failed to upload image");
            return;
          }
          const data = (await up.json()) as { url: string };

          const res = await fetch("/api/gallery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "image", url: data.url }),
          });
          if (!res.ok) {
            setError("Failed to add gallery item");
            return;
          }
        }

        setImageFiles([]);
      } else {
        const validUrls = videoUrls.map((u) => u.trim()).filter((u) => u);
        if (validUrls.length === 0) {
          setError("Please enter at least one YouTube URL");
          return;
        }

        for (const url of validUrls) {
          const res = await fetch("/api/gallery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "video", url }),
          });
          if (!res.ok) {
            setError("Failed to add gallery item");
            return;
          }
        }

        setVideoUrls([""]);
      }

      await fetchItems();
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    setError(null);
    const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete item");
      return;
    }
    await fetchItems();
  };

  const moveItem = async (id: number, direction: "up" | "down") => {
    setError(null);
    const res = await fetch(`/api/gallery/${id}/sort`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      setError("Failed to reorder item");
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
      <AdminHeader onLogout={logout} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gallery</h1>
        <p className="text-sm text-gray-600 mt-1">Upload images and videos to the gallery.</p>

        {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        {/* Upload Section */}
        <section className="mt-6 bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-gray-900">Add to Gallery</h2>
          <div className="mt-4 space-y-3">
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as "image" | "video")}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="image">Images</option>
              <option value="video">YouTube Videos</option>
            </select>

            {uploadType === "image" ? (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                  className="w-full rounded-lg border px-3 py-2 bg-white"
                />
                {imageFiles.length > 0 && (
                  <div className="text-sm text-gray-600">{imageFiles.length} file(s) selected</div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {videoUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={url}
                      onChange={(e) => {
                        const updated = [...videoUrls];
                        updated[idx] = e.target.value;
                        setVideoUrls(updated);
                      }}
                      placeholder="YouTube URL"
                      className="flex-1 rounded-lg border px-3 py-2"
                    />
                    {videoUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setVideoUrls(videoUrls.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-700 px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setVideoUrls([...videoUrls, ""])}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add another YouTube URL
                </button>
              </div>
            )}

            <button
              onClick={uploadItems}
              disabled={uploading}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </section>

        {/* Gallery Items */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Items</h2>
            <button onClick={fetchItems} className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50">Refresh</button>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Loading...</div>
          ) : items.length === 0 ? (
            <div className="mt-4 text-sm text-gray-600">No items in gallery yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item, idx, arr) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow overflow-hidden"
                >
                  <div className="relative aspect-square">
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt="Gallery"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <img
                          src={item.thumbnail || `https://img.youtube.com/vi/${extractYouTubeId(item.url)}/hqdefault.jpg`}
                          alt="Video"
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => moveItem(item.id, "up")}
                        disabled={idx === 0}
                        className="bg-white/90 rounded p-1 hover:bg-white disabled:opacity-50"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(item.id, "down")}
                        disabled={idx === arr.length - 1}
                        className="bg-white/90 rounded p-1 hover:bg-white disabled:opacity-50"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="bg-red-500/90 rounded p-1 hover:bg-red-500 text-white"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2 text-xs text-gray-500 truncate">
                    {item.type === "image" ? (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Image
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
