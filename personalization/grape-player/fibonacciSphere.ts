import * as THREE from "three";

/**
 * Fibonacci sphere (golden spiral) — 균일한 구면 포인트 분포.
 */
export function fibonacciSpherePoints(count: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = 1 - 2 * t;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    pts.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return pts;
}
