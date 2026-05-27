/**
 * Runtime validation boundary for compact reference scenarios exported by lcdm_sim.
 *
 * Explore trusts only explicitly supported, positively validated manifests.
 * Renderer modules consume the returned type; they do not reinterpret unknown
 * payloads or infer provenance from asset paths.
 */
import { z } from "zod";

const supportedSchemaVersion = 1;

const frameSchema = z.object({
  index: z.number().int().nonnegative(),
  step: z.number().int().nonnegative(),
  a: z.number().positive().max(1),
  z: z.number().nonnegative(),
  path: z.string().regex(/^frames\/[^/]+\.u8$/),
  byte_length: z.number().int().positive(),
  density_std: z.number().nonnegative(),
});

const referenceDatasetSchema = z
  .object({
    schema_version: z.literal(supportedSchemaVersion),
    format: z.literal("lcdm-density-volume"),
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
    frames: z.array(frameSchema).min(1),
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

export type ReferenceDataset = z.infer<typeof referenceDatasetSchema>;

/**
 * Parse a supported upstream reference manifest or fail with explicit context.
 */
export function parseReferenceDataset(input: unknown): ReferenceDataset {
  const candidate = input as { schema_version?: unknown; format?: unknown };
  if (candidate?.schema_version !== supportedSchemaVersion) {
    throw new Error(
      `Unsupported reference dataset schema version: ${String(candidate?.schema_version)}`,
    );
  }
  if (candidate?.format !== "lcdm-density-volume") {
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
