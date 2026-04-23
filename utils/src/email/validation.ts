import type { EmailRenderResult } from "./types.js";

export const assertEmailRenderResult = (result: EmailRenderResult): void => {
  if (!result.subject?.trim()) {
    throw new Error("Rendered email subject is required.");
  }

  if (!result.html?.trim()) {
    throw new Error("Rendered email HTML is required.");
  }

  if (!result.text?.trim()) {
    throw new Error("Rendered email text is required.");
  }
};