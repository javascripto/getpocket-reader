import type {
  AppTheme,
  ReaderFontFamily,
  ReaderPreferences,
  ReaderTheme,
} from '@/types';

export const READER_PREFERENCES_KEY = 'pocket-offline-reader-preferences-v1';

export const defaultReaderPreferences: ReaderPreferences = {
  theme: 'system',
  fontFamily: 'sans',
  fontSize: 14,
  lineHeight: 1.75,
  contentWidth: 760,
};

function isReaderTheme(value: unknown): value is ReaderTheme {
  return (
    value === 'light' ||
    value === 'dark' ||
    value === 'sepia' ||
    value === 'slate' ||
    value === 'system'
  );
}

export function resolveReaderTheme(
  theme: ReaderTheme,
  systemPrefersDark: boolean,
): AppTheme {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return theme;
}

function isReaderFontFamily(value: unknown): value is ReaderFontFamily {
  return value === 'sans' || value === 'serif' || value === 'mono';
}

export function loadReaderPreferences(): ReaderPreferences {
  try {
    const raw = localStorage.getItem(READER_PREFERENCES_KEY);
    if (!raw) {
      return defaultReaderPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<ReaderPreferences>;

    return {
      theme: isReaderTheme(parsed.theme)
        ? parsed.theme
        : defaultReaderPreferences.theme,
      fontFamily: isReaderFontFamily(parsed.fontFamily)
        ? parsed.fontFamily
        : defaultReaderPreferences.fontFamily,
      fontSize:
        typeof parsed.fontSize === 'number'
          ? Math.min(30, Math.max(10, parsed.fontSize))
          : defaultReaderPreferences.fontSize,
      lineHeight:
        typeof parsed.lineHeight === 'number'
          ? Math.min(2.2, Math.max(1.2, parsed.lineHeight))
          : defaultReaderPreferences.lineHeight,
      contentWidth:
        typeof parsed.contentWidth === 'number'
          ? Math.min(1100, Math.max(540, parsed.contentWidth))
          : defaultReaderPreferences.contentWidth,
    };
  } catch {
    return defaultReaderPreferences;
  }
}

export function readerThemeColors(theme: AppTheme) {
  switch (theme) {
    case 'dark':
      return {
        appBackground: '#161616',
        appText: '#f3f3f3',
        headerBackground: 'rgba(22, 22, 22, 0.95)',
        border: '#333333',
        cardBackground: '#1f1f1f',
        mutedText: '#b3b3b3',
        panelBackground: '#232323',
      };
    case 'sepia':
      return {
        appBackground: '#f4efe2',
        appText: '#3a2d21',
        headerBackground: 'rgba(244, 239, 226, 0.95)',
        border: '#d8cfbd',
        cardBackground: '#fff8ea',
        mutedText: '#7a6a55',
        panelBackground: '#efe6d4',
      };
    case 'slate':
      return {
        appBackground: '#e7edf3',
        appText: '#1f2937',
        headerBackground: 'rgba(231, 237, 243, 0.95)',
        border: '#c7d1de',
        cardBackground: '#f7fafc',
        mutedText: '#64748b',
        panelBackground: '#dde6ef',
      };
    default:
      return {
        appBackground: '#f7f7f5',
        appText: '#1f1f1f',
        headerBackground: 'rgba(247, 247, 245, 0.95)',
        border: '#e4e4de',
        cardBackground: '#ffffff',
        mutedText: '#63635e',
        panelBackground: '#efefea',
      };
  }
}

export function fontFamilyForReader(fontFamily: ReaderFontFamily): string {
  switch (fontFamily) {
    case 'serif':
      return "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";
    case 'mono':
      return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
    default:
      return "'Inter Variable', ui-sans-serif, system-ui, sans-serif";
  }
}
