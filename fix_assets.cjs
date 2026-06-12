const fs = require('fs');
let code = fs.readFileSync('src/components/Assets.tsx', 'utf8');

// Fix the Deer stateRef type
code = code.replace(/const stateRef = useRef<'wander' \| 'flee'>\('wander'\);/, "const stateRef = useRef<any>('wander');");

// Add missing placeholder components before export function Assets()
const placeholders = `
export function Tent(props: any) {
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]}>
      <mesh position={[0, 1, 0]}>
        <coneGeometry args={[1.5, 2, 4]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
    </group>
  );
}
export function Campfire(props: any) {
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.4, 6]} />
        <meshStandardMaterial color="#7f8c8d" />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <coneGeometry args={[0.4, 1, 4]} />
        <meshStandardMaterial color="#e67e22" emissive="#d35400" />
      </mesh>
    </group>
  );
}
export function Fence(props: any) {
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 0.2]} />
        <meshStandardMaterial color="#8e44ad" />
      </mesh>
    </group>
  );
}
export function Well(props: any) {
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#34495e" />
      </mesh>
    </group>
  );
}
export function Bench(props: any) {
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[2, 0.2, 0.8]} />
        <meshStandardMaterial color="#d35400" />
      </mesh>
    </group>
  );
}
`;

if (!code.includes('export function Tent')) {
  code = code.replace('export function Assets() {', placeholders + '\nexport function Assets() {');
}

fs.writeFileSync('src/components/Assets.tsx', code);
