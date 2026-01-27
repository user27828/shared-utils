# TinyMCE Setup Guide

This guide covers how to integrate the `TinyMceEditor` component from shared-utils with various bundlers, particularly addressing known issues with Vite.

## Prerequisites

Required peer dependencies:

```bash
yarn add tinymce @tinymce/tinymce-react
```

## Basic Usage

```tsx
import { TinyMceEditor } from "@user27828/shared-utils/client/wysiwyg";

const MyEditor = () => {
  const [content, setContent] = useState("");

  return (
    <TinyMceEditor
      data={content}
      onChange={(_, editor) => setContent(editor.getData())}
    />
  );
};
```

## Vite Bundler Issue

### Problem

TinyMCE uses side-effect-only ES module imports for its skin CSS files:

```typescript
// These imports inject CSS as side effects
import "tinymce/skins/ui/oxide/skin";
import "tinymce/skins/ui/oxide-dark/skin";
import "tinymce/skins/content/default/content";
import "tinymce/skins/content/dark/content";
```

**Vite's esbuild dependency optimizer creates empty files for these side-effect-only modules**, causing TinyMCE to fail loading its skin CSS. Symptoms include:

- Editor appears unstyled or broken
- Console errors about missing skin files
- "No license key" errors (even with GPL license)

### Solution: Static File Copy

The recommended workaround is to serve TinyMCE skins as static files and configure TinyMCE to load them via URLs.

#### Step 1: Install vite-plugin-static-copy

```bash
yarn add -D vite-plugin-static-copy
```

#### Step 2: Configure Vite

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/tinymce/skins",
          dest: "tinymce",
        },
      ],
    }),
  ],
  optimizeDeps: {
    // Exclude TinyMCE from Vite's dependency optimization
    exclude: ["tinymce"],
  },
});
```

#### Step 3: Configure TinyMceEditor with skin URLs

Use the optional `skinUrl` and `contentCss` props (or pass them via `init`):

```tsx
<TinyMceEditor
  data={content}
  onChange={(_, editor) => setContent(editor.getData())}
  skinUrl="/tinymce/skins/ui/oxide"  // or oxide-dark for dark theme
  contentCss="/tinymce/skins/content/default/content.css"
  // Alternative: pass via init prop
  init={{
    skin_url: "/tinymce/skins/ui/oxide-dark",
    content_css: "/tinymce/skins/content/dark/content.css",
  }}
/>
```

### Dark Mode Support

For dark mode, use the dark theme skins:

```tsx
const isDarkMode = /* your dark mode detection */;

<TinyMceEditor
  data={content}
  onChange={(_, editor) => setContent(editor.getData())}
  init={{
    skin_url: isDarkMode 
      ? "/tinymce/skins/ui/oxide-dark" 
      : "/tinymce/skins/ui/oxide",
    content_css: isDarkMode
      ? "/tinymce/skins/content/dark/content.css"
      : "/tinymce/skins/content/default/content.css",
  }}
/>
```

## Props Reference

### Skin Configuration Props

| Prop | Type | Description |
|------|------|-------------|
| `skinUrl` | `string` | URL path to TinyMCE UI skin directory (e.g., `/tinymce/skins/ui/oxide`) |
| `contentCss` | `string` | URL path to content CSS file (e.g., `/tinymce/skins/content/default/content.css`) |

These props are shortcuts that merge into the TinyMCE `init` object as `skin_url` and `content_css`.

### File Picker & Upload Props

| Prop | Type | Description |
|------|------|-------------|
| `onPickFile` | `(request: TinyMcePickRequest) => Promise<TinyMcePickResult \| null>` | Custom file picker callback |
| `onUploadImage` | `(request: TinyMceImageUploadRequest) => Promise<TinyMceImageUploadResult>` | Image upload handler |
| `canonicalizeUrl` | `(url: string) => string` | URL canonicalizer for inserted URLs |

### Other Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `string` | Editor content (HTML) |
| `onChange` | `(event, editor: { getData: () => string }) => void` | Content change handler |
| `onEditorInstance` | `(editor: any) => void` | Callback to receive TinyMCE editor instance |
| `init` | `object` | Additional TinyMCE init options (merged with defaults) |

## Troubleshooting

### "No license key" Error

This usually means the skin CSS failed to load. Verify:

1. The `vite-plugin-static-copy` is copying skins to the correct location
2. The `skin_url` path is accessible (check browser dev tools network tab)
3. The path doesn't include the file extension (use `/tinymce/skins/ui/oxide` not `/tinymce/skins/ui/oxide/skin.css`)

### Editor Not Rendering

Check the browser console for errors. Common issues:

- Missing `tinymce` peer dependency
- Vite optimizing TinyMCE incorrectly (add to `optimizeDeps.exclude`)
- CORS issues if skins are served from a different origin

### Webpack / Other Bundlers

Other bundlers (Webpack, Rollup) typically handle TinyMCE's side-effect imports correctly. The static copy workaround is primarily needed for Vite.

If using Webpack with TinyMCE, you may need the `copy-webpack-plugin` to copy skins to your public directory, similar to the Vite approach.

## Integration with File Manager

When using TinyMceEditor with db-supabase's File Manager:

```tsx
import { TinyMceEditor } from "@user27828/shared-utils/client/wysiwyg";
import { fmUploadInitApi, fmUploadFinalizeApi, fmGetReadUrlApi } from "@user27828/db-supabase/client";

const handleUploadImage = async (request: TinyMceImageUploadRequest) => {
  // Initialize upload
  const init = await fmUploadInitApi({
    request: {
      purpose: "cms_asset",
      originalFilename: request.filename,
      mimeType: request.mimeType,
      sizeBytes: request.sizeBytes,
      visibility: "public",
    },
  });

  // Upload the file (implementation depends on init.mode)
  // ... upload logic ...

  // Get the URL
  const readUrl = await fmGetReadUrlApi({ fileUid: init.fileUid });
  return { url: readUrl.url };
};

<TinyMceEditor
  data={content}
  onChange={(_, editor) => setContent(editor.getData())}
  onUploadImage={handleUploadImage}
  init={{
    skin_url: "/tinymce/skins/ui/oxide-dark",
    content_css: "/tinymce/skins/content/dark/content.css",
  }}
/>
```
