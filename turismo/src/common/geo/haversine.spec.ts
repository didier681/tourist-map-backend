import {
  calculateBoundingBox,
  haversineDistanceMeters,
} from './haversine';

describe('utilidad geográfica', () => {
  it('calcula la distancia aproximada entre dos latitudes separadas por un grado', () => {
    expect(
      haversineDistanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }),
    ).toBeCloseTo(111_195, -1);
  });

  it('crea una caja delimitadora que contiene el punto y el radio solicitado', () => {
    const box = calculateBoundingBox({ lat: 8.75, lng: -75.88 }, 5000);

    expect(box.minLat).toBeLessThan(8.75);
    expect(box.maxLat).toBeGreaterThan(8.75);
    expect(box.minLng).toBeLessThan(-75.88);
    expect(box.maxLng).toBeGreaterThan(-75.88);
    expect(box.maxLat).toBeLessThan(9);
  });
});
