import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("easymde/dist/easymde.min.css", () => ({}));

const easyMdeConstructor = vi.fn();

vi.mock("easymde", () => {
  return {
    default: function EasyMDEMock(options: any) {
      easyMdeConstructor(options);

      let currentValue = String(options?.initialValue ?? "");

      const wrapper = document.createElement("div");

      const instance = {
        codemirror: {
          on: vi.fn(),
          off: vi.fn(),
          setOption: vi.fn(),
          hasFocus: vi.fn(() => false),
          getWrapperElement: vi.fn(() => wrapper),
        },
        value: vi.fn((next?: string) => {
          if (typeof next === "string") {
            currentValue = next;
          }
          return currentValue;
        }),
        cleanup: vi.fn(),
        toTextArea: vi.fn(),
      };

      return instance as any;
    },
  };
});

import EasyMDEEditor from "../src/components/wysiwyg/EasyMDEEditor.js";

describe("EasyMDEEditor", () => {
  afterEach(() => {
    cleanup();
    easyMdeConstructor.mockClear();
  });

  it("does not recreate the editor when callback/option identities change", () => {
    const onEditorInstance1 = vi.fn();
    const onChange1 = vi.fn();

    const view = render(
      <EasyMDEEditor
        value="hello"
        onChange={onChange1}
        onEditorInstance={onEditorInstance1}
        options={{ status: false }}
      />,
    );

    expect(easyMdeConstructor).toHaveBeenCalledTimes(1);
    expect(onEditorInstance1).toHaveBeenCalledTimes(1);

    const onEditorInstance2 = vi.fn();
    const onChange2 = vi.fn();

    view.rerender(
      <EasyMDEEditor
        value="hello"
        onChange={onChange2}
        onEditorInstance={onEditorInstance2}
        options={{ status: false }}
      />,
    );

    // The root regression: changing callback/options identities should NOT destroy/recreate.
    expect(easyMdeConstructor).toHaveBeenCalledTimes(1);

    // We also don't want a second onEditorInstance call from a recreation loop.
    expect(onEditorInstance1).toHaveBeenCalledTimes(1);
    expect(onEditorInstance2).toHaveBeenCalledTimes(0);
  });
});
