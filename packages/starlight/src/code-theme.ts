import type { ExpressiveCodeTheme } from '@astrojs/starlight/expressive-code';

const PUNCTUATION = '#262628';
const COMMENT = '#5a5a61';
const KEYWORD = '#9547c0';
const PROPERTY = '#1848d2';
const STRING = '#236762';

const nebariSyntaxSettings = [
  {
    scope: ['punctuation', 'meta.brace', 'meta.delimiter', 'keyword.operator'],
    settings: { foreground: PUNCTUATION },
  },
  {
    scope: ['comment', 'punctuation.definition.comment'],
    settings: { foreground: COMMENT },
  },
  {
    scope: ['keyword', 'storage', 'storage.type', 'support.type'],
    settings: { foreground: KEYWORD },
  },
  {
    scope: [
      'variable.other.enummember',
      'meta.object-literal.key',
      'support.type.property-name',
      'entity.name.tag',
    ],
    settings: { foreground: PROPERTY },
  },
  {
    scope: [
      'string',
      'string.quoted',
      'string.template',
      'constant.other.symbol',
    ],
    settings: { foreground: STRING },
  },
];

export function customizeTheme(
  theme: ExpressiveCodeTheme,
): ExpressiveCodeTheme {
  if (theme.type !== 'light') return theme;
  theme.settings.push(...structuredClone(nebariSyntaxSettings));
  return theme;
}
