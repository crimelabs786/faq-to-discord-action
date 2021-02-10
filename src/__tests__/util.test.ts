import { truncate } from "../util";
describe("truncate", () => {
  it("should return empty string if input text is empty", () => {
    const text = "";
    const result = truncate(text, 50, "see more");
    expect(result).toBe("");
  });

  it("should return original string if length is smaller than limit", () => {
    const text = "lorem ipsum";
    const result = truncate(text, 100, "see more");
    expect(result).toEqual(text);
  });

  it("should truncate the string if length is greater than limit", () => {
    const text = "lorem ipsum dolar sit amet";
    const limit = 15;
    const result = truncate(text, limit, "see more");
    expect(result).toEqual("loremsee more");
    expect(result.length).toBeLessThanOrEqual(limit);
  });
});
