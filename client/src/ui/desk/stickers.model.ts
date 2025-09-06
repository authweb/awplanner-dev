// client/src/ui/desk/stickers.model.ts
export type BuiltinStickerKey =
  | 'assignee'
  | 'deadline'
  | 'priority'
  | 'recurring'
  | 'stopwatch'
  | 'timetracking'
  | 'timer'
  | 'sprint';

export type StickerKey = BuiltinStickerKey | `custom:${string}`;

export interface StickerItem {
  id: string;            // обязательный id
  key: StickerKey;
  title: string;
  enabled: boolean;
  system?: boolean;
  automations?: number;
}

const sys = (key: BuiltinStickerKey, title: string, enabled: boolean): StickerItem => ({
  id: `sys:${key}`,      // стабильный id для системных
  key,
  title,
  enabled,
  system: true,
  automations: 0,
});

export function defaultStickers(): StickerItem[] {
  return [
    sys('assignee',     'Исполнитель',  true),
    sys('deadline',     'Дедлайн',      true),
    sys('priority',     'Приоритет',    true),
    sys('timetracking', 'Таймтреккинг', false),
    sys('sprint',       'Спринт',       false),
  ];
}
export function findSticker(stickers: StickerItem[], key: StickerKey): StickerItem | undefined {
  return stickers.find(s => s.key === key);
}