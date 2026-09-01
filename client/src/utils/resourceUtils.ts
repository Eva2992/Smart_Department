import type { ResourceType } from "../types/resource.js";

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getTypeBadgeClasses(type: ResourceType): string {
  switch (type) {
    case "SLIDES":
      return "bg-[#DC143C]/10 text-[#DC143C] border-[#DC143C]/20";
    case "NOTES":
      return "bg-[#1F2937]/10 text-[#1F2937] border-[#1F2937]/20";
    case "PAST_PAPER":
      return "bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30";
    case "OTHER":
    default:
      return "bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20";
  }
}

export function formatTypeLabel(type: ResourceType): string {
  switch (type) {
    case "PAST_PAPER":
      return "Past Paper";
    case "SLIDES":
      return "Lecture Slides";
    case "NOTES":
      return "Class Notes";
    case "OTHER":
    default:
      return "Reference";
  }
}
