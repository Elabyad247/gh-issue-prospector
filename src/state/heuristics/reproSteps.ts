const PHRASE_RE =
  /\b(steps?\s+to\s+reproduce|reproduction\s+steps|(?<!\b(?:hard|difficult|unable|impossible|able|trying|try|tried|failed)\s)to\s+reproduce|repro\s+steps)\b/i;
const SECTION_RE =
  /^\s*(?:#{1,6}\s*|\*\*\s*)(?:how\s+|steps?\s+)?to\s+reproduce\s*:?\s*(?:\*\*)?\s*:?\s*$/im;
const NEXT_HEADING_RE = /^\s*(?:#{1,6}\s|\*\*[^*\n]+\*\*\s*:?\s*$)/m;
const NO_ANSWER_RE = /\b(unknown|no idea|don'?t know|dont know|not sure|n\/a)\b/i;
const MIN_SECTION_LENGTH = 15;
const SHORT_SECTION_LENGTH = 40;
const STACK_TRACE_RE = /(^|\n)\s+at\s+\w[\w<>$.]*\s*\(/;
const PYTHON_TRACE_RE = /Traceback\s+\(most\s+recent\s+call\s+last\)/i;
const CRASH_ADDR_RE = /(^|\n)0x[0-9a-fA-F]{8,}\s+\w/;
const CRASH_DUMP_RE = /\b(?:Offset|Code)\s*=\s*0x[0-9a-f]+/i;

export function hasReproSteps(body: string): boolean {
  if (!body) return false;
  const section = reproSection(body);
  if (section === null ? PHRASE_RE.test(body) : isAnswered(section)) return true;
  if (STACK_TRACE_RE.test(body)) return true;
  if (PYTHON_TRACE_RE.test(body)) return true;
  if (CRASH_ADDR_RE.test(body)) return true;
  if (CRASH_DUMP_RE.test(body)) return true;
  if (hasMultiLineCodeBlock(body)) return true;
  return false;
}

function reproSection(body: string): string | null {
  const heading = SECTION_RE.exec(body);
  if (!heading) return null;
  const rest = body.slice(heading.index + heading[0].length);
  const next = NEXT_HEADING_RE.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function isAnswered(section: string): boolean {
  if (section.length < MIN_SECTION_LENGTH) return false;
  return section.length >= SHORT_SECTION_LENGTH || !NO_ANSWER_RE.test(section);
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
