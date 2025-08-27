// renderRing.js
// Transparent, glowing ring effect for <canvas id="canvas">
// Requires three.min.js to be loaded beforehand.

(function () {
  // ---- Grab canvas ----
  var canvas = document.getElementById('canvas');
  if (!canvas) {
    console.warn('[renderRing] #canvas not found; creating one for you.');
    canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    document.body.appendChild(canvas);
  }

  // ---- Renderer (transparent) ----
  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,             // allow page/video to show through
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // fully transparent

  // ---- Scene & Camera ----
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 60);

  // ---- Ring Group ----
  var group = new THREE.Group();
  scene.add(group);

  // Colors (subtle purple glow)
  var COLOR_MAIN = new THREE.Color(0xb78bff);
  var COLOR_GLOW = new THREE.Color(0x7f5cff);

  // ---- Base Ring (thin, semi-transparent) ----
  // Outer radius and inner radius are set relative to viewport height so it scales nicely.
  function getRadii() {
    // Keep ring roughly the same visual size across aspect ratios
    var base = Math.min(window.innerWidth, window.innerHeight) * 0.22;
    var thickness = Math.max(2.0, base * 0.08); // 8% of radius, min 2px
    var outer = base / 10;  // convert px-ish to world units (camera z=60)
    // We map screen pixels to world units roughly; tweak for nice size
    // After testing, scale by a factor so it feels balanced at z=60
    outer = Math.max(16, Math.min(28, outer));
    var inner = Math.max(outer - (thickness * 0.09), outer * 0.87);
    return { outer: outer, inner: inner };
  }

  var radii = getRadii();

  var ringGeom = new THREE.RingGeometry(radii.inner, radii.outer, 256, 1);
  // Slight radial UV tweak to help with a subtle gradient texture we bake in shader below
  ringGeom.rotateX(Math.PI * 0.0);

  var ringMat = new THREE.MeshBasicMaterial({
    color: COLOR_MAIN,
    transparent: true,
    opacity: 0.28,            // <-- make it see-through
    blending: THREE.AdditiveBlending,
    depthWrite: false,        // avoid writing to depth so glow composites nicely
    side: THREE.DoubleSide
  });

  var ringMesh = new THREE.Mesh(ringGeom, ringMat);
  group.add(ringMesh);

  // ---- Soft Glow Halo (slightly larger, extra faint) ----
  var glowGeom = new THREE.RingGeometry(radii.inner * 0.98, radii.outer * 1.12, 256, 1);
  var glowMat = new THREE.MeshBasicMaterial({
    color: COLOR_GLOW,
    transparent: true,
    opacity: 0.10,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  var glowMesh = new THREE.Mesh(glowGeom, glowMat);
  group.add(glowMesh);

  // ---- Sweep Arc (subtle moving highlight) ----
  // We create a thin arc segment that orbits around the ring.
  function makeArc(outer, inner, startA, endA, segs) {
    var g = new THREE.RingGeometry(inner, outer, segs, 1, startA, Math.max(0.001, endA - startA));
    return g;
  }
  var SWEEP_WIDTH = Math.PI * 0.14;     // arc width
  var sweepGeom = makeArc(radii.outer * 1.01, radii.outer * 0.93, 0, SWEEP_WIDTH, 128);
  var sweepMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  var sweepMesh = new THREE.Mesh(sweepGeom, sweepMat);
  group.add(sweepMesh);

  // ---- Animate ----
  var clock = new THREE.Clock();

  function animate() {
    var t = clock.getElapsedTime();

    // Gentle pulsing of opacity for life
    ringMat.opacity = 0.24 + Math.sin(t * 0.6) * 0.04;
    glowMat.opacity = 0.08 + Math.sin(t * 0.6 + Math.PI / 3) * 0.02;

    // Slow rotation
    group.rotation.z = t * 0.18;

    // Sweep orbit (counter-rotate for a nice interference feel)
    sweepMesh.rotation.z = -t * 0.65;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  // ---- Resize handling ----
  function onResize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Rebuild geometries to keep visual thickness consistent across sizes
    var r = getRadii();

    ringMesh.geometry.dispose();
    ringMesh.geometry = new THREE.RingGeometry(r.inner, r.outer, 256, 1);

    glowMesh.geometry.dispose();
    glowMesh.geometry = new THREE.RingGeometry(r.inner * 0.98, r.outer * 1.12, 256, 1);

    sweepMesh.geometry.dispose();
    sweepMesh.geometry = makeArc(r.outer * 1.01, r.outer * 0.93, 0, SWEEP_WIDTH, 128);
  }

  window.addEventListener('resize', onResize, { passive: true });

  // ---- Kick off ----
  onResize();
  animate();
})();
