import { STATUS_META, asStatus } from "@/lib/status";

export const jobStatusColor = (status: string): string => STATUS_META[asStatus(status)].color;
