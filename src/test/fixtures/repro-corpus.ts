export const POSITIVE = [
  'Steps to reproduce:\n1. Open MTA\n2. Click X',
  'Reproduction steps: open the editor and click foo',
  'To reproduce, do the following...',
  'repro steps: load resource then call dgsCreateLabel',
  'Some bug.\n```lua\nfunction foo()\n  return 1\nend\n```',
  'Crashes here:\n  at Object.<anonymous> (foo.js:10:5)\n  at Module._compile',
  'Traceback (most recent call last):\n  File "x.py", line 5',
  'Crash dump:\n0x00007ff8 some_function+0x40\n0x00007ff9 caller+0x12',
];

export const NEGATIVE = [
  '',
  'This is a feature request, no steps needed.',
  'I think this is broken but cannot reproduce.',
  'Some inline `code` mention.',
  '```\nshort\n```',
  'See attached image.',
];
