import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WysiwygEditor, {
  type WysiwygChangeContext,
} from "../src/components/wysiwyg/WysiwygEditor.js";
import type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";

describe("WysiwygEditor adapter boundary", () => {
  it("forwards selected adapter changes and instance context", () => {
    const instance = { name: "easy-mde" };
    const onChange =
      vi.fn<(value: string, context: WysiwygChangeContext) => void>();
    const onEditorInstance = vi.fn();

    const Adapter: React.FC<WysiwygEditorAdapterProps> = ({
      value,
      onChange: adapterOnChange,
      onEditorInstance: adapterOnEditorInstance,
    }) => (
      <div>
        <output>{value}</output>
        <button
          onClick={() => {
            adapterOnEditorInstance?.(instance);
            adapterOnChange?.("updated", { type: "change" });
          }}
        >
          update
        </button>
      </div>
    );

    render(
      <WysiwygEditor
        editor="easymde"
        adapters={{ easymde: Adapter }}
        value="initial"
        onChange={onChange}
        onEditorInstance={onEditorInstance}
      />,
    );

    expect(screen.getByText("initial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "update" }));

    expect(onEditorInstance).toHaveBeenCalledWith(instance, {
      editor: "easymde",
    });
    expect(onChange).toHaveBeenCalledWith("updated", {
      editor: "easymde",
      instance,
      rawEvent: { type: "change" },
    });
  });

  it("shows a configuration alert when the selected adapter is absent", () => {
    render(<WysiwygEditor editor="ckeditor" adapters={{}} value="content" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No WYSIWYG adapter is configured for ckeditor.",
    );
  });
});
