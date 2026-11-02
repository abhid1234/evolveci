import { readFile } from "node:fs/promises";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import formatsModule from "ajv-formats";
import type { ValidateFunction } from "ajv";

let validatorPromise: Promise<{ ajv: Ajv2020; validate: ValidateFunction }> | undefined;

async function validator(): Promise<{ ajv: Ajv2020; validate: ValidateFunction }> {
  validatorPromise ??= (async () => {
    const v1Schema = JSON.parse(await readFile(path.resolve("schemas/report.schema.json"), "utf8")) as object;
    const v2Schema = JSON.parse(await readFile(path.resolve("schemas/report-v2.schema.json"), "utf8")) as object;
    const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
    formatsModule.default(ajv);
    ajv.addSchema(v1Schema);
    return { ajv, validate: ajv.compile(v2Schema) };
  })();
  return validatorPromise;
}

export async function reportV2ValidationError(report: unknown): Promise<string | null> {
  const { ajv, validate } = await validator();
  return validate(report) ? null : ajv.errorsText(validate.errors);
}
