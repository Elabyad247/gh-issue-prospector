const PHRASE_RE = /\b(steps?\s+to\s+reproduce|reproduction\s+steps|to\s+reproduce|repro\s+steps)\b/i;
const STACK_TRACE_RE = /(^|\n)\s+at\s+\w[\w<>$.]*\s*\(/;
const PYTHON_TRACE_RE = /Traceback\s+\(most\s+recent\s+call\s+last\)/i;
const CRASH_ADDR_RE = /(^|\n)0x[0-9a-fA-F]{8,}\s+\w/;

export function hasReproSteps(body: string): boolean {
  if (!body) return false;
  if (PHRASE_RE.test(body)) return true;
  if (STACK_TRACE_RE.test(body)) return true;
  if (PYTHON_TRACE_RE.test(body)) return true;
  if (CRASH_ADDR_RE.test(body)) return true;
  if (hasMultiLineCodeBlock(body)) return true;
  return false;
}

function hasMultiLineCodeBlock(body: string): boolean {
  const re = /```[^\n]*\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const inner = match[1] ?? '';
    const lineCount = inner.split('\n').filter((l) => l.trim().length > 0).length;
    if (lineCount > 2) return true;
  }
  return false;
}
