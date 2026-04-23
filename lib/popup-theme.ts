export type PopupTheme = 'light' | 'dark';

export const POPUP_THEME_STORAGE_KEY = 'local:popup-theme';

export const popupThemeItem = storage.defineItem<PopupTheme>(POPUP_THEME_STORAGE_KEY, {
  init: () => 'light',
});

export function normalizePopupTheme(
  value: PopupTheme | null | undefined,
): PopupTheme {
  return value === 'dark' ? 'dark' : 'light';
}

export async function readPopupTheme(): Promise<PopupTheme> {
  const storedValue = await popupThemeItem.getValue();
  const normalizedTheme = normalizePopupTheme(storedValue);

  if (storedValue !== normalizedTheme) {
    await popupThemeItem.setValue(normalizedTheme);
  }

  return normalizedTheme;
}

export async function setPopupTheme(theme: PopupTheme): Promise<PopupTheme> {
  const normalizedTheme = normalizePopupTheme(theme);
  await popupThemeItem.setValue(normalizedTheme);
  return normalizedTheme;
}
