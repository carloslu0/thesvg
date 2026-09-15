// Small shared shape-builders for CallToolResult, used by every tool in
// index.ts. Pulled out mainly to avoid repeating the same
// `{ content: [{ type: "text", text }] , isError }` object literal in every
// handler (five tools times several branches each adds up fast).

export interface TextToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: true;
}

export function textResult(text: string): TextToolResult {
  return { content: [{ type: "text", text }] };
}

export function errorResult(text: string): TextToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export function iconNotFoundResult(slug: string): TextToolResult {
  return errorResult(
    `Icon not found: "${slug}". Use search_icons to find the correct slug.`
  );
}
