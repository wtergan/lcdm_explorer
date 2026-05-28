/**
 * Runtime validation boundary for compact reference scenarios exported by lcdm_sim.
 *
 * Explore trusts only explicitly supported, positively validated manifests.
 * Renderer modules consume the returned type; they do not reinterpret unknown
 * payloads or infer provenance from asset paths.
 */
import { z } from "zod";

const supportedSchemaVersions = new Set([1, 2]);
const supportedFormats = new Set([
  "lcdm-density-volume",
  "lcdm-density-particles",
]);

const densityFrameSchema = z.object({
  index: z.number().int().nonnegative(),
  step: z.number().int().nonnegative(),
  a: z.number().positive().max(1),
  z: z.number().nonnegative(),
  path: z.string().regex(/^frames\/[^/]+\.u8$/),
  byte_length: z.number().int().positive(),
  density_std: z.number().nonnegative(),
});

const particleFrameSchema = z.object({
  path: z.string().regex(/^frames\/[^/]+\.u16$/),
  byte_length: z.number().int().positive(),
  particle_count: z.number().int().positive(),
});

const particleMetadataSchema = z.object({
  source_particle_count: z.number().int().positive(),
  sample_count: z.number().int().positive(),
  sample_seed: z.number().int().nonnegative(),
  sample_method: z.literal("numpy.default_rng.choice_without_replacement"),
  sample_indices_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  position_encoding: z.literal("uint16_normalized"),
  layout: z.literal("interleaved_xyz"),
  byte_order: z.literal("little_endian"),
  coordinate_space: z.literal("periodic_box_fraction"),
});

const baseReferenceDatasetSchema = z.object({
  scenario_id: z.string().min(1),
  provenance: z.object({
    source: z.literal("lcdm_sim"),
    run_id: z.string().min(1),
    config: z.record(z.string(), z.unknown()).nullable().optional(),
    validation: z.object({
      status: z.literal("validated"),
      summary: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
  }),
  volume: z.object({
    dimensions: z.tuple([
      z.number().int().positive(),
      z.number().int().positive(),
      z.number().int().positive(),
    ]),
    box_size_mpc_h: z.number().positive(),
    units: z.string().min(1),
    voxel_encoding: z.literal("uint8"),
    layout: z.literal("C"),
    scalar_transform: z.object({
      name: z.literal("log1p_overdensity"),
      input_floor: z.number(),
      transformed_min: z.number(),
      transformed_max: z.number(),
    }),
  }),
});

const densityOnlyReferenceDatasetSchema = baseReferenceDatasetSchema
  .extend({
    schema_version: z.literal(1),
    format: z.literal("lcdm-density-volume"),
    frames: z.array(densityFrameSchema).min(1),
  })
  .superRefine((dataset, context) => {
    const expectedBytes = dataset.volume.dimensions.reduce(
      (product, dimension) => product * dimension,
      1,
    );
    dataset.frames.forEach((frame, index) => {
      if (frame.byte_length !== expectedBytes) {
        context.addIssue({
          code: "custom",
          path: ["frames", index, "byte_length"],
          message: `Expected ${expectedBytes} uint8 voxel bytes`,
        });
      }
    });
  });

const particleReferenceDatasetSchema = baseReferenceDatasetSchema
  .extend({
    schema_version: z.literal(2),
    format: z.literal("lcdm-density-particles"),
    particles: particleMetadataSchema,
    frames: z
      .array(densityFrameSchema.extend({ particles: particleFrameSchema }))
      .min(1),
  })
  .superRefine((dataset, context) => {
    const expectedDensityBytes = dataset.volume.dimensions.reduce(
      (product, dimension) => product * dimension,
      1,
    );
    const expectedParticleBytes = dataset.particles.sample_count * 3 * 2;
    dataset.frames.forEach((frame, index) => {
      if (frame.byte_length !== expectedDensityBytes) {
        context.addIssue({
          code: "custom",
          path: ["frames", index, "byte_length"],
          message: `Expected ${expectedDensityBytes} uint8 voxel bytes`,
        });
      }
      if (frame.particles.byte_length !== expectedParticleBytes) {
        context.addIssue({
          code: "custom",
          path: ["frames", index, "particles", "byte_length"],
          message: `Expected ${expectedParticleBytes} uint16 particle bytes`,
        });
      }
      if (frame.particles.particle_count !== dataset.particles.sample_count) {
        context.addIssue({
          code: "custom",
          path: ["frames", index, "particles", "particle_count"],
          message: `Expected ${dataset.particles.sample_count} sampled particles`,
        });
      }
    });
  });

const referenceDatasetSchema = z.union([
  densityOnlyReferenceDatasetSchema,
  particleReferenceDatasetSchema,
]);

export type ReferenceDataset = z.infer<typeof referenceDatasetSchema>;
export type ParticleReferenceDataset = z.infer<typeof particleReferenceDatasetSchema>;

/**
 * Narrow a validated reference dataset to the particle-capable v2 contract.
 */
export function datasetHasParticles(
  dataset: ReferenceDataset,
): dataset is ParticleReferenceDataset {
  return dataset.schema_version === 2;
}

function isSupportedSchemaVersion(version: unknown): version is 1 | 2 {
  return typeof version === "number" && supportedSchemaVersions.has(version);
}

/**
 * Parse a supported upstream reference manifest or fail with explicit context.
 */
export function parseReferenceDataset(input: unknown): ReferenceDataset {
  const candidate = input as { schema_version?: unknown; format?: unknown };
  if (!isSupportedSchemaVersion(candidate?.schema_version)) {
    throw new Error(
      `Unsupported reference dataset schema version: ${String(candidate?.schema_version)}`,
    );
  }
  if (
    typeof candidate?.format !== "string" ||
    !supportedFormats.has(candidate.format)
  ) {
    throw new Error(`Unsupported reference dataset format: ${String(candidate?.format)}`);
  }

  const parsed = referenceDatasetSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid reference dataset manifest: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Fetch and validate an exported reference scenario manifest.
 */
export async function loadReferenceDataset(
  manifestUrl: string,
  signal?: AbortSignal,
): Promise<ReferenceDataset> {
  const response = await fetch(manifestUrl, { signal });
  if (!response.ok) {
    throw new Error(`Unable to load reference dataset (${response.status})`);
  }
  return parseReferenceDataset(await response.json());
}
