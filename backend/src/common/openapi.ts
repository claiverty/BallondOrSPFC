import { ApiBody } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { z } from 'zod';
export function ApiZodBody(schema: z.ZodType) {
  const json = z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' });
  return ApiBody({ schema: json as SchemaObject });
}
