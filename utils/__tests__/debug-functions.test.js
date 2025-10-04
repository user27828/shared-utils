import * as functions from "../src/functions.js";

describe("Functions Import Test", () => {
  it("should import functions correctly", () => {
    expect(functions.formatFileSize).toBeDefined();
    expect(typeof functions.formatFileSize).toBe("function");
    console.log("Available exports:", Object.keys(functions));
  });
});
