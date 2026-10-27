import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/* ---------- small helpers ---------- */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angleDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const isTouch = matchMedia('(pointer: coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rupee = (n) => '₹' + n.toLocaleString('en-IN');

/* ---------- sample content (demo data, real shops replace these) ---------- */
const CATS = {
  chaniya: { label: 'Chaniya choli', color: '#b5566a' },
  saree:   { label: 'Sarees',        color: '#c08a45' },
  men:     { label: 'Menswear',      color: '#5d84a8' },
  rental:  { label: 'Rentals',       color: '#8b6fa8' },
  kids:    { label: 'Kids',          color: '#6f9a63' },
  tailor:  { label: 'Tailoring',     color: '#b9a25a' },
  jewel:   { label: 'Jewellery',     color: '#a99070' },
};

/* style: 'glass' = modern boutique with a glass front, 'open' = traditional open shop front */
const SHOPS = [
  { id: 'navrang', name: 'Navrang Chaniya Choli', gu: 'નવરંગ ચણિયા ચોળી', cat: 'chaniya', side: 1, slot: 5,
    price: [1800, 24000], rent: true, alter: 'Same day', timing: '10:30 am to 10 pm', days: 'Open all days in Navratri season',
    specs: ['Kutchi mirror work', 'Bandhani chaniya', 'Heavy ghaghra for garba', 'Matching kediyu for couples'],
    offer: '10% off any chaniya choli above ₹5,000', code: 'FARO-GK-0412',
    style: 'glass', facade: '#d9cbb3', trim: '#5b3a2e', interior: '#efe3cf', sign: ['#2a1d1a', '#d8b97f'], font: 'serif', floors: 3, toran: true,
    garments: ['#8e2436', '#b8862f', '#24426b', '#5b2e5f', '#c4a24c', '#1f5a4a'], display: [['chaniya', '#8e2436', '#b08d4f'], ['chaniya', '#24426b', '#e6e0d2']], seat: 'counter' },
  { id: 'kesariya', name: 'Shree Kesariya Saree Sadan', gu: 'શ્રી કેસરિયા સાડી સદન', cat: 'saree', side: 1, slot: 6,
    price: [900, 42000], rent: false, alter: 'Fall and pico, 2 days', timing: '10 am to 9 pm', days: 'Closed Tuesdays',
    specs: ['Gharchola', 'Banarasi silk', 'Daily wear cotton', 'Blouse stitching'],
    offer: 'Free fall and pico on sarees above ₹3,000', code: 'FARO-GK-1187',
    style: 'open', facade: '#e3d6bd', trim: '#8a6a45', interior: '#f1e7d4', sign: ['#efe6d4', '#5a2a1c'], font: 'serif', floors: 2, awning: ['#6e3a2a', '#ddd2bf'],
    garments: ['#7a2028', '#9a4a2c', '#2f5d6b', '#b08d4f', '#5c1f2a'], display: [['saree', '#7a2028', '#b08d4f'], ['saree', '#2f5d6b', '#b08d4f']], seat: 'gaddi' },
  { id: 'mehfil', name: 'Mehfil Sherwani House', gu: 'મહેફિલ શેરવાની હાઉસ', cat: 'men', side: 1, slot: 7,
    price: [8500, 75000], rent: true, alter: '3 to 4 days', timing: '11 am to 9:30 pm', days: 'Open all days',
    specs: ['Wedding sherwani', 'Jodhpuri suits', 'Safa and mojari', 'Groom styling'],
    offer: 'Free safo with any sherwani', code: 'FARO-GK-2290',
    style: 'glass', facade: '#cfcac0', trim: '#2b2f36', interior: '#ece5d8', sign: ['#1c1f24', '#c9b07a'], font: 'serif', floors: 3,
    garments: ['#e6dfcc', '#26324f', '#5c1f2a', '#2f4a3a', '#b8a06a'], display: [['sherwani', '#e6dfcc', '#b08d4f'], ['sherwani', '#5c1f2a', '#b08d4f']], seat: 'counter' },
  { id: 'raas', name: 'Raas Rental Studio', gu: 'રાસ રેન્ટલ સ્ટુડિયો', cat: 'rental', side: 1, slot: 8,
    price: [500, 3500], rent: true, alter: 'Fitting included', timing: '9 am to 11 pm', days: 'Open all days in Navratri season',
    specs: ['Chaniya choli on rent', 'Kediyu on rent', 'Oxidised sets on rent', 'Book by the night'],
    offer: 'Second night at half price', code: 'FARO-GK-3305',
    style: 'open', facade: '#d8c7c0', trim: '#4a3a52', interior: '#efe4e0', sign: ['#2b2433', '#e2d3c0'], font: 'sans', floors: 2, toran: true,
    garments: ['#4b2a5a', '#a3445a', '#b8892f', '#24426b', '#8e2436', '#3f6b4a'], display: [['chaniya', '#4b2a5a', '#b08d4f'], ['kurta', '#b8892f', '#6b2430']], seat: 'counter' },
  { id: 'gulmohar', name: 'Gulmohar Kids Ethnic', gu: 'ગુલમહોર કિડ્સ એથનિક', cat: 'kids', side: 1, slot: 9,
    price: [600, 6500], rent: true, alter: 'Same day', timing: '10:30 am to 9 pm', days: 'Closed Mondays',
    specs: ['Mini chaniya choli', 'Kids kurta sets', 'Krishna and Radha costumes', 'Ages 1 to 14'],
    offer: 'Free bindi and bangle set with every outfit', code: 'FARO-GK-4471',
    style: 'open', facade: '#d6d3c4', trim: '#7a3d2e', interior: '#f0eadc', sign: ['#f0ebe0', '#8a3a2a'], font: 'sans', floors: 2,
    garments: ['#c0604a', '#c9a24c', '#3f8a72', '#2f6a8a', '#b0505a'], display: [['chaniya', '#b0505a', '#c9a46a'], ['kurta', '#2f5f73', '#c9a46a']], seat: 'counter', kidsDisplay: true },
  { id: 'aabhushan', name: 'Aabhushan Oxidised Jewels', gu: 'આભૂષણ ઓક્સિડાઇઝ્ડ', cat: 'jewel', side: 1, slot: 10,
    price: [150, 4800], rent: true, alter: 'Repairs while you wait', timing: '11 am to 10 pm', days: 'Open all days',
    specs: ['Oxidised garba sets', 'Kamarbandh', 'Hath phool', 'Kada and payal'],
    offer: 'Buy two sets, get a third at ₹99', code: 'FARO-GK-5518',
    style: 'glass', facade: '#d2cbbf', trim: '#3b342e', interior: '#ece4d6', sign: ['#191818', '#c8c4bb'], font: 'serif', floors: 4,
    garments: ['#8d9096', '#b8a06a', '#5c1f2a'], display: [['chaniya', '#2a2a2e', '#a9adb3'], ['saree', '#5c1f2a', '#a9adb3']], seat: 'jewel' },
  { id: 'bandhani', name: 'Bandhani Bazaar', gu: 'બાંધણી બજાર', cat: 'saree', side: -1, slot: 5,
    price: [1200, 18000], rent: false, alter: 'Blouse stitching, 3 days', timing: '10 am to 9 pm', days: 'Open all days',
    specs: ['Jamnagar bandhani', 'Gharchola for weddings', 'Bandhani dupattas', 'Tie and dye kurtis'],
    offer: 'Free bandhani dupatta above ₹6,000', code: 'FARO-GK-0621',
    style: 'open', facade: '#e0cfae', trim: '#7a2e26', interior: '#f1e5cf', sign: ['#6e2a22', '#f0e2c8'], font: 'serif', floors: 2, awning: ['#5e2a22', '#e2d6c0'], toran: true,
    garments: ['#8a2230', '#c49a3a', '#2f4a3a', '#a3445a', '#9a4a2c'], display: [['saree', '#8a2230', '#c49a3a'], ['chaniya', '#c49a3a', '#8a2230']], seat: 'gaddi' },
  { id: 'kediyu', name: 'Kediyu Corner', gu: 'કેડિયું કોર્નર', cat: 'men', side: -1, slot: 6,
    price: [900, 6500], rent: true, alter: 'Same day', timing: '10 am to 10 pm', days: 'Open all days in Navratri season',
    specs: ['Kutchi kediyu', 'Dhoti and kediyu sets', 'Kurta pyjama', 'Couple matching sets'],
    offer: '₹300 off on couple sets', code: 'FARO-GK-1734',
    style: 'open', facade: '#c9cfcf', trim: '#2f4a63', interior: '#ebe5d8', sign: ['#20344a', '#e6dcc4'], font: 'sans', floors: 3,
    garments: ['#2f4a63', '#9a4a2c', '#e6e0d2', '#a3445a', '#2f4a3a'], display: [['kurta', '#2f4a63', '#e6e0d2'], ['kurta', '#9a4a2c', '#b08d4f']], seat: 'counter' },
  { id: 'patola', name: 'Patola Paridhan', gu: 'પટોળા પરિધાન', cat: 'saree', side: -1, slot: 7,
    price: [12000, 250000], rent: false, alter: 'Blouse stitching, 5 days', timing: '11 am to 8:30 pm', days: 'Closed Tuesdays',
    specs: ['Patan double ikat', 'Rajkot patola', 'Bridal patola', 'Certificate of weave'],
    offer: 'Free blouse stitching on any patola', code: 'FARO-GK-2846',
    style: 'glass', facade: '#e2d8c6', trim: '#4a1f24', interior: '#efe6d6', sign: ['#3a171c', '#d9bf8a'], font: 'serif', floors: 4,
    garments: ['#5c1f2a', '#2f4a3a', '#8a2230', '#26324f', '#b08d4f'], display: [['saree', '#2f4a3a', '#8a2230'], ['saree', '#5c1f2a', '#b08d4f']], seat: 'gaddi' },
  { id: 'rangat', name: 'Rangat Lehenga Lounge', gu: 'રંગત લહેંગા લાઉન્જ', cat: 'chaniya', side: -1, slot: 8,
    price: [18000, 180000], rent: true, alter: 'Fitting in 5 to 7 days', timing: '11 am to 9 pm', days: 'By appointment on Sundays',
    specs: ['Bridal lehenga', 'Reception gowns', 'Sangeet outfits', 'Private trial room'],
    offer: 'Free first trial and styling session', code: 'FARO-GK-3952',
    style: 'glass', facade: '#ddd0cb', trim: '#5e2a35', interior: '#f0e6e0', sign: ['#efe7e1', '#5e2a35'], font: 'serif', floors: 3,
    garments: ['#7a1f2b', '#a3445a', '#e6dccb', '#b08d4f', '#4b2a5a'], display: [['chaniya', '#7a1f2b', '#b08d4f'], ['chaniya', '#e6dccb', '#b08d4f']], seat: 'counter' },
  { id: 'zari', name: 'Zari Tailors', gu: 'ઝરી ટેલર્સ', cat: 'tailor', side: -1, slot: 9,
    price: [450, 2500], rent: false, alter: 'Same day for small fixes', timing: '9:30 am to 9 pm', days: 'Closed Sundays',
    specs: ['Blouse stitching', 'Chaniya alterations', 'Kurta fitting', 'Latkan and tassel work'],
    offer: 'Express stitching at no extra cost', code: 'FARO-GK-4093',
    style: 'open', facade: '#cfcbd4', trim: '#3a3550', interior: '#ece6da', sign: ['#e9e2cf', '#2f2a45'], font: 'sans', floors: 2,
    garments: ['#e6e0d2', '#b08d4f', '#4b2a5a', '#9a4a2c'], display: [['saree', '#4b2a5a', '#b08d4f'], ['kurta', '#e6e0d2', '#6b2430']], seat: 'counter' },
  { id: 'morpankh', name: 'Morpankh Boutique', gu: 'મોરપંખ બુટિક', cat: 'chaniya', side: -1, slot: 10,
    price: [3500, 45000], rent: false, alter: '2 to 3 days', timing: '11 am to 9 pm', days: 'Open all days',
    specs: ['Designer chaniya choli', 'Peacock motif work', 'Indo western', 'Made to measure'],
    offer: 'Free custom fitting on any design', code: 'FARO-GK-5167',
    style: 'glass', facade: '#c8d3cf', trim: '#244a4f', interior: '#e8ece6', sign: ['#163236', '#cfe0d6'], font: 'serif', floors: 3,
    garments: ['#1f5560', '#2f4a3a', '#4b2a5a', '#b8892f', '#26324f'], display: [['chaniya', '#1f5560', '#6f8f5a'], ['chaniya', '#2f4a3a', '#b08d4f']], seat: 'counter' },
];

/* everyday businesses that fill the rest of the street (not enterable) */
const GENERIC = [
  { name: 'Shiv Medical & General Stores', gu: 'શિવ મેડિકલ સ્ટોર્સ', sign: ['#1f4d3a', '#f2f2ee'], font: 'sans', front: 'glass', mark: '+' },
  { name: 'Jalaram Sweets & Farsan', gu: 'જલારામ સ્વીટ્સ', sign: ['#5e2a1c', '#f0dfba'], font: 'serif', front: 'open' },
  { name: 'Sai Mobile Point', gu: 'સાઈ મોબાઈલ પોઈન્ટ', sign: ['#1d2b44', '#e8e8e8'], font: 'sans', front: 'glass' },
  { name: 'Krishna Xerox & Stationery', gu: 'કૃષ્ણ ઝેરોક્ષ', sign: ['#f1ece0', '#1e3a5f'], font: 'sans', front: 'open' },
  { name: 'Dev Footwear', gu: 'દેવ ફૂટવેર', sign: ['#232323', '#d9c18a'], font: 'sans', front: 'glass' },
  { name: 'Om Opticians', gu: 'ૐ ઓપ્ટિશિયન્સ', sign: ['#e9e6df', '#203040'], font: 'sans', front: 'glass' },
  { name: 'Ambika Dairy', gu: 'અંબિકા ડેરી', sign: ['#2f4f6f', '#f2efe6'], font: 'sans', front: 'open' },
  { name: 'Gurukul Chai Corner', gu: 'ગુરુકુળ ચા', sign: ['#4f3420', '#efe1c6'], font: 'serif', front: 'open' },
  { name: 'Royal Hair Studio', gu: 'રોયલ હેર સ્ટુડિયો', sign: ['#151515', '#c9b07a'], font: 'serif', front: 'glass' },
  { name: 'Sahjanand Electronics', gu: 'સહજાનંદ ઇલેક્ટ્રોનિક્સ', sign: ['#1f2a33', '#e6e2d6'], font: 'sans', front: 'glass' },
  { name: 'Patel Hardware', gu: 'પટેલ હાર્ડવેર', sign: ['#6b4f1e', '#f3ead6'], font: 'sans', front: 'open' },
  { name: 'Shreeji Kirana Store', gu: 'શ્રીજી કિરાણા સ્ટોર', sign: ['#3e5a2e', '#f0ead8'], font: 'sans', front: 'open' },
  { name: 'TO LET', gu: 'ભાડે આપવાનું છે', sign: ['#f3f0e8', '#a12a24'], font: 'sans', front: 'closed' },
  { name: 'Mahalaxmi Bags', gu: 'મહાલક્ષ્મી બેગ્સ', sign: ['#2a2a30', '#e8d9b0'], font: 'sans', front: 'open' },
  { name: 'Annapurna Dining Hall', gu: 'અન્નપૂર્ણા ડાઇનિંગ હોલ', sign: ['#6a2f22', '#f2e3c4'], font: 'serif', front: 'glass' },
  { name: 'Nilkanth Pan', gu: 'નીલકંઠ પાન', sign: ['#24432f', '#e9e2c9'], font: 'sans', front: 'open' },
  { name: 'Swastik Electricals', gu: 'સ્વસ્તિક ઇલેક્ટ્રિકલ્સ', sign: ['#8a2a1e', '#f4ecdc'], font: 'sans', front: 'closed' },
  { name: 'Vandana Fabrics', gu: 'વંદના ફેબ્રિક્સ', sign: ['#3a2f45', '#e6dcc8'], font: 'serif', front: 'open' },
  { name: 'ATM', gu: '24 કલાક', sign: ['#20324a', '#f2f2f2'], font: 'sans', front: 'glass', small: true },
  { name: '', gu: '', sign: null, front: 'closed' },
];

/* ---------- street layout (metres) ---------- */
const W = 11, D = 10, H1 = 4.4, FH = 3.2, FRONT = 10.5, PITCH = 13.5, PILLAR = 0.9, N_SLOTS = 16;
const shopZ = (slot) => -10 - slot * PITCH;
const SPAWN = new THREE.Vector3(-8.2, 0, 15);   /* on the footpath just inside the arch */
const STREET_END = -222;                         /* footpaths and shops end here */
const LIGHTHOUSE = new THREE.Vector3(0, 0, -238);
const ENTRY_RB = new THREE.Vector3(0, 0, 40);    /* roundabout beyond the entrance arch */
const ROAD_Z0 = 58, ROAD_Z1 = -258;

/* ---------- renderer and quality ---------- */
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('loaderText').textContent = "This device couldn't start 3D. Try a recent Chrome, Safari or Firefox.";
  throw e;
}
let pixelRatio = Math.min(devicePixelRatio || 1, isTouch ? 1.5 : 1.75);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const GPU = (() => { try { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch { return ''; } })();
/* ambient occlusion only on desktops with a capable GPU; integrated Intel chips skip it */
const HIGH = !isTouch && !/intel|swiftshader|llvmpipe|mali|adreno/i.test(GPU) && !/[?&]nogtao\b/.test(location.search);

const scene = new THREE.Scene();
const HAZE = new THREE.Color('#cbb89e');          /* warm afternoon dust haze */
scene.fog = new THREE.Fog(HAZE, 70, 430);
scene.background = HAZE.clone();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 6000);

/* late-afternoon sun, low in the west, raking across the street */
const SUN_DIR = new THREE.Vector3(0.46, 0.5, -0.73).normalize();
const sky = new Sky();
sky.scale.setScalar(4500);
Object.assign(sky.material.uniforms, {});
sky.material.uniforms.turbidity.value = 7.5;
sky.material.uniforms.rayleigh.value = 1.3;
sky.material.uniforms.mieCoefficient.value = 0.006;
sky.material.uniforms.mieDirectionalG.value = 0.86;
sky.material.uniforms.sunPosition.value.copy(SUN_DIR);
scene.add(sky);

const hemi = new THREE.HemisphereLight('#c7d6ea', '#6e5c49', 0.35);
scene.add(hemi);
const SUN_OFFSET = SUN_DIR.clone().multiplyScalar(90);
const sun = new THREE.DirectionalLight('#ffd9ae', 3.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 5, far: 220 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.035;
sun.shadow.radius = 3;
scene.add(sun, sun.target);

/* one warm light that moves into whichever shop you are visiting */
const shopLight = new THREE.PointLight('#ffe2bd', 22, 16, 1.6);
shopLight.position.set(0, -50, 0);
scene.add(shopLight);

/* ---------- loading: textures, sky lighting ---------- */
const manager = new THREE.LoadingManager();
let loadDone = 0, loadTotal = 1;
manager.onProgress = (_, done, total) => { loadDone = done; loadTotal = total; const p = Math.round((done / total) * 100); $('loaderText').textContent = `Laying the street… ${p}%`; };
const assetsReady = new Promise((res) => { manager.onLoad = res; manager.onError = () => {}; });
const texLoader = new THREE.TextureLoader(manager);
const loadTex = (name, srgb) => {
  const t = texLoader.load(`assets/tex/${name}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
new RGBELoader(manager).load('assets/sky/sky_wide_street_02_1k.hdr', (tex) => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
});
scene.environmentIntensity = 0.55;
scene.environmentRotation.set(0, 2.2, 0);

/* textures are mapped in world metres, so a 2 m wall and a 20 m wall share the same grain */
const resolveIncludes = (src) => src.replace(/^[ \t]*#include +<([\w\d.]+)>/gm, (m, n) => resolveIncludes(THREE.ShaderChunk[n]));
function worldMapped(sh, scale, glow) {
  sh.uniforms.triScale = { value: scale };
  sh.vertexShader = 'varying vec3 vTriPos;\nvarying vec3 vTriN;\n' + sh.vertexShader.replace('#include <fog_vertex>', `#include <fog_vertex>
  { vec4 tw = vec4(transformed, 1.0); vec3 tnn = objectNormal;
  #ifdef USE_INSTANCING
    tw = instanceMatrix * tw; tnn = mat3(instanceMatrix) * tnn;
  #endif
    vTriPos = (modelMatrix * tw).xyz; vTriN = normalize(mat3(modelMatrix) * tnn); }`);
  let fs = resolveIncludes(sh.fragmentShader);
  fs = fs.replace(/\bv(Map|NormalMap|RoughnessMap)Uv\b/g, 'triUv').replace(/varying vec2 triUv;/g, '');
  fs = fs.replace('void main() {', `uniform float triScale;
varying vec3 vTriPos;
varying vec3 vTriN;
vec2 triUv;
void main() {
  vec3 tAbs = abs(normalize(vTriN));
  triUv = (tAbs.y > max(tAbs.x, tAbs.z) ? vTriPos.xz : (tAbs.x > tAbs.z ? vTriPos.zy : vTriPos.xy)) * triScale;`);
  if (glow) fs = fs.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor.rgb;');
  sh.fragmentShader = fs;
}
const texCache = new Map();
const texSet = (key) => {
  if (!texCache.has(key)) texCache.set(key, { map: loadTex(key + '_diff', true), normalMap: loadTex(key + '_nor'), roughnessMap: loadTex(key + '_rough') });
  return texCache.get(key);
};
function surface(key, { tile = 2, rough = 1, metal = 0, normal = 1, emissive = null, side = THREE.FrontSide } = {}) {
  const t = texSet(key);
  const m = new THREE.MeshStandardMaterial({ ...t, roughness: rough, metalness: metal, normalScale: new THREE.Vector2(normal, normal), side });
  if (emissive) m.emissive = new THREE.Color(emissive);
  m.onBeforeCompile = (sh) => worldMapped(sh, 1 / tile, !!emissive);
  m.customProgramCacheKey = () => `wm-${key}-${tile}-${emissive ? 'e' : ''}`;
  return m;
}

/* ---------- post: soft contact shadows (desktop) and a gentle glow on lamps ---------- */
const composerTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, composerTarget);
composer.setPixelRatio(pixelRatio);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
let gtao = null;
if (HIGH) {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.2, thickness: 1.2, scale: 1, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 12 });
  gtao.blendIntensity = 0.85;
  composer.addPass(gtao);
}
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.45, 1.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let useComposer = true;

/* ---------- shared materials ---------- */
const matStd = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
const matPaint = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.15 });
const matMetal = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.75 });
const matBulb = new THREE.MeshBasicMaterial({ toneMapped: false });
const matGlass = new THREE.MeshStandardMaterial({ color: '#2a3238', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.38, depthWrite: false, envMapIntensity: 1.6 });
const matFoliage = new THREE.MeshStandardMaterial({ roughness: 0.9 });
const matVC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 });
const SURF = {
  plaster: surface('plaster', { tile: 2.6, normal: 0.9 }),
  plasterIn: surface('plaster', { tile: 2.6, normal: 0.5, emissive: new THREE.Color(0.32, 0.29, 0.25) }),
  concrete: surface('concrete', { tile: 2.4 }),
  shutter: surface('shutter', { tile: 1.6, metal: 0.55, normal: 1.2 }),
  wood: surface('wood', { tile: 1.6 }),
  tiles: surface('tiles', { tile: 1.4, rough: 0.6 }),
  pavers: surface('pavers', { tile: 1.8 }),
  bark: surface('bark', { tile: 1.2, normal: 1.3 }),
  road: surface('road', { tile: 4.5 }),
};

/* ---------- instanced batches: thousands of parts, a handful of draw calls ---------- */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
class Batch {
  constructor(geometry, material, { cast = true, receive = true, gain = 1 } = {}) { this.g = geometry; this.m = material; this.items = []; this.cast = cast; this.receive = receive; this.gain = gain; }
  add(base, x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) { this.items.push([base, x, y, z, sx, sy, sz, color, rx, ry, rz]); return this.items.length - 1; }
  build() {
    const n = this.items.length; if (!n) return null;
    const mesh = new THREE.InstancedMesh(this.g, this.m, n);
    this.items.forEach((it, i) => {
      const [base, x, y, z, sx, sy, sz, color, rx, ry, rz] = it;
      _e.set(rx, ry, rz); _q.setFromEuler(_e);
      _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
      if (base) _m.premultiply(base);
      mesh.setMatrixAt(i, _m);
      _c.set(color); if (this.gain !== 1) _c.multiplyScalar(this.gain);
      mesh.setColorAt(i, _c);
    });
    mesh.castShadow = this.cast; mesh.receiveShadow = this.receive;
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
    this.mesh = mesh;
    return mesh;
  }
}
const garmentGeo = new THREE.CylinderGeometry(0.1, 0.3, 1.25, 12, 1); garmentGeo.scale(1, 1, 0.3);
const leafGeo = new THREE.PlaneGeometry(1, 1);
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const B = {
  box: new Batch(unitBox, matStd),
  paint: new Batch(unitBox, matPaint),
  small: new Batch(unitBox, matStd, { cast: false }),
  metal: new Batch(unitBox, matMetal),
  lit: new Batch(unitBox, matBulb, { cast: false, receive: false }),
  glass: new Batch(unitBox, matGlass, { cast: false, receive: false }),
  plaster: new Batch(unitBox, SURF.plaster, { gain: 1.32 }),
  plasterIn: new Batch(unitBox, SURF.plasterIn, { cast: false, gain: 1.25 }),
  concrete: new Batch(unitBox, SURF.concrete, { gain: 1.15 }),
  shutter: new Batch(unitBox, SURF.shutter),
  wood: new Batch(unitBox, SURF.wood),
  tiles: new Batch(unitBox, SURF.tiles, { cast: false }),
  cyl: new Batch(new THREE.CylinderGeometry(0.5, 0.5, 1, 18), matStd),
  cylConcrete: new Batch(new THREE.CylinderGeometry(0.5, 0.5, 1, 14), SURF.concrete),
  cylMetal: new Batch(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), matMetal),
  bark: new Batch(new THREE.CylinderGeometry(0.38, 0.5, 1, 10), SURF.bark),
  sph: new Batch(new THREE.SphereGeometry(0.5, 16, 12), matStd),
  flower: new Batch(new THREE.SphereGeometry(0.5, 7, 5), matStd, { cast: false }),
  bulb: new Batch(new THREE.SphereGeometry(0.5, 8, 6), matBulb, { cast: false, receive: false }),
  garment: new Batch(garmentGeo, matStd),
  leaf: null, /* created in the world module once its texture exists */
};
/* box from two corners in a local frame */
const bx = (batch, base, x0, y0, z0, x1, y1, z1, color) =>
  batch.add(base, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), color);
const bright = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

/* ---------- colliders: 2D boxes on the ground plane ---------- */
const colliders = [];
const _v = new THREE.Vector3();
function addCollider(base, x0, z0, x1, z1, opts = {}) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    _v.set(x, 0, z); if (base) _v.applyMatrix4(base);
    minX = Math.min(minX, _v.x); maxX = Math.max(maxX, _v.x); minZ = Math.min(minZ, _v.z); maxZ = Math.max(maxZ, _v.z);
  }
  colliders.push({ x0: minX, z0: minZ, x1: maxX, z1: maxZ, y0: opts.y0 ?? 0, y1: opts.y1 ?? 30, solid: opts.solid ?? true, cam: opts.cam ?? true, vehicle: opts.vehicle ?? false });
}

/* ---------- canvas text helpers ---------- */
const FONT = {
  serif: (s, w = 600) => `${w} ${s}px "Cormorant Garamond", Georgia, serif`,
  sans: (s, w = 700) => `${w} ${s}px Archivo, "Helvetica Neue", Arial, sans-serif`,
  gu: (s, w = 600) => `${w} ${s}px "Hind Vadodara", sans-serif`,
};
function fitFont(g, text, make, size, maxW) {
  let s = size; g.font = make(s);
  while (g.measureText(text).width > maxW && s > 12) { s -= 2; g.font = make(s); }
  return s;
}
function canvasTex(c) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t;
}
