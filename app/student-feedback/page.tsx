"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Image as ImageIcon, Video } from "lucide-react";
import AdminHeader from "../components/AdminHeader";

type StudentFeedbackItem = {
  id: number;
  student_name: string;
  feedback: string;
  media_type: "image" | "youtube";
  media_url: string;
  thumbnail_url: string | null;
  sort_order: number;
};

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

export default function StudentFeedbackAdminPage() {
  const [items, setItems] = useState<StudentFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "youtube">("image");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student-feedback", { cache: "no-store" });
      const data = (await res.json()) as { items?: StudentFeedbackItem[] };
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const create = async () => {
    setError(null);
    const name = studentName.trim();
    const text = feedback.trim();

    if (!name || !text) {
      setError("Student name and feedback are required");
      return;
    }

    try {
      setUploading(true);

      let mediaUrl = "";
      let thumbnailUrl: string | null = null;

      if (mediaType === "image") {
        if (!imageFile) {
          setError("Please select an image");
          return;
        }
        const fd = new FormData();
        fd.append("file", imageFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) {
          const data = (await up.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error || "Failed to upload image");
          return;
        }
        const data = (await up.json()) as { url: string };
        mediaUrl = data.url;
      } else {
        const url = youtubeUrl.trim();
        if (!url) {
          setError("Please enter a YouTube URL");
          return;
        }
        const id = extractYouTubeId(url);
        thumbnailUrl = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
        mediaUrl = url;
      }

      const res = await fetch("/api/student-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: name,
          feedback: text,
          media_type: mediaType,
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Failed to create feedback");
        return;
      }

      setStudentName("");
      setFeedback("");
      setImageFile(null);
      setYoutubeUrl("");
      await fetchItems();
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this feedback?")) return;
    setError(null);
    const res = await fetch(`/api/student-feedback/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete feedback");
      return;
    }
    await fetchItems();
  };

  const moveItem = async (id: number, direction: "up" | "down") => {
    setError(null);
    const res = await fetch(`/api/student-feedback/${id}/sort`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      setError("Failed to reorder feedback");
      return;
    }
    await fetchItems();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader onLogout={logout} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Student Feedback</h1>
        <p className="text-sm text-gray-600 mt-1">Add and manage student feedback shown on the website.</p>

        {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-gray-900">Add Feedback</h2>
            <div className="mt-4 space-y-3">
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student name"
                className="w-full rounded-lg border px-3 py-2"
              />
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Feedback"
                className="w-full rounded-lg border px-3 py-2 min-h-24"
              />

              <select
                value={mediaType}
                onChange={(e) => {
                  const v = e.target.value as "image" | "youtube";
                  setMediaType(v);
                  setImageFile(null);
                  setYoutubeUrl("");
                }}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="image">Image</option>
                <option value="youtube">YouTube Video</option>
              </select>

              {mediaType === "image" ? (
                <input
                  key="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border px-3 py-2 bg-white"
                />
              ) : (
                <input
                  key="youtube"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="YouTube URL"
                  className="w-full rounded-lg border px-3 py-2"
                />
              )}

              <button
                onClick={create}
                disabled={uploading}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading ? "Saving..." : "Add Feedback"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-gray-900">Instructions</h2>
            <div className="text-sm text-gray-700 mt-2 space-y-2">
              <p>• Add student name and feedback</p>
              <p>• Choose image or YouTube video</p>
              <p>• Use ↑↓ buttons to reorder</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Feedback ({items.length})</h2>
            <button onClick={fetchItems} className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50">Refresh</button>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Loading...</div>
          ) : items.length === 0 ? (
            <div className="mt-4 text-sm text-gray-600">No feedback added yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item, idx, arr) => (
                <div key={item.id} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                  <div className="p-4 flex gap-4 items-start">
                    <div className="w-28 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {item.media_type === "image" ? (
                        <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="relative w-full h-full bg-gray-900">
                          <img
                            src={item.thumbnail_url || (extractYouTubeId(item.media_url) ? `https://img.youtube.com/vi/${extractYouTubeId(item.media_url)}/hqdefault.jpg` : "")}
                            alt=""
                            className="w-full h-full object-cover opacity-80"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.media_type === "image" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <ImageIcon className="w-3 h-3" /> Image
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <Video className="w-3 h-3" /> YouTube
                          </span>
                        )}
                        <span className="text-sm font-semibold text-gray-900">{item.student_name}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-2 line-clamp-3">{item.feedback}</p>
                      {item.media_type === "youtube" && (
                        <a
                          href={item.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 text-xs text-blue-600 hover:underline block break-all whitespace-normal"
                        >
                          {item.media_url}
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveItem(item.id, "up")}
                        disabled={idx === 0}
                        className="bg-white rounded p-1 hover:bg-gray-50 disabled:opacity-50 border shadow-sm"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(item.id, "down")}
                        disabled={idx === arr.length - 1}
                        className="bg-white rounded p-1 hover:bg-gray-50 disabled:opacity-50 border shadow-sm"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="bg-red-500 text-white rounded p-1 hover:bg-red-600 border border-red-600 shadow-sm"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
