import { describe, expect, jest, test } from "@jest/globals";
import { createFmStorage } from "../../src/fm/storage/storageFactory.js";
import type { FmStorageAdapter } from "../../src/fm/storage/FmStorageAdapter.js";

describe("FM explicit storage factories", () => {
  test("local creation never calls the optional vendor factory", async () => {
    const factory = jest.fn<() => Promise<FmStorageAdapter>>();
    const storage = await createFmStorage(
      { provider: "local", dataRootPath: process.cwd() },
      factory,
    );
    expect(storage.getProvider()).toBe("local");
    expect(factory).not.toHaveBeenCalled();
  });

  test("S3 requires explicit injection and forwards the validated configuration", async () => {
    const config = {
      provider: "s3" as const,
      s3Endpoint: "https://s3.example.com",
      s3AccessKeyId: "test",
      s3SecretAccessKey: "test",
    };
    await expect(createFmStorage(config)).rejects.toMatchObject({
      code: "FM_VALIDATION",
    });
    const adapter = { getProvider: () => "s3" } as FmStorageAdapter;
    const factory = jest.fn(async () => adapter);
    expect(await createFmStorage(config, factory)).toBe(adapter);
    expect(factory).toHaveBeenCalledWith(config);
  });
});
