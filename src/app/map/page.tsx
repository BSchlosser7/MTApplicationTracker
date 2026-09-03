"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import type L from "leaflet";
import type { School } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

const schoolsKey = "/api/schools";

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

export default function MapPage() {
  const { data: schools } = useSWR<School[]>(schoolsKey, fetcher);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const startedRef = useRef(false);

  // Auto-geocode any schools missing coordinates, once, pacing requests to
  // respect Nominatim's 1-request-per-second usage policy.
  useEffect(() => {
    if (!schools || startedRef.current) return;
    const missing = schools.filter((s) => s.latitude == null || s.longitude == null);
    if (missing.length === 0) return;
    startedRef.current = true;

    (async () => {
      setGeocoding(true);
      setProgress({ done: 0, total: missing.length });
      for (let i = 0; i < missing.length; i++) {
        await fetch(`/api/schools/${missing[i].id}/geocode`, { method: "POST" });
        setProgress({ done: i + 1, total: missing.length });
        if (i < missing.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }
      }
      setGeocoding(false);
      mutate(schoolsKey);
    })();
  }, [schools]);

  // Initialize the Leaflet map once, client-side only.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((leafletModule) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;
      const leaflet = leafletModule.default;

      delete (leaflet.Icon.Default.prototype as unknown as Record<string, unknown>)
        ._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = leaflet.map(mapContainerRef.current).setView([39.5, -98.35], 4);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
        .addTo(map);
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers whenever schools (or their coordinates) change.
  useEffect(() => {
    if (!schools) return;
    import("leaflet").then((leafletModule) => {
      const leaflet = leafletModule.default;
      const map = mapRef.current;
      if (!map) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const located = schools.filter(
        (s): s is School & { latitude: number; longitude: number } =>
          s.latitude != null && s.longitude != null
      );

      for (const school of located) {
        const marker = leaflet.marker([school.latitude, school.longitude]).addTo(map);
        marker.bindPopup(
          `<a href="/schools/${school.id}" style="font-weight:600">${escapeHtml(school.name)}</a>`
        );
        markersRef.current.push(marker);
      }

      if (located.length > 0) {
        const bounds = leaflet.latLngBounds(
          located.map((s) => [s.latitude, s.longitude] as [number, number])
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      }
    });
  }, [schools]);

  async function saveLocation(schoolId: string, lat: string, lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;
    await fetch(`/api/schools/${schoolId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude }),
    });
    mutate(schoolsKey);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Map</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Pins are located automatically from each school&apos;s name. Click a pin
          for details, or fix a location below if it&apos;s off.
        </p>
      </div>

      {geocoding && (
        <p className="text-sm text-zinc-500">
          Locating schools… {progress.done}/{progress.total}
        </p>
      )}

      <div
        ref={mapContainerRef}
        className="rounded-lg border border-zinc-200 dark:border-zinc-800 h-[60vh] w-full"
      />

      <div>
        <h2 className="font-medium text-sm mb-3">All Schools</h2>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
          {(schools ?? []).map((s) => (
            <SchoolLocationRow key={s.id} school={s} onSave={saveLocation} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchoolLocationRow({
  school,
  onSave,
}: {
  school: School;
  onSave: (id: string, lat: string, lng: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [lat, setLat] = useState(school.latitude?.toString() ?? "");
  const [lng, setLng] = useState(school.longitude?.toString() ?? "");

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <Link href={`/schools/${school.id}`} className="font-medium hover:underline">
        {school.name}
      </Link>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            className="w-24 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
          />
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude"
            className="w-24 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
          />
          <button
            onClick={() => {
              onSave(school.id, lat, lng);
              setEditing(false);
            }}
            className="text-xs text-zinc-900 dark:text-white hover:underline font-medium"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-zinc-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {school.latitude != null && school.longitude != null
              ? `${school.latitude.toFixed(4)}, ${school.longitude.toFixed(4)}`
              : "Not located"}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-500 hover:underline"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
