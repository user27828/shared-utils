import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let currentContent = "";
let latestEditorProps: Record<string, any> | null = null;

const editorApi = {
  hasFocus: vi.fn(() => false),
  getContent: vi.fn(() => currentContent),
  setContent: vi.fn((next: string) => {
    currentContent = next;
  }),
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }),
});

vi.mock("@tinymce/tinymce-react", () => {
  return {
    Editor: (props: any) => {
      latestEditorProps = props;
      const previousInitialValueRef = React.useRef(props.initialValue);

      React.useEffect(() => {
        currentContent = String(props.initialValue ?? "");
        props.onInit?.(null, editorApi);
      }, []);

      React.useEffect(() => {
        if (previousInitialValueRef.current !== props.initialValue) {
          previousInitialValueRef.current = props.initialValue;
          currentContent = String(props.initialValue ?? "");
          editorApi.setContent(currentContent);
        }
      }, [props.initialValue]);

      return <div data-testid="tinymce-editor" />;
    },
  };
});

let TinyMceEditor: (props: Record<string, any>) => React.JSX.Element;

beforeAll(async () => {
  TinyMceEditor = (await import("../src/components/wysiwyg/TinyMceEditor.js"))
    .default;
});

describe("TinyMceEditor", () => {
  afterEach(() => {
    cleanup();
    currentContent = "";
    latestEditorProps = null;
    editorApi.hasFocus.mockReset();
    editorApi.hasFocus.mockReturnValue(false);
    editorApi.getContent.mockClear();
    editorApi.setContent.mockClear();
  });

  it("does not emit onChange for programmatic external value sync", async () => {
    const onChange = vi.fn();

    const view = render(
      <TinyMceEditor data="<p>alpha</p>" onChange={onChange} />,
    );

    view.rerender(<TinyMceEditor data="<p>beta</p>" onChange={onChange} />);

    await waitFor(() => {
      expect(editorApi.setContent).toHaveBeenCalledWith("<p>beta</p>");
    });

    act(() => {
      latestEditorProps?.onEditorChange?.("<p>beta</p>");
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("forwards user edits through onChange", () => {
    const onChange = vi.fn();

    render(<TinyMceEditor data="<p>alpha</p>" onChange={onChange} />);

    act(() => {
      currentContent = "<p>user edit</p>";
      latestEditorProps?.onEditorChange?.("<p>user edit</p>");
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null, {
      getData: expect.any(Function),
    });

    const editorLike = onChange.mock.calls[0]?.[1];
    expect(editorLike?.getData()).toBe("<p>user edit</p>");
  });

  it("forwards undo and redo events through onChange", () => {
    const onChange = vi.fn();

    const view = render(<TinyMceEditor data="<p>alpha</p>" onChange={onChange} />);

    act(() => {
      currentContent = "<p>beta</p>";
      latestEditorProps?.onEditorChange?.("<p>beta</p>");
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[1]?.getData()).toBe("<p>beta</p>");

    onChange.mockClear();
    view.rerender(<TinyMceEditor data="<p>beta</p>" onChange={onChange} />);

    act(() => {
      currentContent = "<p>alpha</p>";
      latestEditorProps?.onUndo?.(null, editorApi);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[1]?.getData()).toBe("<p>alpha</p>");

    onChange.mockClear();
    view.rerender(<TinyMceEditor data="<p>alpha</p>" onChange={onChange} />);

    act(() => {
      currentContent = "<p>beta</p>";
      latestEditorProps?.onRedo?.(null, editorApi);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[1]?.getData()).toBe("<p>beta</p>");
  });

  it("ignores stale prop updates after a newer local undo", () => {
    const onChange = vi.fn();

    const view = render(
      <TinyMceEditor data="<p>alpha</p>" onChange={onChange} />,
    );

    act(() => {
      currentContent = "<p>beta</p>";
      latestEditorProps?.onEditorChange?.("<p>beta</p>");
    });

    act(() => {
      currentContent = "<p>alpha</p>";
      latestEditorProps?.onUndo?.(null, editorApi);
    });

    editorApi.setContent.mockClear();

    view.rerender(<TinyMceEditor data="<p>beta</p>" onChange={onChange} />);

    expect(editorApi.setContent).not.toHaveBeenCalled();

    view.rerender(<TinyMceEditor data="<p>alpha</p>" onChange={onChange} />);

    expect(editorApi.setContent).not.toHaveBeenCalled();
  });

  it("still applies external overrides that do not match pending local values", async () => {
    const onChange = vi.fn();

    const view = render(
      <TinyMceEditor data="<p>alpha</p>" onChange={onChange} />,
    );

    act(() => {
      currentContent = "<p>beta</p>";
      latestEditorProps?.onEditorChange?.("<p>beta</p>");
    });

    act(() => {
      currentContent = "<p>alpha</p>";
      latestEditorProps?.onUndo?.(null, editorApi);
    });

    editorApi.setContent.mockClear();

    view.rerender(<TinyMceEditor data="<p>gamma</p>" onChange={onChange} />);

    await waitFor(() => {
      expect(editorApi.setContent).toHaveBeenCalledWith("<p>gamma</p>");
    });
  });
});