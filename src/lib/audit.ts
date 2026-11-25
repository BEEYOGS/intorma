import { sql } from "./db";

export async function audit(
  action: string,
  entity: string,
  entityId?: string | number | null,
  meta?: Record<string, unknown>,
  actor = "admin",
): Promise<void> {
  try {
    await sql`
      insert into audit_log (actor, action, entity, entity_id, meta)
      values (${actor}, ${action}, ${entity}, ${entityId == null ? null : String(entityId)}, ${meta ? JSON.stringify(meta) : null}::jsonb)
    `;
  } catch (error) {
    console.warn("[audit] gagal mencatat:", error);
  }
}