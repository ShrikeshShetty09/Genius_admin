"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Activities", href: "/activities" },
  { label: "Results", href: "/results" },
  { label: "Gallery", href: "/gallery" },
  { label: "Student Feedback", href: "/student-feedback" },
  { label: "Quick Needs", href: "/quick-needs" },
];

export default function AdminHeader({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="sm:hidden inline-flex items-center justify-center rounded-md border px-2 py-2 hover:bg-gray-50"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-bold text-gray-900">Admin Panel</div>
        </div>

        <div className="hidden sm:flex items-center gap-3 flex-wrap">
          {navItems.map((item) => (
            <a key={item.href} className="text-sm text-blue-700 hover:underline" href={item.href}>
              {item.label}
            </a>
          ))}
          <button onClick={onLogout} className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50">
            Logout
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="font-bold text-gray-900">Admin Panel</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-md border px-2 py-2 hover:bg-gray-50"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 flex flex-col gap-2">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="mt-auto pt-4">
                <button
                  onClick={onLogout}
                  className="w-full rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
