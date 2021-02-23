import { Collection, Message, TextChannel } from "discord.js";
export const MAX_INDICES_IN_AN_EMBED = 10;
export const MAX_TRUNCATE_LENGTH = 1700;
export class Color {
  private _next = 0;
  static readonly options = {
    orange: "#FF5733",
    green: "#33FF70",
    blue: "#3387FF",
    pink: "#FF7EFA",
    red: "#F95B74",
    purple: "#9975FF",
    cyan: "#92F5FF",
    yellow: "#FCEE74",
    darkGray: "#5B5B5B",
  };
  static random() {
    const values = Color.toValues();
    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
  }
  static toValues() {
    return Object.values(Color.options);
  }
  public next() {
    const values = Color.toValues();
    if (this._next >= values.length) {
      this._next = 0;
    }
    const color = values[this._next];
    this._next++;
    return color;
  }
}

export function truncate(text: string, max: number, suffix: string): string {
  return text.length < max
    ? text
    : `${text.substr(
        0,
        text.substr(0, max - suffix.length).lastIndexOf(" ")
      )}${suffix}`;
}

export function countMessagesRequired<T>(items: T[]) {
  const indexCount = Math.ceil(items.length / MAX_INDICES_IN_AN_EMBED);
  return indexCount + items.length + 1;
}

export function last<T>(items: T[]) {
  return items[items.length - 1];
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
