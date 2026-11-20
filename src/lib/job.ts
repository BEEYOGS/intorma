const COLORS: Record<string, string> = {
  menunggu: "#d9ad82",
  dikerjakan: "#a3582b",
  revisi: "#6abf7b",
  selesai: "#6abf7b",
  batal: "#8b929c",
};

export const jobStatusColor = (status: string): string => COLORS[status] || "#8b929c";
