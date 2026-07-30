import { dictionary, type Lang } from "./dictionary";

export function t(lang: Lang, key: keyof typeof dictionary.en, ...args: (string | number)[]): string {
  const entry = dictionary[lang][key] ?? dictionary.en[key];
  return typeof entry === "function" ? entry(...args) : entry;
}
