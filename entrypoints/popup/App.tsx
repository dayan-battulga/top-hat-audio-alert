import {
  type ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AudioLines,
  BellRing,
  Check,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Moon,
  Music4,
  PlayCircle,
  Settings2,
  Sparkles,
  SunMedium,
  Upload,
  Volume1,
  Volume2,
  X,
} from 'lucide-react';
import {
  MAX_CUSTOM_SOUND_BYTES,
  MAX_SOUND_LIBRARY_SIZE,
  addCustomSound,
  alertSettingsItem,
  findSoundById,
  getAvailableBuiltinSounds,
  isMp3File,
  normalizeAlertSettings,
  readAlertSettings,
  removeSound,
  restoreBuiltinSounds,
  setActiveSound,
  setAlertsEnabled,
  setAlertVolume,
  type BuiltinSoundPreset,
  type AlertSettings,
  type AlertSound,
} from '@/lib/alert-settings';
import {
  normalizePopupTheme,
  popupThemeItem,
  readPopupTheme,
  setPopupTheme,
  type PopupTheme,
} from '@/lib/popup-theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const GITHUB_REPO_URL = 'https://github.com/dayan-battulga/tophat-tool';
const SHELL_CARD_CLASS =
  'h-full rounded-[16px] border border-transparent bg-white shadow-[0_14px_28px_rgba(108,63,227,0.06)] dark:border-[#312841] dark:bg-[#17131f] dark:shadow-[0_18px_34px_rgba(5,3,11,0.36)]';
const ICON_BUTTON_CLASS =
  'size-9 rounded-lg text-[#867d98] hover:bg-[#f4efff] hover:text-[#4211c7] dark:text-[#ada5c0] dark:hover:bg-[#2c2538] dark:hover:text-[#f4eeff]';
const POPOVER_PANEL_CLASS =
  'rounded-[14px] border-[#e6d8ff] bg-white p-4 shadow-[0_16px_32px_rgba(94,23,235,0.12)] dark:border-[#3b304a] dark:bg-[#1d1827] dark:shadow-[0_18px_36px_rgba(5,3,11,0.46)]';
const PRIMARY_ACTION_BUTTON_CLASS =
  'h-14 rounded-[12px] bg-[#4211c7] text-base font-semibold text-white shadow-[0_12px_22px_rgba(66,17,199,0.24)] hover:bg-[#360ea4] dark:bg-[#5a34d2] dark:shadow-[0_14px_24px_rgba(9,4,23,0.44)] dark:hover:bg-[#4d29bf]';
const SOUND_MENU_VISIBLE_COUNT = 3;
const SOUND_MENU_ROW_HEIGHT = 56;
const SOUND_MENU_SEPARATOR_HEIGHT = 1;
const SOUND_MENU_PADDING = 8;

const SOUND_ICON_BY_PRESET: Record<BuiltinSoundPreset, LucideIcon> = {
  chime: Sparkles,
  bell: BellRing,
  pulse: Activity,
};

function App() {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [theme, setTheme] = useState<PopupTheme>('light');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSoundMenuOpen, setIsSoundMenuOpen] = useState(false);
  const [previewingSoundId, setPreviewingSoundId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    void readAlertSettings()
      .then((loadedSettings) => {
        if (isMounted) {
          setSettings(loadedSettings);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
        }
      });

    const unwatch = alertSettingsItem.watch((nextSettings) => {
      if (isMounted) {
        setSettings(normalizeAlertSettings(nextSettings));
      }
    });

    return () => {
      isMounted = false;
      unwatch();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void readPopupTheme()
      .then((loadedTheme) => {
        if (isMounted) {
          setTheme(loadedTheme);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTheme('light');
        }
      });

    const unwatch = popupThemeItem.watch((nextTheme) => {
      if (isMounted) {
        setTheme(normalizePopupTheme(nextTheme));
      }
    });

    return () => {
      isMounted = false;
      unwatch();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const clearMessages = () => {
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const handleThemeToggle = () => {
    const previousTheme = theme;
    const nextTheme = previousTheme === 'dark' ? 'light' : 'dark';

    setTheme(nextTheme);

    void setPopupTheme(nextTheme).catch((error: unknown) => {
      setTheme(previousTheme);
      setErrorMessage(getErrorMessage(error));
    });
  };

  if (!settings) {
    return <LoadingState />;
  }

  const selectedSound =
    findSoundById(settings, settings.activeSoundId) ?? settings.sounds[0];
  const volumePercent = Math.round(settings.volume * 100);
  const availableBuiltins = getAvailableBuiltinSounds(settings);
  const soundLimitReached = settings.sounds.length >= MAX_SOUND_LIBRARY_SIZE;
  const canRemoveSounds = settings.sounds.length > 1;
  const canRestoreDefaults =
    availableBuiltins.length > 0 &&
    settings.sounds.length + availableBuiltins.length <= MAX_SOUND_LIBRARY_SIZE;
  const soundsNeededForRestore = Math.max(
    0,
    settings.sounds.length + availableBuiltins.length - MAX_SOUND_LIBRARY_SIZE,
  );
  const helperMessage = getHelperMessage({
    enabled: settings.enabled,
    errorMessage,
    soundLimitReached,
    statusMessage,
  });

  const handleAlertsEnabledChange = (enabled: boolean) => {
    clearMessages();
    setSettings((currentSettings) =>
      currentSettings ? { ...currentSettings, enabled } : currentSettings,
    );

    void setAlertsEnabled(enabled).catch((error: unknown) => {
      setErrorMessage(getErrorMessage(error));
    });
  };

  const handleRestoreDefaults = () => {
    clearMessages();

    void restoreBuiltinSounds()
      .then(() => {
        setStatusMessage(
          `Restored ${availableBuiltins.length} default ${
            availableBuiltins.length === 1 ? 'sound' : 'sounds'
          }.`,
        );
      })
      .catch((error: unknown) => {
        setErrorMessage(getErrorMessage(error));
      });
  };

  const handleVolumeChange = (values: number[]) => {
    const nextVolume = (values[0] ?? volumePercent) / 100;

    setSettings((currentSettings) =>
      currentSettings ? { ...currentSettings, volume: nextVolume } : currentSettings,
    );
    clearMessages();

    void setAlertVolume(nextVolume).catch((error: unknown) => {
      setErrorMessage(getErrorMessage(error));
    });
  };

  const handleSelectSound = (sound: AlertSound) => {
    if (sound.id === selectedSound.id) {
      setIsSoundMenuOpen(false);
      return;
    }

    clearMessages();
    setSettings((currentSettings) =>
      currentSettings ? { ...currentSettings, activeSoundId: sound.id } : currentSettings,
    );
    setIsSoundMenuOpen(false);

    void setActiveSound(sound.id).catch((error: unknown) => {
      setErrorMessage(getErrorMessage(error));
    });
  };

  const handleRemoveSound = (sound: AlertSound) => {
    clearMessages();

    void removeSound(sound.id)
      .then(() => {
        setStatusMessage(`${sound.name} was removed.`);
      })
      .catch((error: unknown) => {
        setErrorMessage(getErrorMessage(error));
      });
  };

  const handlePreviewSelectedSound = () => {
    clearMessages();
    setPreviewingSoundId(selectedSound.id);

    void previewSound(selectedSound, settings.volume)
      .catch((error: unknown) => {
        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        setPreviewingSoundId(null);
      });
  };

  const handleUploadButtonClick = () => {
    if (!soundLimitReached) {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    currentSettings: AlertSettings,
  ) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    clearMessages();

    if (currentSettings.sounds.length >= MAX_SOUND_LIBRARY_SIZE) {
      setErrorMessage(`You can save up to ${MAX_SOUND_LIBRARY_SIZE} sounds.`);
      return;
    }

    if (!isMp3File(selectedFile)) {
      setErrorMessage('Only MP3 files are supported.');
      return;
    }

    if (selectedFile.size > MAX_CUSTOM_SOUND_BYTES) {
      setErrorMessage('This MP3 is too large. Please keep it under 1 MB.');
      return;
    }

    setIsUploading(true);

    try {
      const dataUrl = await readFileAsDataUrl(selectedFile);
      await addCustomSound({
        name: selectedFile.name,
        dataUrl,
        mimeType: selectedFile.type || 'audio/mpeg',
      });
      setIsSoundMenuOpen(false);
      setStatusMessage(`${selectedFile.name} was added to your library.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="h-full">
      <Card className={SHELL_CARD_CLASS}>
        <CardContent className="flex h-full flex-col gap-4 p-4">
          <input
            accept=".mp3,audio/mpeg"
            className="hidden"
            ref={fileInputRef}
            type="file"
            onChange={(event) => {
              void handleFileUpload(event, settings);
            }}
          />

          <PopupHeader
            availableBuiltins={availableBuiltins}
            canRestoreDefaults={canRestoreDefaults}
            onAlertsEnabledChange={handleAlertsEnabledChange}
            onRestoreDefaults={handleRestoreDefaults}
            onThemeToggle={handleThemeToggle}
            settings={settings}
            soundsNeededForRestore={soundsNeededForRestore}
            theme={theme}
          />

          <VolumeCardSection
            volumePercent={volumePercent}
            onVolumeChange={handleVolumeChange}
          />

          <SoundPickerSection
            canRemoveSounds={canRemoveSounds}
            isOpen={isSoundMenuOpen}
            selectedSound={selectedSound}
            settings={settings}
            onOpenChange={setIsSoundMenuOpen}
            onRemoveSound={handleRemoveSound}
            onSelectSound={handleSelectSound}
          />

          <ActionButtons
            isUploading={isUploading}
            previewingSoundId={previewingSoundId}
            selectedSound={selectedSound}
            soundLimitReached={soundLimitReached}
            onPreview={handlePreviewSelectedSound}
            onUpload={handleUploadButtonClick}
          />

          <StatusBanner
            errorMessage={errorMessage}
            helperMessage={helperMessage}
            statusMessage={statusMessage}
          />
        </CardContent>
      </Card>
    </main>
  );
}

export default App;

function LoadingState() {
  return (
    <main className="h-full">
      <Card className={SHELL_CARD_CLASS}>
        <CardContent className="grid h-full place-items-center p-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-lg bg-[#f5eeff] text-[#4211c7] dark:bg-[#2a2236] dark:text-[#ddcfff]">
              <AudioLines className="size-6" />
            </div>
            <h1 className="text-lg font-semibold text-[#2f2644] dark:text-[#f4f0ff]">
              Loading your sound library…
            </h1>
            <p className="text-sm text-[#8b83a0] dark:text-[#aaa2bd]">
              Preparing your Top Hat alert settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function PopupHeader({
  availableBuiltins,
  canRestoreDefaults,
  onAlertsEnabledChange,
  onRestoreDefaults,
  onThemeToggle,
  settings,
  soundsNeededForRestore,
  theme,
}: {
  availableBuiltins: AlertSound[];
  canRestoreDefaults: boolean;
  onAlertsEnabledChange: (enabled: boolean) => void;
  onRestoreDefaults: () => void;
  onThemeToggle: () => void;
  settings: AlertSettings;
  soundsNeededForRestore: number;
  theme: PopupTheme;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-[#f0e7ff] pb-4 dark:border-[#342b43]">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-lg bg-[#f3ecff] text-[#4211c7] dark:bg-[#2a2236] dark:text-[#ddcfff]">
          <AudioLines className="size-6" />
        </div>
        <div>
          <h1 className="text-[1.15rem] font-bold tracking-[-0.02em] text-[#4211c7] dark:text-[#f3eeff]">
            Top Hat Audio
          </h1>
          <p className="text-xs text-[#9188a5] dark:text-[#aaa2bd]">Question alerts</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggleButton theme={theme} onToggle={onThemeToggle} />
        <SettingsPopover
          availableBuiltins={availableBuiltins}
          canRestoreDefaults={canRestoreDefaults}
          enabled={settings.enabled}
          onAlertsEnabledChange={onAlertsEnabledChange}
          onRestoreDefaults={onRestoreDefaults}
          soundsNeededForRestore={soundsNeededForRestore}
        />
        <InfoPopover />
      </div>
    </header>
  );
}

function ThemeToggleButton({
  theme,
  onToggle,
}: {
  theme: PopupTheme;
  onToggle: () => void;
}) {
  const Icon = theme === 'dark' ? SunMedium : Moon;

  return (
    <Button
      className={ICON_BUTTON_CLASS}
      size="icon"
      type="button"
      variant="ghost"
      onClick={onToggle}
    >
      <Icon className="size-5" />
      <span className="sr-only">
        {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </Button>
  );
}

function SettingsPopover({
  availableBuiltins,
  canRestoreDefaults,
  enabled,
  onAlertsEnabledChange,
  onRestoreDefaults,
  soundsNeededForRestore,
}: {
  availableBuiltins: AlertSound[];
  canRestoreDefaults: boolean;
  enabled: boolean;
  onAlertsEnabledChange: (enabled: boolean) => void;
  onRestoreDefaults: () => void;
  soundsNeededForRestore: number;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={ICON_BUTTON_CLASS}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Settings2 className="size-5" />
          <span className="sr-only">Open settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className={cn('w-[292px]', POPOVER_PANEL_CLASS)}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[#2f2644] dark:text-[#f3eeff]">
              Alert settings
            </h2>
            <p className="text-xs leading-5 text-[#8c83a0] dark:text-[#a79fba]">
              Pause automatic Top Hat sounds or restore the default presets.
            </p>
          </div>

          <Separator className="bg-[#f0e7ff] dark:bg-[#362d46]" />

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#2f2644] dark:text-[#f3eeff]">
                Enable alerts
              </p>
              <p className="text-xs leading-5 text-[#8c83a0] dark:text-[#a79fba]">
                Preview still works even when alerts are paused.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={onAlertsEnabledChange} />
          </div>

          <div className="rounded-lg bg-[#faf7ff] p-3 dark:bg-[#241d2f]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#2f2644] dark:text-[#f3eeff]">
                  Restore default sounds
                </p>
                <Button
                  className="rounded-md border-[#d9c8ff] px-3 text-[#4211c7] hover:bg-[#f1e8ff] dark:border-[#4b3c64] dark:text-[#ddcfff] dark:hover:bg-[#30273d]"
                  disabled={!canRestoreDefaults}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={onRestoreDefaults}
                >
                  Restore
                </Button>
              </div>
              <p className="text-xs leading-5 text-[#8c83a0] dark:text-[#a79fba]">
                {getRestoreMessage({
                  availableBuiltins,
                  canRestoreDefaults,
                  soundsNeededForRestore,
                })}
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={ICON_BUTTON_CLASS}
          size="icon"
          type="button"
          variant="ghost"
        >
          <CircleHelp className="size-5" />
          <span className="sr-only">Open info</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className={cn('w-[280px]', POPOVER_PANEL_CLASS)}>
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[#2f2644] dark:text-[#f3eeff]">
              About this extension
            </h2>
            <p className="text-xs leading-5 text-[#8c83a0] dark:text-[#a79fba]">
              Top Hat Audio Alert watches your classroom page and plays your
              chosen sound when a new question appears.
            </p>
          </div>
          <Separator className="bg-[#f0e7ff] dark:bg-[#362d46]" />
          <Button
            asChild
            className="h-auto justify-start rounded-2xl px-0 py-0 text-[#4211c7] hover:bg-transparent hover:text-[#360ea4] dark:text-[#ddcfff] dark:hover:text-white"
            variant="ghost"
          >
            <a href={GITHUB_REPO_URL} rel="noreferrer" target="_blank">
              View GitHub repository
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VolumeCardSection({
  volumePercent,
  onVolumeChange,
}: {
  volumePercent: number;
  onVolumeChange: (values: number[]) => void;
}) {
  return (
    <Card className="rounded-[14px] border-[#dbcaf9] bg-[#f6efff] shadow-none dark:border-[#3c3250] dark:bg-[#221b2d]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[0.82rem] font-semibold tracking-[0.16em] text-[#5d566e] uppercase dark:text-[#c0b8d1]">
               Volume
            </p>
          </div>
          <span className="text-[1.2rem] leading-none font-semibold text-[#4211c7] dark:text-[#e5d8ff]">
            {volumePercent}%
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Volume1 className="size-5 shrink-0 text-[#9389a5] dark:text-[#b2abc3]" />
          <Slider
            className="w-full"
            defaultValue={[volumePercent]}
            id="volume-slider"
            max={100}
            min={0}
            step={1}
            value={[volumePercent]}
            onValueChange={onVolumeChange}
          />
          <Volume2 className="size-5 shrink-0 text-[#9389a5] dark:text-[#b2abc3]" />
        </div>
      </CardContent>
    </Card>
  );
}

function SoundPickerSection({
  canRemoveSounds,
  isOpen,
  selectedSound,
  settings,
  onOpenChange,
  onRemoveSound,
  onSelectSound,
}: {
  canRemoveSounds: boolean;
  isOpen: boolean;
  selectedSound: AlertSound;
  settings: AlertSettings;
  onOpenChange: (open: boolean) => void;
  onRemoveSound: (sound: AlertSound) => void;
  onSelectSound: (sound: AlertSound) => void;
}) {
  return (
    <section className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.98rem] font-semibold text-[#4f4861] dark:text-[#ece6ff]">
          Selected Sound
        </p>
        <p className="text-xs font-medium text-[#8b83a0] dark:text-[#aaa2bd]">
          {settings.sounds.length}/{MAX_SOUND_LIBRARY_SIZE} saved
        </p>
      </div>

      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <SoundPickerTrigger isOpen={isOpen} selectedSound={selectedSound} />
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-[12px] border-[#e4daf8] bg-white p-0 shadow-[0_12px_22px_rgba(108,63,227,0.08)] dark:border-[#3b314d] dark:bg-[#1d1827] dark:shadow-[0_16px_28px_rgba(5,3,11,0.42)]"
        >
          <Card className="overflow-hidden rounded-[12px] border-0 bg-transparent shadow-none">
            <CardContent className="p-0">
              <ScrollArea
                className="rounded-[inherit]"
                style={{
                  height: getSoundMenuMaxHeight(settings.sounds.length),
                }}
              >
                <div className="p-0">
                  {settings.sounds.map((sound, index) => (
                    <SoundMenuItem
                      canRemoveSounds={canRemoveSounds}
                      isActive={sound.id === selectedSound.id}
                      isLastItem={index === settings.sounds.length - 1}
                      key={sound.id}
                      sound={sound}
                      onRemove={onRemoveSound}
                      onSelect={onSelectSound}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </section>
  );
}

type SoundPickerTriggerProps = {
  isOpen: boolean;
  selectedSound: AlertSound;
} & ComponentPropsWithoutRef<typeof Button>;

const SoundPickerTrigger = forwardRef<HTMLButtonElement, SoundPickerTriggerProps>(
  ({ isOpen, selectedSound, ...props }, ref) => {
    return (
      <Button
        className="h-[60px] w-full justify-between rounded-[10px] border-[#e4daf8] bg-white px-3.5 py-2 text-left text-[#2f2644] shadow-[0_6px_14px_rgba(108,63,227,0.05)] hover:bg-[#fbf8ff] dark:border-[#3b314d] dark:bg-[#17131f] dark:text-[#f3eeff] dark:hover:bg-[#201a2b]"
        ref={ref}
        variant="outline"
        {...props}
      >
        <div className="flex min-w-0 items-center gap-3">
          <SoundIcon
            sound={selectedSound}
            accentClassName="bg-[#f1e8ff] text-[#4211c7] dark:bg-[#2b2337] dark:text-[#dfd2ff]"
            className="size-[18px]"
            containerClassName="size-9"
          />
          <div className="min-w-0">
            <p className="truncate text-[0.96rem] font-medium text-[#2f2644] dark:text-[#f3eeff]">
              {selectedSound.name}
            </p>
            <p className="truncate text-xs text-[#8b83a0] dark:text-[#aaa2bd]">
              {getSoundKindLabel(selectedSound)}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-[#8d84a0] transition-transform duration-200 dark:text-[#b1aac2]',
            isOpen && 'rotate-180',
          )}
        />
      </Button>
    );
  },
);
SoundPickerTrigger.displayName = 'SoundPickerTrigger';

function SoundMenuItem({
  canRemoveSounds,
  isActive,
  isLastItem,
  sound,
  onRemove,
  onSelect,
}: {
  canRemoveSounds: boolean;
  isActive: boolean;
  isLastItem: boolean;
  sound: AlertSound;
  onRemove: (sound: AlertSound) => void;
  onSelect: (sound: AlertSound) => void;
}) {
  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2.5 px-2.5 py-2.5 transition-colors',
          isActive
            ? 'bg-[#f6efff] dark:bg-[#2a2236]'
            : 'bg-white hover:bg-[#fbf8ff] dark:bg-[#1d1827] dark:hover:bg-[#272033]',
        )}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          type="button"
          onClick={() => {
            onSelect(sound);
          }}
        >
          <SoundIcon
            sound={sound}
            accentClassName={cn(
              'bg-[#f7f3ff] text-[#8f84a8] dark:bg-[#2a2236] dark:text-[#b4acc8]',
              isActive && 'bg-[#efe3ff] text-[#4211c7] dark:bg-[#362b4a] dark:text-[#e0d5ff]',
            )}
            className="size-4"
            containerClassName="size-[34px]"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9rem] font-medium text-[#2f2644] dark:text-[#f3eeff]">
              {sound.name}
            </p>
            <p className="truncate text-xs text-[#8b83a0] dark:text-[#aaa2bd]">
              {getSoundKindLabel(sound)}
            </p>
          </div>

          {isActive ? (
            <Check className="size-4 shrink-0 text-[#4211c7] dark:text-[#e0d5ff]" />
          ) : null}
        </button>

        <Button
          className="size-8 shrink-0 rounded-md text-[#968ca9] hover:bg-[#efe6ff] hover:text-[#4211c7] dark:text-[#b1aac2] dark:hover:bg-[#32293f] dark:hover:text-[#f3eeff]"
          disabled={!canRemoveSounds}
          size="icon"
          type="button"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(sound);
          }}
        >
          <X className="size-4" />
          <span className="sr-only">Remove {sound.name}</span>
        </Button>
      </div>

      {!isLastItem ? <Separator className="bg-[#f1e8ff] dark:bg-[#342b43]" /> : null}
    </div>
  );
}

function ActionButtons({
  isUploading,
  previewingSoundId,
  selectedSound,
  soundLimitReached,
  onPreview,
  onUpload,
}: {
  isUploading: boolean;
  previewingSoundId: string | null;
  selectedSound: AlertSound;
  soundLimitReached: boolean;
  onPreview: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Button
        className={PRIMARY_ACTION_BUTTON_CLASS}
        disabled={isUploading || soundLimitReached}
        type="button"
        onClick={onUpload}
      >
        <Upload className="size-5" />
        {isUploading ? 'Uploading…' : 'Upload MP3'}
      </Button>

      <Button
        className={PRIMARY_ACTION_BUTTON_CLASS}
        disabled={previewingSoundId === selectedSound.id}
        type="button"
        onClick={onPreview}
      >
        <PlayCircle className="size-5" />
        {previewingSoundId === selectedSound.id ? 'Playing…' : 'Preview'}
      </Button>
    </div>
  );
}

function StatusBanner({
  errorMessage,
  helperMessage,
  statusMessage,
}: {
  errorMessage: string | null;
  helperMessage: string;
  statusMessage: string | null;
}) {
  return (
    <div
      className={cn(
        'grid h-14 content-center overflow-hidden rounded-[12px] border px-3 text-sm leading-5',
        errorMessage
          ? 'border-[#f4c4cb] bg-[#fff4f6] text-[#b5445e] dark:border-[#6f4450] dark:bg-[#3a1f28] dark:text-[#ffb7c4]'
            : statusMessage
              ? 'border-[#d7c9f5] bg-[#f8f4ff] text-[#4211c7] dark:border-[#4a3b64] dark:bg-[#241d2f] dark:text-[#e0d5ff]'
              : 'border-[#eee4ff] bg-[#fcf9ff] text-[#8c83a0] dark:border-[#342b43] dark:bg-[#201a29] dark:text-[#b1aac2]',
      )}
    >
      <p className="max-h-10 overflow-hidden">{helperMessage}</p>
    </div>
  );
}

function SoundIcon({
  sound,
  accentClassName,
  className,
  containerClassName,
}: {
  sound: AlertSound;
  accentClassName?: string;
  className?: string;
  containerClassName?: string;
}) {
  const Icon = getSoundIcon(sound);

  return (
    <span
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-lg',
        containerClassName,
        accentClassName,
      )}
    >
      <Icon className={className} />
    </span>
  );
}

async function previewSound(sound: AlertSound, volume: number) {
  const response = await browser.runtime.sendMessage({
    type: 'preview-sound',
    soundId: sound.id,
    volume,
  });

  if (response?.ok === false) {
    throw new Error(
      typeof response.error === 'string' ? response.error : 'Preview failed.',
    );
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read the selected MP3.'));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Unable to read the selected MP3.'));
    };

    reader.readAsDataURL(file);
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

function getSoundIcon(sound: AlertSound): LucideIcon {
  if (sound.kind === 'builtin' && sound.preset) {
    return SOUND_ICON_BY_PRESET[sound.preset];
  }

  return Music4;
}

function getSoundKindLabel(sound: AlertSound): string {
  if (sound.kind === 'builtin' && sound.preset) {
    return `${capitalize(sound.preset)} preset`;
  }

  return 'Custom MP3';
}

function getRestoreMessage({
  availableBuiltins,
  canRestoreDefaults,
  soundsNeededForRestore,
}: {
  availableBuiltins: AlertSound[];
  canRestoreDefaults: boolean;
  soundsNeededForRestore: number;
}): string {
  if (availableBuiltins.length === 0) {
    return 'All built-in alert sounds are already in your library.';
  }

  if (canRestoreDefaults) {
    return `Re-add ${availableBuiltins.map((sound) => sound.name).join(', ')}.`;
  }

  return `Remove ${soundsNeededForRestore} ${
    soundsNeededForRestore === 1 ? 'sound' : 'sounds'
  } to restore every built-in preset.`;
}

function getHelperMessage({
  enabled,
  errorMessage,
  soundLimitReached,
  statusMessage,
}: {
  enabled: boolean;
  errorMessage: string | null;
  soundLimitReached: boolean;
  statusMessage: string | null;
}): string {
  if (errorMessage) {
    return errorMessage;
  }

  if (statusMessage) {
    return statusMessage;
  }

  if (!enabled) {
    return 'Automatic alerts are paused. Preview still works while alerts are off.';
  }

  if (soundLimitReached) {
    return 'Your library is full. Remove a sound from the dropdown to add another MP3.';
  }

  return `Upload MP3 alerts under ${Math.round(
    MAX_CUSTOM_SOUND_BYTES / 1024,
  )} KB. New Top Hat questions will play your selected sound automatically.`;
}

function getSoundMenuMaxHeight(soundCount: number): number {
  const visibleCount = Math.min(soundCount, SOUND_MENU_VISIBLE_COUNT);

  if (visibleCount <= 0) {
    return SOUND_MENU_PADDING;
  }

  return (
    visibleCount * SOUND_MENU_ROW_HEIGHT +
    (visibleCount - 1) * SOUND_MENU_SEPARATOR_HEIGHT +
    SOUND_MENU_PADDING
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
