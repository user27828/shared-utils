# CKEditor 5 (GPL) Setup Guide

This guide covers how to use the `CKEditor5Classic` component from `@user27828/shared-utils/client/wysiwyg`.

This integration is **self-hosted** using npm packages and is configured to use the **GPL** license key. It does not require any CKEditor cloud services.

## Prerequisites

Install the required peer dependencies in your consuming app:

```bash
yarn add ckeditor5 @ckeditor/ckeditor5-react
```

## Basic Usage

```tsx
import React, { useState } from "react";
import { CKEditor5Classic } from "@user27828/shared-utils/client/wysiwyg";

export const MyEditor = () => {
  const [html, setHtml] = useState("<p>Hello</p>");

  return (
    <CKEditor5Classic
      data={html}
      onChange={(_event, editor) => {
        setHtml(editor.getData());
      }}
      height={420}
    />
  );
};
```

## Features Included by Default

The default build used by `CKEditor5Classic` includes:

- Common formatting (bold/italic/underline, headings, lists, block quote, code)
- Tables
- Images with upload hook support
- Media embed
- Fullscreen
- Word count
- Paste-from-Markdown conversion (via CKEditor’s `PasteFromMarkdownExperimental`)

## File Picker Integration

`CKEditor5Classic` exposes a TinyMCE-like picker hook:

```ts
onPickFile?: (request: CKEditor5PickRequest) => Promise<CKEditor5PickResult | null>
```

- `request.meta.filetype` can be `"image" | "file" | "media"`.
- Returning `null` means “user cancelled”.

Example:

```tsx
<CKEditor5Classic
  data={html}
  onChange={(_event, editor) => {
    setHtml(editor.getData());
  }}
  onPickFile={async (request) => {
    if (request.meta.filetype === "media") {
      return {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        kind: "media",
      };
    }

    // You would typically open your own asset picker UI here.
    // Returning null indicates cancel.
    return null;
  }}
/>
```

## Image Upload Integration

To support pasting/dragging/selecting images, implement:

```ts
onUploadImage?: (request: CKEditor5ImageUploadRequest) => Promise<{ url: string }>
```

The request includes:

- `file`, `filename`, `mimeType`, `sizeBytes`
- `progress(percent)` callback (0–100)

Example:

```tsx
<CKEditor5Classic
  data={html}
  onChange={(_event, editor) => {
    setHtml(editor.getData());
  }}
  onUploadImage={async ({ file, progress }) => {
    progress?.(5);

    // Upload file to your backend and return a public URL.
    // This is intentionally not implemented here.

    progress?.(100);
    return { url: "https://example.com/my-uploaded-image.png" };
  }}
/>
```

## Extending the Editor (Plugins / Toolbar / Config)

`CKEditor5Classic` is designed to be extensible:

- `config`: deep-merged into the default config
- `additionalPlugins`: array of extra plugins to include

Notes about merging:

- Arrays are treated as “replace” (not concatenated) to keep behavior predictable.
- If you want to extend `toolbar.items`, provide the full array you want.

## Canonicalizing URLs

If you need to normalize URLs (e.g., ensure https, strip tracking params), provide:

```ts
canonicalizeUrl?: (url: string) => string
```

This is applied to inserted URLs for links/media/file picks.

## Security Notes

- Treat `onUploadImage` as an untrusted input boundary: validate file type, size, and content server-side.
- If you enable embedding for arbitrary URLs, consider applying allow-lists and server-side content policies.
