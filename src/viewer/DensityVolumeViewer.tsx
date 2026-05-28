/**
 * Direct Three.js/WebGL2 density-volume renderer for exported reference frames.
 *
 * The viewer uploads a compact single-channel byte volume into a Data3DTexture
 * and raymarches it through the approved density transfer palette. It owns all
 * GPU allocation/disposal and reports unsupported or failed rendering states
 * without removing scientific context from the surrounding Explore shell.
 */
import { useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Data3DTexture,
  EdgesGeometry,
  Float32BufferAttribute,
  GLSL3,
  LineBasicMaterial,
  LineSegments,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RedFormat,
  Scene,
  ShaderMaterial,
  Spherical,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  datasetHasParticles,
  type ReferenceDataset,
} from "../data/referenceDataset";
import { decodeParticlePositions } from "./particlePositions";

export type GeometryMode = "sphere" | "cube";
export type ViewMode = "density" | "both" | "particles";

export interface DensityVolumeViewerProps {
  dataset: ReferenceDataset;
  frameIndex: number;
  nextFrameIndex: number;
  particleFrameIndex: number;
  frameBlend: number;
  geometryMode: GeometryMode;
  viewMode: ViewMode;
  resetViewToken: number;
}

type ViewerStatus = "starting" | "loading" | "ready" | "unsupported" | "error";
type DensityTexturePair = {
  current: Data3DTexture | null;
  next: Data3DTexture | null;
};
type RenderOptions = {
  frameBlend: number;
  geometryMode: GeometryMode;
  viewMode: ViewMode;
};

const vertexShader = `
  out vec3 vLocalPosition;

  void main() {
    vLocalPosition = position + vec3(0.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  precision highp sampler3D;

  uniform sampler3D densityVolume;
  uniform sampler3D nextDensityVolume;
  uniform vec3 localCameraPosition;
  uniform float frameBlend;
  uniform float sphereMask;
  uniform float densityVisibility;
  in vec3 vLocalPosition;
  out vec4 outputColor;

  vec3 densityColor(float value) {
    vec3 voidTone = vec3(0.08, 0.025, 0.19);
    vec3 filamentTone = vec3(0.02, 0.67, 0.57);
    vec3 knotTone = vec3(0.93, 0.98, 0.17);
    float filamentMix = smoothstep(0.56, 0.73, value);
    float knotMix = smoothstep(0.77, 0.94, value);
    return mix(mix(voidTone, filamentTone, filamentMix), knotTone, knotMix);
  }

  void main() {
    if (densityVisibility <= 0.001) {
      discard;
    }

    vec3 direction = normalize(vLocalPosition - localCameraPosition);
    vec3 position = vLocalPosition;
    vec3 stepDirection = -direction / 120.0;
    vec4 accumulation = vec4(0.0);

    for (int sampleIndex = 0; sampleIndex < 150; sampleIndex++) {
      if (any(lessThan(position, vec3(0.0))) || any(greaterThan(position, vec3(1.0)))) {
        break;
      }
      if (sphereMask > 0.5 && distance(position, vec3(0.5)) > 0.5) {
        position += stepDirection;
        continue;
      }
      float currentDensity = texture(densityVolume, position).r;
      float nextDensity = texture(nextDensityVolume, position).r;
      float density = mix(currentDensity, nextDensity, frameBlend);
      float opacity = smoothstep(0.54, 0.95, density) * 0.028 * densityVisibility;
      vec3 color = densityColor(density);
      accumulation.rgb += (1.0 - accumulation.a) * color * opacity;
      accumulation.a += (1.0 - accumulation.a) * opacity;
      if (accumulation.a > 0.965) {
        break;
      }
      position += stepDirection;
    }

    outputColor = vec4(accumulation.rgb, accumulation.a);
  }
`;

function disposeDensityTextures(textures: DensityTexturePair) {
  const uniqueTextures = new Set(
    [textures.current, textures.next].filter((texture): texture is Data3DTexture => Boolean(texture)),
  );
  uniqueTextures.forEach((texture) => texture.dispose());
  textures.current = null;
  textures.next = null;
}

function createDensityTexture(bytes: Uint8Array, dimensions: readonly [number, number, number]) {
  const [width, height, depth] = dimensions;
  const texture = new Data3DTexture(bytes, width, height, depth);
  texture.format = RedFormat;
  texture.type = UnsignedByteType;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

async function fetchDensityTexture(
  dataset: ReferenceDataset,
  frameIndex: number,
  signal: AbortSignal,
) {
  const frame = dataset.frames[frameIndex];
  const response = await fetch(`/datasets/${dataset.scenario_id}/${frame.path}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Unable to load density frame (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== frame.byte_length) {
    throw new Error("Density frame byte count does not match manifest");
  }
  return createDensityTexture(bytes, dataset.volume.dimensions);
}

function disposeParticleLayer(layer: Points | null) {
  if (!layer) {
    return;
  }
  layer.geometry.dispose();
  (layer.material as PointsMaterial).dispose();
}

function createParticleLayer(positions: Float32Array, viewMode: ViewMode) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const material = new PointsMaterial({
    blending: AdditiveBlending,
    color: 0xeafc49,
    depthWrite: false,
    opacity: viewMode === "both" ? 0.62 : 0.9,
    size: viewMode === "both" ? 0.006 : 0.008,
    sizeAttenuation: true,
    transparent: true,
  });
  return new Points(geometry, material);
}

export function DensityVolumeViewer({
  dataset,
  frameIndex,
  nextFrameIndex,
  particleFrameIndex,
  frameBlend,
  geometryMode,
  viewMode,
  resetViewToken,
}: DensityVolumeViewerProps) {
  const hasWebGL2Api = typeof WebGL2RenderingContext !== "undefined";
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const densityTexturesRef = useRef<DensityTexturePair>({ current: null, next: null });
  const volumeRef = useRef<Mesh | null>(null);
  const outlineRef = useRef<LineSegments | null>(null);
  const particleLayerRef = useRef<Points | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const renderOptionsRef = useRef<RenderOptions>({
    frameBlend,
    geometryMode,
    viewMode,
  });
  const [status, setStatus] = useState<ViewerStatus>(
    hasWebGL2Api ? "starting" : "unsupported",
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (!hasWebGL2Api) {
      return;
    }
    const densityTextures = densityTexturesRef.current;

    const testCanvas = document.createElement("canvas");
    if (!testCanvas.getContext("webgl2")) {
      window.queueMicrotask(() => setStatus("unsupported"));
      return;
    }

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      window.queueMicrotask(() => setStatus("unsupported"));
      return;
    }

    const scene = new Scene();
    sceneRef.current = scene;
    const camera = new PerspectiveCamera(43, 1, 0.01, 100);
    camera.position.set(1.65, 1.22, 1.72);

    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader,
      fragmentShader,
      side: BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        densityVolume: { value: null },
        nextDensityVolume: { value: null },
        localCameraPosition: { value: new Vector3() },
        frameBlend: { value: 0 },
        sphereMask: { value: 1 },
        densityVisibility: { value: 1 },
      },
    });
    materialRef.current = material;
    const geometry = new BoxGeometry(1, 1, 1);
    const volume = new Mesh(geometry, material);
    volumeRef.current = volume;
    scene.add(volume);

    const outline = new LineSegments(
      new EdgesGeometry(geometry),
      new LineBasicMaterial({
        color: 0x8b9b9a,
        transparent: true,
        opacity: 0.64,
      }),
    );
    outlineRef.current = outline;
    scene.add(outline);

    renderer.setClearColor(0x030508, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "volume-canvas";
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive reference volume. Scroll over the viewer scrubs time; arrow keys orbit; plus and minus keys zoom.",
    );
    renderer.domElement.setAttribute("aria-describedby", "volume-interaction-help");
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.minDistance = 1.15;
    controls.maxDistance = 4.2;
    controls.target.set(0, 0, 0);
    controls.saveState();
    controlsRef.current = controls;

    const adjustCamera = (event: KeyboardEvent) => {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new Spherical().setFromVector3(offset);
      const rotationStep = Math.PI / 24;
      let handled = true;
      switch (event.key) {
        case "ArrowLeft":
          spherical.theta -= rotationStep;
          break;
        case "ArrowRight":
          spherical.theta += rotationStep;
          break;
        case "ArrowUp":
          spherical.phi = Math.max(0.12, spherical.phi - rotationStep);
          break;
        case "ArrowDown":
          spherical.phi = Math.min(Math.PI - 0.12, spherical.phi + rotationStep);
          break;
        case "+":
        case "=":
          spherical.radius = Math.max(controls.minDistance, spherical.radius * 0.9);
          break;
        case "-":
        case "_":
          spherical.radius = Math.min(controls.maxDistance, spherical.radius * 1.1);
          break;
        default:
          handled = false;
      }
      if (!handled) {
        return;
      }
      event.preventDefault();
      camera.position.copy(controls.target).add(new Vector3().setFromSpherical(spherical));
      camera.lookAt(controls.target);
      controls.update();
    };
    renderer.domElement.addEventListener("keydown", adjustCamera);

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const width = Math.max(bounds.width, 1);
      const height = Math.max(bounds.height, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let animationFrame = 0;
    const render = () => {
      const options = renderOptionsRef.current;
      controls.update();
      material.uniforms.frameBlend.value = options.frameBlend;
      material.uniforms.sphereMask.value = options.geometryMode === "sphere" ? 1 : 0;
      material.uniforms.densityVisibility.value =
        options.viewMode === "both" ? 0.68 : options.viewMode === "density" ? 1 : 0;
      material.uniforms.localCameraPosition.value.copy(camera.position).addScalar(0.5);
      volume.visible = options.viewMode !== "particles";
      const outlineMaterial = outline.material as LineBasicMaterial;
      outlineMaterial.opacity = options.geometryMode === "sphere" ? 0.36 : 0.68;
      const particleLayer = particleLayerRef.current;
      if (particleLayer) {
        particleLayer.visible = options.viewMode !== "density";
        const particleMaterial = particleLayer.material as PointsMaterial;
        particleMaterial.opacity = options.viewMode === "both" ? 0.62 : 0.9;
        particleMaterial.size = options.viewMode === "both" ? 0.006 : 0.008;
      }
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      controls.dispose();
      controlsRef.current = null;
      renderer.domElement.removeEventListener("keydown", adjustCamera);
      disposeDensityTextures(densityTextures);
      if (particleLayerRef.current) {
        scene.remove(particleLayerRef.current);
      }
      disposeParticleLayer(particleLayerRef.current);
      particleLayerRef.current = null;
      material.dispose();
      geometry.dispose();
      (outline.geometry as EdgesGeometry).dispose();
      (outline.material as LineBasicMaterial).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      materialRef.current = null;
      volumeRef.current = null;
      outlineRef.current = null;
    };
  }, [hasWebGL2Api]);

  useEffect(() => {
    controlsRef.current?.reset();
  }, [resetViewToken]);

  useEffect(() => {
    renderOptionsRef.current = { frameBlend, geometryMode, viewMode };
  }, [frameBlend, geometryMode, viewMode]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) {
      return;
    }
    const abortController = new AbortController();
    disposeDensityTextures(densityTexturesRef.current);
    material.uniforms.densityVolume.value = null;
    material.uniforms.nextDensityVolume.value = null;
    setStatus("loading");
    Promise.all([
      fetchDensityTexture(dataset, frameIndex, abortController.signal),
      nextFrameIndex === frameIndex
        ? Promise.resolve(null)
        : fetchDensityTexture(dataset, nextFrameIndex, abortController.signal),
    ])
      .then(([currentTexture, loadedNextTexture]) => {
        if (abortController.signal.aborted) {
          currentTexture.dispose();
          loadedNextTexture?.dispose();
          return;
        }
        const nextTexture = loadedNextTexture ?? currentTexture;
        densityTexturesRef.current.current = currentTexture;
        densityTexturesRef.current.next = nextTexture;
        material.uniforms.densityVolume.value = currentTexture;
        material.uniforms.nextDensityVolume.value = nextTexture;
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!abortController.signal.aborted) {
          setStatus("error");
          console.error(error);
        }
      });
    return () => abortController.abort();
  }, [dataset, frameIndex, nextFrameIndex]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (particleLayerRef.current && scene) {
      scene.remove(particleLayerRef.current);
    }
    disposeParticleLayer(particleLayerRef.current);
    particleLayerRef.current = null;

    if (!scene || viewMode === "density" || !datasetHasParticles(dataset)) {
      return;
    }

    const frame = dataset.frames[particleFrameIndex];
    const abortController = new AbortController();
    let layer: Points | null = null;
    fetch(`/datasets/${dataset.scenario_id}/${frame.particles.path}`, {
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load particle frame (${response.status})`);
        }
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== frame.particles.byte_length) {
          throw new Error("Particle frame byte count does not match manifest");
        }
        if (abortController.signal.aborted) {
          return;
        }
        layer = createParticleLayer(
          decodeParticlePositions(bytes, frame.particles.particle_count),
          viewMode,
        );
        particleLayerRef.current = layer;
        scene.add(layer);
      })
      .catch((error: unknown) => {
        if (!abortController.signal.aborted) {
          setStatus("error");
          console.error(error);
        }
      });

    return () => {
      abortController.abort();
      if (layer) {
        scene.remove(layer);
      }
      disposeParticleLayer(layer);
      if (particleLayerRef.current === layer) {
        particleLayerRef.current = null;
      }
    };
  }, [dataset, particleFrameIndex, viewMode]);

  return (
    <div className="volume-viewer" ref={containerRef}>
      {status === "unsupported" ? (
        <div className="viewer-notice" role="status">
          <p className="eyebrow">Reference Playback Available</p>
          <p>3D viewing unavailable on this device. Time and provenance remain visible.</p>
        </div>
      ) : null}
      {status === "loading" || status === "starting" ? (
        <p className="viewer-loading">Loading reference frame...</p>
      ) : null}
      {status === "error" ? (
        <div className="viewer-notice" role="alert">
          <p className="eyebrow">Frame Load Failed</p>
          <p>The reference volume could not be displayed safely.</p>
        </div>
      ) : null}
    </div>
  );
}
