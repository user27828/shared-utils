describe("Functions Import Test", () => {
  it("should import functions correctly", async () => {
    const functions = await import(
      "/home/marc314/work/misc/shared-utils/utils/src/functions.ts"
    );
    expect(functions.formatFileSize).toBeDefined();
    expect(typeof functions.formatFileSize).toBe("function");
    console.log("Available exports:", Object.keys(functions));
  });
});
