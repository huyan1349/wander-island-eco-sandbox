const fs = require('fs');
let code = fs.readFileSync('src/components/Assets.tsx', 'utf8');

// Remove the injected duplicate Deer
code = code.replace(`export function Deer(props: any) {\n  const groupRef = useRef<THREE.Group>(null);\n  const stateRef = useRef<any>('wander');\n  const targetRef = useRef(new THREE.Vector3());\n}\n\nexport function Seagull(props: any)`, "export function Seagull(props: any)");

fs.writeFileSync('src/components/Assets.tsx', code);
