# WYSIWYG Setup Guide

Editor integrations are split into engine-specific entrypoints. The shared
switcher at `@user27828/shared-utils/client/wysiwyg` contains only the adapter
contract and does not import an editor package. Import the engine adapter you
install and pass it in a stable adapter map.

| Entry point               | Contents                                                              |
| ------------------------- | --------------------------------------------------------------------- |
| `client/wysiwyg`          | Engine-neutral switcher, adapter contract, shared callbacks and types |
| `client/wysiwyg/tinymce`  | TinyMCE adapter with the minimal plugin preset                        |
| `client/wysiwyg/ckeditor` | CKEditor 5 adapter                                                    |
| `client/wysiwyg/easymde`  | EasyMDE adapter                                                       |
| `client/wysiwyg/mdx`      | MDXEditor adapter                                                     |
| `client/wysiwyg/all`      | Convenience adapter map for all engines and TinyMCE's full preset     |

The `all` path deliberately includes every engine and should be used only when
the application installs all of those optional packages. It supports the
previous unified switcher usage without an `adapters` prop.

## Install an engine

Install only the engine used by the application:

```bash
# TinyMCE
yarn add @tinymce/tinymce-react tinymce

# CKEditor 5
yarn add @ckeditor/ckeditor5-react ckeditor5

# EasyMDE
yarn add easymde

# MDXEditor
yarn add @mdxeditor/editor @codemirror/language @lezer/highlight yjs
```

The package's editor peers are optional. A consumer that imports one engine
entrypoint does not need to install the other engine packages.

## Use the shared switcher with one engine

Create adapter maps outside the rendering component so their component
references remain stable:

```tsx
import React, { useState } from "react";
import WysiwygEditor from "@user27828/shared-utils/client/wysiwyg";
import { TinyMceWysiwygAdapter } from "@user27828/shared-utils/client/wysiwyg/tinymce";

const editorAdapters = { tinymce: TinyMceWysiwygAdapter };

export function ArticleEditor() {
  const [value, setValue] = useState("<p>Hello</p>");

  return (
    <WysiwygEditor
      adapters={editorAdapters}
      editor="tinymce"
      value={value}
      height={420}
      onChange={(nextValue) => setValue(nextValue)}
    />
  );
}
```

The switcher supports `tinymce`, `ckeditor`, `easymde`, and `mdx`. If the
selected engine is absent from the supplied map, it renders a configuration
alert instead of importing another editor behind the host's back.

For an application that intentionally uses every engine, import the
convenience entry:

```tsx
import WysiwygEditor from "@user27828/shared-utils/client/wysiwyg/all";

<WysiwygEditor editor="ckeditor" value={html} onChange={setHtml} />;
```

## Shared callbacks

The shared switcher accepts `value`, `readOnly`, `height`, `darkMode`,
`onChange`, `onEditorInstance`, `onPickAsset`, and `onUploadImage`. Content
keeps the selected engine's native format: HTML for TinyMCE/CKEditor and
Markdown for EasyMDE/MDXEditor.

`onChange(value, context)` reports the engine, latest instance, and raw event.
TinyMCE, CKEditor, and EasyMDE support the common asset-picker callback:

```tsx
import type {
  WysiwygPickRequest,
  WysiwygPickResult,
} from "@user27828/shared-utils/client/wysiwyg";

const onPickAsset = async (
  request: WysiwygPickRequest,
): Promise<WysiwygPickResult | null> => {
  return {
    kind: request.kind,
    url: "https://example.com/image.png",
    alt: request.kind === "image" ? "Example" : undefined,
  };
};
```

The image-upload callback accepts either a `File` or `Blob` because TinyMCE
and CKEditor expose different source types:

```tsx
import type { WysiwygImageUploadRequest } from "@user27828/shared-utils/client/wysiwyg";

const onUploadImage = async (request: WysiwygImageUploadRequest) => {
  const source = request.file ?? request.blob;
  if (!source) {
    throw new Error("No image data was provided");
  }
  // Upload source and report progress with request.progress?.(percent).
  return { url: "https://example.com/uploaded.png" };
};
```

MDXEditor supports the image-upload callback. Its current wrapper does not
provide the shared asset-picker callback.

## Configure a specific editor

Use `editorProps` for engine-specific component props. The selected adapter
alone reads its entry:

```tsx
<WysiwygEditor
  adapters={editorAdapters}
  editor="tinymce"
  value={html}
  editorProps={{
    tinymce: {
      init: {
        menubar: false,
        toolbar: "undo redo | bold italic | link image",
      },
    },
  }}
/>
```

The older `tinymce`, `ckeditor`, `easymde`, and `mdx` top-level override props
remain temporarily accepted by the generic switcher. New code should use
`editorProps`.

For direct engine components and engine-specific props, import only that
engine's path:

```tsx
import { TinyMceEditor } from "@user27828/shared-utils/client/wysiwyg/tinymce";
import { CKEditor5Classic } from "@user27828/shared-utils/client/wysiwyg/ckeditor";
import { EasyMDEEditor } from "@user27828/shared-utils/client/wysiwyg/easymde";
import { MDXEditor } from "@user27828/shared-utils/client/wysiwyg/mdx";
```

Direct components retain their native APIs. TinyMCE skins and editor CSS,
CKEditor feature CSS, EasyMDE CSS, and MDXEditor CSS load with the selected
engine chunk. Runtime import failures are shown with an alert and editable
textarea fallback; build-time missing-peer errors remain visible to the
consumer build.

## TinyMCE plugin presets

The `tinymce` entry imports only the components, skins, resources, and plugins
used by `TinyMceEditor`'s default configuration. It supports the existing
default toolbar and both light and dark skins.

Optional groups can be imported as side-effect modules before the editor is
rendered:

```tsx
import "@user27828/shared-utils/client/wysiwyg/tinymce/features/code";
import "@user27828/shared-utils/client/wysiwyg/tinymce/features/media";
import "@user27828/shared-utils/client/wysiwyg/tinymce/features/extended";
```

`code` registers the code, code-sample, and visual-debug plugins and initializes
Prism. `media` registers media, date/time insertion, and quickbars. `extended`
registers the extra formatting, navigation, and page tools, including the
Emoticons emoji database and Help keyboard-navigation resource.

Import `client/wysiwyg/tinymce/features/full` to register every plugin group,
or use the `client/wysiwyg/tinymce/full` entry to get the TinyMCE component and
adapter with that full preset. The `client/wysiwyg/all` convenience entry also
registers the full TinyMCE preset. The grouped paths do not silently add
plugins to TinyMCE's toolbar; configure the corresponding `init.plugins` and
`init.toolbar` options.

For Vite static skin copying and URL configuration, see
[TINYMCE_SETUP.md](./TINYMCE_SETUP.md).

## Configure CMS body editors

`CmsBodyEditor` has no built-in editor import. Supply only the adapters used by
the host in `CmsAdminUiConfig.editorAdapters`:

```tsx
import { CmsEditPage } from "@user27828/shared-utils/cms/client/ui";
import { CKEditorWysiwygAdapter } from "@user27828/shared-utils/client/wysiwyg/ckeditor";

const cmsConfig = {
  editorPreference: "ckeditor",
  editorAdapters: { ckeditor: CKEditorWysiwygAdapter },
} satisfies CmsAdminUiConfig;

<CmsEditPage uid={uid} config={cmsConfig} />;
```

Markdown content uses the `mdx` key. For CMS's existing TinyMCE toolbar and
plugins, import `TinyMceWysiwygAdapter` from
`client/wysiwyg/tinymce/full`; the base TinyMCE entry intentionally omits those
optional plugins. `editorProps` in the CMS config passes engine-specific props
to the selected adapter. If an adapter is not supplied or its optional package
fails to load at runtime, CMS remains editable through its textarea fallback.

CMS media picker and image upload callbacks are adapted to TinyMCE and CKEditor
requests. Pasted data-URI images are still normalized after a debounce, and
local `file://` image paths pasted from word processors are still removed.

For CKEditor feature configuration, see
[CKEDITOR_SETUP.md](./CKEDITOR_SETUP.md).
