import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Local texture paths — served from /public/textures/.
 * Keeping them local avoids raw.githubusercontent.com rate-limits and
 * gives us proper caching headers in production.
 */
const DAY_MAP = "/textures/earth_day_4k.jpg";
const BUMP_MAP = "/textures/earth_bump_4k.jpg";
const SPEC_MAP = "/textures/earth_water_4k.png";
const CLOUD_MAP = "/textures/earth_clouds_4k.png";
const LIGHTS_MAP = "/textures/earth_lights_2048.png";

/** Convert geographic coordinates to a THREE.Vector3 on a sphere of radius r. */
function latLonToVec3(lat: number, lon: number, r: number) {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.cos(latR) * Math.cos(lonR),
    r * Math.sin(latR),
    r * Math.cos(latR) * Math.sin(lonR),
  );
}

/**
 * EarthGlobe
 *
 * Renders a Three.js WebGL globe centred on Austria.
 * - Uses local textures (no external CDN dependency).
 * - Respects `prefers-reduced-motion` — stops the animation loop when the
 *   user has requested reduced motion.
 * - Cleans up all GPU resources on unmount.
 * - Shows a static fallback image if WebGL or textures fail to load.
 */
export function EarthGlobe() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Bail out gracefully if WebGL is unavailable
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) {
      setHasError(true);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    // Supersample for razor-sharp coastlines on retina
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.25, 2.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.imageRendering = "crisp-edges";
    mount.appendChild(renderer.domElement);

    // High-contrast top-left key light (warm sun)
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    sun.position.set(-5, 3.5, 3.2);
    scene.add(sun);
    // Very low ambient so the right hemisphere falls into deep cosmic shadow
    scene.add(new THREE.AmbientLight(0x6b7fbf, 0.55));
    // Subtle cool rim fill from the back-right to sculpt the terminator
    const rimFill = new THREE.DirectionalLight(0x3b6bff, 0.35);
    rimFill.position.set(4, -1, -3);
    scene.add(rimFill);

    // Earth group — slight axial tilt so northern hemisphere is favoured
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = (-23.4 * Math.PI) / 180;
    earthGroup.rotation.x = -0.35; // tip north pole toward viewer → Europe sits high
    scene.add(earthGroup);

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    let loadErrors = 0;
    const onTextureError = () => {
      loadErrors++;
      if (loadErrors === 1) setHasError(true);
    };

    const dayMap = loader.load(
      DAY_MAP,
      (t) => (t.colorSpace = THREE.SRGBColorSpace),
      undefined,
      onTextureError,
    );
    const bumpMap = loader.load(BUMP_MAP, undefined, undefined, onTextureError);
    const specMap = loader.load(SPEC_MAP, undefined, undefined, onTextureError);
    const cloudMap = loader.load(CLOUD_MAP, undefined, undefined, onTextureError);
    const lightsMap = loader.load(
      LIGHTS_MAP,
      (t) => (t.colorSpace = THREE.SRGBColorSpace),
      undefined,
      onTextureError,
    );

    dayMap.anisotropy = 16;
    bumpMap.anisotropy = 16;
    specMap.anisotropy = 16;
    lightsMap.anisotropy = 16;

    const earthGeo = new THREE.SphereGeometry(2, 192, 192);
    const earthMat = new THREE.MeshPhongMaterial({
      map: dayMap,
      bumpMap,
      bumpScale: 0.06,
      specularMap: specMap,
      specular: new THREE.Color(0x405a8a),
      shininess: 14,
      // Golden night city lights baked in via emissive
      emissive: new THREE.Color(0xffb84a),
      emissiveMap: lightsMap,
      emissiveIntensity: 1.15,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earth);

    // Clouds
    const cloudGeo = new THREE.SphereGeometry(2.018, 128, 128);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudMap,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(clouds);

    // Atmosphere — cyan-blue Fresnel rim hugging the planet's curve
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          // cyan-blue neon rim
          vec3 col = mix(vec3(0.23, 0.51, 1.0), vec3(0.55, 0.85, 1.0), intensity);
          gl_FragColor = vec4(col, 1.0) * intensity * 1.4;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(2.24, 128, 128), atmoMat);
    scene.add(atmo);

    // Orient sphere so Austria (~47.5°N, 14.5°E) is dead-center on the visible curvature
    const austria = latLonToVec3(47.5, 14.5, 2.01);
    earth.rotation.y = Math.atan2(-austria.x, austria.z);
    clouds.rotation.y = earth.rotation.y;

    // ---- Render one static frame immediately, then animate unless reduced-motion ----
    renderer.render(scene, camera);

    let raf = 0;
    let lastT = performance.now();
    const autoSpeed = 0.025; // radians/sec

    const animate = (t: number) => {
      const dt = (t - lastT) / 1000;
      lastT = t;
      earth.rotation.y += dt * autoSpeed;
      clouds.rotation.y += dt * autoSpeed * 1.15;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    if (!prefersReducedMotion) {
      raf = requestAnimationFrame(animate);
    }

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmoMat.dispose();
      dayMap.dispose();
      bumpMap.dispose();
      specMap.dispose();
      cloudMap.dispose();
      lightsMap.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (hasError) {
    return (
      <div
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        aria-label="Globus, zentriert auf Österreich"
        role="img"
      >
        <img
          src={DAY_MAP}
          alt="Weltkarte zentriert auf Österreich"
          className="h-full w-full rounded-full object-cover opacity-60"
        />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      style={{ imageRendering: "crisp-edges" }}
      aria-label="3D-Globus, zentriert auf Österreich"
      role="img"
    />
  );
}
