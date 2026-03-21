"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";

type ResultImage = {
  id: number;
  url: string;
  sort_order: number;
};

type Result = {
  id: number;
  images: ResultImage[];
};

export default function ResultsAdminPage() {
  const [items, setItems] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Flatten all images from all results
  const allImages = items.flatMap((r) => r.images).sort((a, b) => a.sort_order - b.sort_order);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/results", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load results");
      const data = (await res.json()) as Result[];
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  const create = async () => {
    setError(null);
    if (imageFiles.length === 0) {
      setError("Please select at least one image");
      return;
    }
    try {
      setUploading(true);

      // Create a placeholder result entry
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeholder: true }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Failed to create result");
        return;
      }
      const resultData = (await res.json()) as { id: number };
      const resultId = resultData.id;

      // Upload images and save them
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
        
        await fetch("/api/results/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultId, url: data.url }),
        });
      }

      setImageFiles([]);
      await fetchItems();
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: number) => {
    if (!confirm("Delete this image?")) return;
    setError(null);
    const res = await fetch(`/api/results/images/${imageId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to delete image");
      return;
    }
    await fetchItems();
  };

  const moveImage = async (imageId: number, direction: "up" | "down") => {
    setError(null);
    const res = await fetch(`/api/results/images/${imageId}/sort`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to reorder image");
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Results</h1>
        <p className="text-sm text-gray-600 mt-1">Manage topper images shown on the website.</p>

        {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-gray-900">Upload Images</h2>
            <div className="mt-4 space-y-3">
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
              <button
                onClick={create}
                disabled={uploading}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload Images"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-gray-900">Instructions</h2>
            <div className="text-sm text-gray-700 mt-2 space-y-2">
              <p>• Select one or more images to upload</p>
              <p>• Use ↑↓ buttons to reorder images</p>
              <p>• The order set here will be displayed on the website</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Images ({allImages.length})</h2>
            <button onClick={fetchItems} className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50">Refresh</button>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Loading...</div>
          ) : allImages.length === 0 ? (
            <div className="mt-4 text-sm text-gray-600">No images uploaded yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {allImages.map((img, index) => (
                <div key={img.id} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                  <div className="relative">
                    <img src={img.url} alt="" className="w-full h-32 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => moveImage(img.id, "up")}
                        disabled={index === 0}
                        className="bg-white/90 rounded p-1 hover:bg-white disabled:opacity-50 shadow"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveImage(img.id, "down")}
                        disabled={index === allImages.length - 1}
                        className="bg-white/90 rounded p-1 hover:bg-white disabled:opacity-50 shadow"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteImage(img.id)}
                        className="bg-red-500/90 rounded p-1 hover:bg-red-500 text-white shadow"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="px-2 py-1 text-xs text-gray-500 text-center">
                    #{index + 1}
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
