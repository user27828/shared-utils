import { describe, expect, jest, test } from "@jest/globals";

import { CmsServiceCore } from "../../src/cms/CmsServiceCore.js";

describe("CmsServiceCore list safeguards", () => {
  test("clamps list limit and offset before delegating", async () => {
    const connector = {
      list: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 200,
        offset: 0,
      }),
    };
    const service = new CmsServiceCore({ connector: connector as any });

    await service.list({ limit: 999, offset: -5 });

    expect(connector.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200, offset: 0 }),
    );
  });

  test("clamps history limit and offset before delegating", async () => {
    const connector = {
      listHistory: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({ items: [], totalCount: 0 }),
    };
    const service = new CmsServiceCore({ connector: connector as any });

    await service.listHistory({ cmsUid: "cms-1", limit: 999, offset: -10 });

    expect(connector.listHistory).toHaveBeenCalledWith(
      expect.objectContaining({ cmsUid: "cms-1", limit: 200, offset: 0 }),
    );
  });
});
