"use client";

import type { GuardLocation } from "@/src/lib/security/guardLiveLocationPlanning";

export interface GuardLiveMapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GuardLiveMapLayout {
  validLocations: GuardLocation[];
  bounds: GuardLiveMapBounds | null;
}

export function buildGuardLiveMapLayout(locations: GuardLocation[]): GuardLiveMapLayout {
  const validLocations = locations.filter(
    (location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
  );

  if (validLocations.length === 0) {
    return {
      validLocations: [],
      bounds: null,
    };
  }

  const lats = validLocations.map((location) => location.latitude);
  const lngs = validLocations.map((location) => location.longitude);

  return {
    validLocations,
    bounds: {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    },
  };
}

export function getGuardLiveMapPointPosition(
  bounds: GuardLiveMapBounds | null,
  latitude: number,
  longitude: number,
): { left: string; top: string } {
  if (!bounds) {
    return { left: "50%", top: "50%" };
  }

  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.0001);
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.0001);

  const x = ((longitude - bounds.minLng) / lngRange) * 72 + 14;
  const y = (1 - (latitude - bounds.minLat) / latRange) * 72 + 14;

  return {
    left: `${Math.min(Math.max(x, 8), 88)}%`,
    top: `${Math.min(Math.max(y, 8), 88)}%`,
  };
}
