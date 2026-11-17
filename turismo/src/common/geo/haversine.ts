const EARTH_RADIUS_METERS = 6_371_000;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Usa el radio medio terrestre para obtener una distancia en metros coherente entre módulos.
export function haversineDistanceMeters(
  first: GeoPoint,
  second: GeoPoint,
): number {
  const lat1 = (first.lat * Math.PI) / 180;
  const lat2 = (second.lat * Math.PI) / 180;
  const deltaLat = ((second.lat - first.lat) * Math.PI) / 180;
  const deltaLng = ((second.lng - first.lng) * Math.PI) / 180;
  const haversine = Math.min(1, Math.max(0,
    Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2,
  ));

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

// Acota las consultas espaciales en SQL antes de calcular la distancia exacta.
export function calculateBoundingBox(
  point: GeoPoint,
  radiusMeters: number,
): BoundingBox {
  const angularRadius = radiusMeters / EARTH_RADIUS_METERS;
  const latitude = (point.lat * Math.PI) / 180;
  const minLat = Math.max(
    -90,
    point.lat - (angularRadius * 180) / Math.PI,
  );
  const maxLat = Math.min(
    90,
    point.lat + (angularRadius * 180) / Math.PI,
  );

  if (
    minLat <= -90 ||
    maxLat >= 90 ||
    Math.abs(Math.cos(latitude)) < 1e-12
  ) {
    return { minLat, maxLat, minLng: -180, maxLng: 180 };
  }

  const longitudeDelta =
    (Math.asin(Math.sin(angularRadius) / Math.cos(latitude)) * 180) / Math.PI;

  return {
    minLat,
    maxLat,
    minLng: Math.max(-180, point.lng - longitudeDelta),
    maxLng: Math.min(180, point.lng + longitudeDelta),
  };
}
