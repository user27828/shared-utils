# WYSIWYG Setup Guide (Unified `WysiwygEditor`)

This guide documents the consolidated methodology for using WYSIWYG editors from `@user27828/shared-utils/client/wysiwyg`.

The recommended integration is the **unified default export**:

- `WysiwygEditor` (default export): one component with a consistent API
- Supports `editor="tinymce" | "ckeditor" | "easymde"` (default: `tinymce`)
- Keeps the **native content format** per editor:
  - TinyMCE: HTML
  - CKEditor 5 Classic: HTML
  - EasyMDE: Markdown

Named editor components (`TinyMceEditor`, `CKEditor5Classic`, `EasyMDEEditor`, `MDXEditor`) are still exported for backwards compatibility.

## Install (peer dependencies)

Only install the editor(s) you actually use.

```bash
# TinyMCE
yarn add @tinymce/tinymce-react tinymce

# CKEditor 5
yarn add ckeditor5 @ckeditor/ckeditor5-react

# EasyMDE
yarn add easymde

# MDXEditor (separate editor, not part of the unified factory)
yarn add @mdxeditor/editor
```

## Basic usage (unified)

```tsx
import React, { useState } from "react";
import WysiwygEditor from "@user27828/shared-utils/client/wysiwyg";

export function Example() {
  const [value, setValue] = useState("<p>Hello</p>");

  return (
    <WysiwygEditor
      editor="tinymce"
      value={value}
      height={420}
      onChange={(nextValue) => {
        setValue(nextValue);
      }}
    />
  );
}
```

### Shared props (normalized)

- `editor`: which editor implementation to use (`"tinymce" | "ckeditor" | "easymde"`)
- `value`: the editor content (HTML for TinyMCE/CKEditor, Markdown for EasyMDE)
- `onChange(value, ctx)`: change handler
  - `ctx.editor` tells you which editor emitted the change
  - `ctx.instance` contains the last editor instance received by `onEditorInstance`
- `readOnly`: read-only mode
- `height`: string/number height (normalized)
- `onEditorInstance(instance, ctx)`: get the underlying editor instance
- `canonicalizeUrl(url)`: applied to inserted URLs returned by pick/upload hooks
- `onPickAsset(request)`: unified “pick image/file/media” hook
- `onUploadImage(request)`: unified image upload hook
- `suspenseFallback`: optional React Suspense fallback while lazy-loading editor modules

## Asset insertion (files/images/media)

### `onPickAsset`

`onPickAsset` is the unified picker hook used by TinyMCE/CKEditor/EasyMDE.

```tsx
import type {
  WysiwygPickRequest,
  WysiwygPickResult,
} from "@user27828/shared-utils/client/wysiwyg";

const onPickAsset = async (
  request: WysiwygPickRequest,
): Promise<WysiwygPickResult | null> => {
  // request.kind: "image" | "file" | "media"
  // request.value: current content (HTML/Markdown depending on editor)

  // Open your picker UI and resolve.
  return {
    kind: request.kind,
    url: "https://example.com/asset.png",
    alt: request.kind === "image" ? "Example" : undefined,
    title: request.kind === "file" ? "Example file" : undefined,
    text: request.kind === "file" ? "Example file" : undefined,
  };
};
```

Notes:

- For EasyMDE:
  - `image` inserts Markdown image syntax
  - `file` inserts Markdown link syntax
  - `media` inserts a **plain link** (per project requirement)

### `onUploadImage`

`onUploadImage` is used by all supported editors, but the source payload differs:

- TinyMCE typically provides a `blob`
- CKEditor typically provides a `File`
- EasyMDE provides a `File`

The unified request supports both:

```tsx
import type { WysiwygImageUploadRequest } from "@user27828/shared-utils/client/wysiwyg";

const onUploadImage = async (request: WysiwygImageUploadRequest) => {
  const fileOrBlob = request.file ?? request.blob;
  if (!fileOrBlob) {
    throw new Error("No file/blob provided");
  }

  // Upload file/blob to your backend here.
  // Optionally call request.progress?.(0..100)

  return { url: "https://example.com/uploaded.png" };
};
```

## Editor-specific configuration

The unified component exposes per-editor configuration via these props:

- `tinymce={{ ... }}`
- `ckeditor={{ ... }}`
- `easymde={{ ... }}`

These are **overrides** for each underlying editor component (with the unified props removed so you don’t accidentally double-bind).

### TinyMCE (via unified)

```tsx
<WysiwygEditor
  editor="tinymce"
  value={html}
  onChange={(nextHtml) => {
    setHtml(nextHtml);
  }}
  tinymce={{
    init: {
      menubar: false,
      toolbar: "undo redo | bold italic | link image",
    },
  }}
/>
```

If you’re using Vite and TinyMCE skins are broken, see [TINYMCE_SETUP.md](./TINYMCE_SETUP.md).

### CKEditor 5 Classic (via unified)

```tsx
<WysiwygEditor
  editor="ckeditor"
  value={html}
  onChange={(nextHtml) => {
    setHtml(nextHtml);
  }}
  ckeditor={{
    config: {
      toolbar: {
        items: ["undo", "redo", "|", "bold", "italic", "link"],
      },
    },
  }}
/>
```

For CKEditor extensibility notes (plugins/toolbars/config merging), see [CKEDITOR_SETUP.md](./CKEDITOR_SETUP.md).

### EasyMDE (via unified)

```tsx
<WysiwygEditor
  editor="easymde"
  value={markdown}
  onChange={(nextMarkdown) => {
    setMarkdown(nextMarkdown);
  }}
  easymde={{
    options: {
      status: false,
      spellChecker: false,
    },
  }}
/>
```

## Backwards compatibility (named exports)

You can continue to use the original component exports:

```tsx
import {
  TinyMceEditor,
  CKEditor5Classic,
  EasyMDEEditor,
  MDXEditor,
} from "@user27828/shared-utils/client/wysiwyg";
```

When to prefer the unified editor:

- You want one consistent interface for HTML and Markdown editors.
- You want one consistent asset picker (`onPickAsset`) and upload hook (`onUploadImage`).
- You want to switch editors without rewriting parent components.

When to prefer direct editors:

- You rely on editor-specific callback shapes/events.
- You want to pass through every upstream prop without using the override objects.

## SSR / lazy loading notes

The WYSIWYG entrypoint lazily loads editor implementations so you don’t have to install all peer dependencies. In SSR environments (e.g. Next.js), you may still want to render it client-side only.

Example (Next.js dynamic import):

```tsx
import dynamic from "next/dynamic";

const WysiwygEditor = dynamic(
  () => import("@user27828/shared-utils/client/wysiwyg"),
  { ssr: false },
);
```
