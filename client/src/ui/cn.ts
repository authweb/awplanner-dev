// Служебная утилита объединения классов — НЕ React-компонент
export function cn(...cls: Array<string | false | null | undefined>): string {
  return cls.filter(Boolean).join(" ");
}
