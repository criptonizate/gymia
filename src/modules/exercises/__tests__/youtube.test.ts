import { describe, it, expect } from "vitest";
import { extractYouTubeId } from "../youtube";

describe("extractYouTubeId", () => {
  it("devuelve el id si es uno directo", () => {
    expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("lee youtube.com/watch?v=", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"),
    ).toBe("dQw4w9WgXcQ");
  });
  it("lee youtu.be/", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=xxx")).toBe(
      "dQw4w9WgXcQ",
    );
  });
  it("lee /shorts/", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });
  it("devuelve null para basura", () => {
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId("hola mundo")).toBeNull();
    expect(extractYouTubeId("https://google.com")).toBeNull();
  });
});
