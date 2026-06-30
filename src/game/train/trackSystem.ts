import * as THREE from 'three';
import { getTerrainHeight } from '../../utils/terrain';

export interface Vec2 { x: number; z: number; }

export interface TrackBuild {
  meshGeometry: THREE.BufferGeometry | null;
  bridgePillars: { x: number; y: number; z: number; height: number }[];
  ties: { x: number; y: number; z: number; rotation: number }[];
  curve: THREE.CatmullRomCurve3 | null;
  length: number;
}

export function encodeTrackState(points: Vec2[]): string {
  return 'track:' + points.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';');
}

export function decodeTrackState(s: string | undefined): Vec2[] | null {
  if (!s || !s.startsWith('track:')) return null;
  const body = s.slice('track:'.length);
  if (!body) return null;
  const pts = body.split(';').map(seg => {
    const [x, z] = seg.split(',').map(parseFloat);
    return { x, z };
  }).filter(p => !Number.isNaN(p.x) && !Number.isNaN(p.z));
  return pts.length >= 2 ? pts : null;
}

function resample(points: Vec2[], step: number): Vec2[] {
  const out: Vec2[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    let ax = points[i - 1].x, az = points[i - 1].z;
    const dx = points[i].x - ax, dz = points[i].z - az;
    let len = Math.hypot(dx, dz);
    if (len < 1e-4) continue;
    const ux = dx / len, uz = dz / len;
    let d = step - carry;
    while (d <= len) {
      out.push({ x: ax + ux * d, z: az + uz * d });
      d += step;
    }
    carry = len - (d - step);
  }
  const last = points[points.length - 1];
  if (Math.hypot(out[out.length - 1].x - last.x, out[out.length - 1].z - last.z) > step * 0.4) out.push(last);
  return out;
}

export function buildTrack(points: Vec2[]): TrackBuild {
  if (!points || points.length < 2) return { meshGeometry: null, bridgePillars: [], curve: null, length: 0, ties: [] };

  // Resample points for uniform spacing
  const path = resample(points, 0.4);
  if (path.length < 2) return { meshGeometry: null, bridgePillars: [], curve: null, length: 0, ties: [] };

  // Track must be perfectly horizontal. We take the maximum terrain height along the path so it never clips into ground.
  let trackY = 0;
  for (let i = 0; i < path.length; i++) {
    const th = getTerrainHeight(path[i].x, path[i].z);
    if (th > trackY) trackY = th;
  }
  // Lift slightly above the max height
  trackY = Math.max(trackY + 0.05, 0.1);

  // Create CatmullRomCurve3 for the train to follow
  const v3Points = path.map(p => new THREE.Vector3(p.x, trackY, p.z));
  const curve = new THREE.CatmullRomCurve3(v3Points);
  curve.curveType = 'catmullrom';
  curve.tension = 0.5;
  const length = curve.getLength();

  // Generate bridge pillars
  const bridgePillars: { x: number; y: number; z: number; height: number }[] = [];
  const pillarSpacing = 3.0;
  let dist = 0;
  while (dist < length) {
    const p = curve.getPointAt(dist / length);
    const th = getTerrainHeight(p.x, p.z);
    // If track is high above ground, spawn a pillar
    if (p.y - th > 0.4) {
      bridgePillars.push({
        x: p.x,
        y: th,
        z: p.z,
        height: p.y - th
      });
    }
    dist += pillarSpacing;
  }

  // Build manual Ribbon geometries for the two rails to guarantee perfectly horizontal drawing
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const segments = Math.max(10, Math.floor(length * 4));
  let vertexOffset = 0;

  const railWidth = 0.08;
  const railHeight = 0.08;
  const gauge = 0.35; // distance from center to rail

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    // normal points right
    const right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();

    // Left rail points
    const leftCenter = pos.clone().addScaledVector(right, -gauge);
    const rightCenter = pos.clone().addScaledVector(right, gauge);

    const lY = pos.y;
    const rY = pos.y;

    // Left rail vertices (Top Left, Top Right, Bottom Right, Bottom Left)
    const l1 = leftCenter.clone().addScaledVector(right, -railWidth / 2).setY(lY + railHeight);
    const l2 = leftCenter.clone().addScaledVector(right, railWidth / 2).setY(lY + railHeight);

    // Right rail vertices
    const r1 = rightCenter.clone().addScaledVector(right, -railWidth / 2).setY(rY + railHeight);
    const r2 = rightCenter.clone().addScaledVector(right, railWidth / 2).setY(rY + railHeight);

    positions.push(l1.x, l1.y, l1.z);
    positions.push(l2.x, l2.y, l2.z);
    positions.push(r1.x, r1.y, r1.z);
    positions.push(r2.x, r2.y, r2.z);

    // Compute simple UP normal for now
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(0, t, 1, t, 0, t, 1, t);

    if (i < segments) {
      const base = vertexOffset;
      // Left rail quad
      indices.push(base, base + 4, base + 1);
      indices.push(base + 1, base + 4, base + 5);
      // Right rail quad
      indices.push(base + 2, base + 6, base + 3);
      indices.push(base + 3, base + 6, base + 7);
    }
    vertexOffset += 4;
  }

  const trackGeometry = new THREE.BufferGeometry();
  trackGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  trackGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  trackGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  trackGeometry.setIndex(indices);
  trackGeometry.computeVertexNormals();

  // Generate ties (sleepers)
  const ties: { x: number; y: number; z: number; rotation: number }[] = [];
  const tieSpacing = 0.6;
  let tieDist = 0;
  while (tieDist < length) {
    const p = curve.getPointAt(tieDist / length);
    const tangent = curve.getTangentAt(tieDist / length);
    const rotation = Math.atan2(tangent.x, tangent.z);
    ties.push({ x: p.x, y: p.y, z: p.z, rotation });
    tieDist += tieSpacing;
  }

  return {
    meshGeometry: trackGeometry,
    bridgePillars,
    ties,
    curve,
    length
  };
}
