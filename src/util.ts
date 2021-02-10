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

/**
 *
 * @returns truncated version of text, with no word breaks
 * final output may be smaller than limit size
 *
 * @example
 * Here are a few simple example usages
 *
 * 1. when text length is smaller than limit
 *
 * ```
 * // returns "lorem ipsum"
 * truncate("lorem ipsum", 50, "see more")
 * ```
 *
 * 2. when text lengt is larger than limit
 *
 * ```
 * // return "losee more"
 * truncate("lorem ipsum", 10, "see more")
 * ```
 */
export function truncate(text: string, max: number, suffix: string): string {
  return text.length < max
    ? text
    : `${text.substr(
        0,
        text.substr(0, max - suffix.length).lastIndexOf(" ")
      )}${suffix}`;
}

/**
 *
 * @returns a number of messages need to be sent to Discord
 * for given n message embeds
 * Given a set of message embeds, we need to append few more messages
 * Which contain
 * - a list of those messages
 * - a footer message
 */
export function countMessagesRequired<T>(items: T[]): number {
  const indexCount = Math.ceil(items.length / MAX_INDICES_IN_AN_EMBED);
  return indexCount + items.length + 1;
}
