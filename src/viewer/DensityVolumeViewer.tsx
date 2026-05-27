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
  BackSide,
  BoxGeometry,
  Data3DTexture,
  EdgesGeometry,
  GLSL3,
  LineBasicMaterial,
  LineSegments,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  RedFormat,
  Scene,
  ShaderMaterial,
  Spherical,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import type { ReferenceDataset } from "../data/referenceDataset";

export interface DensityVolumeViewerProps {
  dataset: ReferenceDataset;
  frameIndex: number;
  resetViewToken: number;
}

type ViewerStatus = "starting" | "loading" | "ready" | "unsupported" | "error";

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
  uniform vec3 localCameraPosition;
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
    vec3 direction = normalize(vLocalPosition - localCameraPosition);
    vec3 position = vLocalPosition;
    vec3 stepDirection = -direction / 120.0;
    vec4 accumulation = vec4(0.0);

    for (int sampleIndex = 0; sampleIndex < 150; sampleIndex++) {
      if (any(lessThan(position, vec3(0.0))) || any(greaterThan(position, vec3(1.0)))) {
        break;
      }
      float density = texture(densityVolume, position).r;
      float opacity = smoothstep(0.54, 0.95, density) * 0.028;
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

export function DensityVolumeViewer({
  dataset,
  frameIndex,
  resetViewToken,
}: DensityVolumeViewerProps) {
  const hasWebGL2Api = typeof WebGL2RenderingContext !== "undefined";
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const textureRef = useRef<Data3DTexture | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
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
        localCameraPosition: { value: new Vector3() },
      },
    });
    materialRef.current = material;
    const geometry = new BoxGeometry(1, 1, 1);
    const volume = new Mesh(geometry, material);
    scene.add(volume);

    const outline = new LineSegments(
      new EdgesGeometry(geometry),
      new LineBasicMaterial({
        color: 0x8b9b9a,
        transparent: true,
        opacity: 0.64,
      }),
    );
    scene.add(outline);

    renderer.setClearColor(0x030508, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "volume-canvas";
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive density volume. Arrow keys orbit; plus and minus keys zoom.",
    );
    renderer.domElement.setAttribute("aria-describedby", "volume-interaction-help");
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
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
      controls.update();
      material.uniforms.localCameraPosition.value.copy(camera.position).addScalar(0.5);
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
      textureRef.current?.dispose();
      textureRef.current = null;
      material.dispose();
      geometry.dispose();
      (outline.geometry as EdgesGeometry).dispose();
      (outline.material as LineBasicMaterial).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      materialRef.current = null;
    };
  }, [hasWebGL2Api]);

  useEffect(() => {
    controlsRef.current?.reset();
  }, [resetViewToken]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) {
      return;
    }
    const frame = dataset.frames[frameIndex];
    const abortController = new AbortController();
    textureRef.current?.dispose();
    textureRef.current = null;
    material.uniforms.densityVolume.value = null;
    setStatus("loading");
    fetch(`/datasets/${dataset.scenario_id}/${frame.path}`, {
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load density frame (${response.status})`);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength !== frame.byte_length) {
          throw new Error("Density frame byte count does not match manifest");
        }
        const [width, height, depth] = dataset.volume.dimensions;
        const texture = new Data3DTexture(bytes, width, height, depth);
        texture.format = RedFormat;
        texture.type = UnsignedByteType;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;
        textureRef.current = texture;
        material.uniforms.densityVolume.value = texture;
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!abortController.signal.aborted) {
          setStatus("error");
          console.error(error);
        }
      });
    return () => abortController.abort();
  }, [dataset, frameIndex]);

  return (
    <div className="volume-viewer" ref={containerRef}>
      {status === "unsupported" ? (
        <div className="viewer-notice" role="status">
          <p className="eyebrow">Reference Playback Available</p>
          <p>3D viewing unavailable on this device. Time and provenance remain visible.</p>
        </div>
      ) : null}
      {status === "loading" || status === "starting" ? (
        <p className="viewer-loading">Loading density volume...</p>
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
