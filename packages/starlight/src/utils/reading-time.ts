const WORDS_PER_MINUTE = 200;

function prose(source: string): string {
  return source
    .replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[ \t]*$/gm, ' ')
    .replace(/^[ \t]*(?:import|export)\s[^\n]*$/gm, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\[[^\]]+\]:\s*\S+$/gm, ' ')
    .replace(/[#>*_~`|]/g, ' ');
}

export function countWords(source: string): number {
  const text = prose(source).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export function readingTimeMinutes(source: string): number {
  return Math.max(1, Math.round(countWords(source) / WORDS_PER_MINUTE));
}
