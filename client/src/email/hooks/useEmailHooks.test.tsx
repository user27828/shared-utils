// @vitest-environment jsdom

import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useEmailTemplatePreview } from "./useEmailTemplatePreview.js";
import { useEmailTemplates } from "./useEmailTemplates.js";

describe("email hooks client configuration", () => {
  const createFetch = (label: string) => {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/preview")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              template: {
                uid: "auth/password-reset",
                name: "Password Reset",
                category: "auth",
                description: "Recovery email",
                sendScenarios: [label],
                fixtureCount: 1,
                previewFixtures: [
                  {
                    uid: "default",
                    label: "Default",
                  },
                ],
              },
              fixtureUid: "default",
              subject: `${label} subject`,
              html: `<p>${label}</p>`,
              text: `${label} text`,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/auth%2Fpassword-reset")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              uid: "auth/password-reset",
              name: "Password Reset",
              category: "auth",
              description: "Recovery email",
              sendScenarios: [label],
              fixtureCount: 1,
              previewFixtures: [
                {
                  uid: "default",
                  label: "Default",
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              uid: `${label}/template`,
              name: `${label} Template`,
              category: "transactional",
              description: `${label} list`,
              sendScenarios: [label],
              fixtureCount: 1,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("useEmailTemplates respects updated clientConfig values", async () => {
    const firstFetch = createFetch("first");
    const secondFetch = createFetch("second");

    const { result, rerender } = renderHook(
      ({ fetchFn, baseUrl }) => {
        return useEmailTemplates({
          clientConfig: {
            fetchFn,
            baseUrl,
          },
        });
      },
      {
        initialProps: {
          fetchFn: firstFetch,
          baseUrl: "/api/admin/email/templates-a",
        },
      },
    );

    await waitFor(() => {
      expect(result.current.templates[0]?.uid).toBe("first/template");
    });

    rerender({
      fetchFn: secondFetch,
      baseUrl: "/api/admin/email/templates-b",
    });

    await waitFor(() => {
      expect(result.current.templates[0]?.uid).toBe("second/template");
    });

    expect(firstFetch).toHaveBeenCalledWith(
      "/api/admin/email/templates-a",
      expect.any(Object),
    );
    expect(secondFetch).toHaveBeenCalledWith(
      "/api/admin/email/templates-b",
      expect.any(Object),
    );
  });

  test("useEmailTemplatePreview respects updated clientConfig values", async () => {
    const firstFetch = createFetch("first");
    const secondFetch = createFetch("second");

    const { result, rerender } = renderHook(
      ({ fetchFn, baseUrl }) => {
        return useEmailTemplatePreview({
          templateUid: "auth/password-reset",
          clientConfig: {
            fetchFn,
            baseUrl,
          },
        });
      },
      {
        initialProps: {
          fetchFn: firstFetch,
          baseUrl: "/api/admin/email/templates-a",
        },
      },
    );

    await waitFor(() => {
      expect(result.current.preview?.subject).toBe("first subject");
    });

    rerender({
      fetchFn: secondFetch,
      baseUrl: "/api/admin/email/templates-b",
    });

    await waitFor(() => {
      expect(result.current.preview?.subject).toBe("second subject");
    });

    expect(firstFetch).toHaveBeenCalledWith(
      "/api/admin/email/templates-a/auth%2Fpassword-reset",
      expect.any(Object),
    );
    expect(secondFetch).toHaveBeenCalledWith(
      "/api/admin/email/templates-b/auth%2Fpassword-reset",
      expect.any(Object),
    );
  });
});