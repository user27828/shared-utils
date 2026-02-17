import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * WYSIWYG editor component using CKEditor 5 (self-hosted, GPL)
 *
 * Notes:
 * - Uses the new CKEditor 5 npm distribution (`ckeditor5`) and the official React wrapper.
 * - Configured to rely on NO CKEditor cloud components.
 * - Provides TinyMCE-like hooks (onChange/onEditorInstance/onPickFile/onUploadImage).
 */
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { mergeWith } from "lodash-es";
import { Alignment, Autoformat, Base64UploadAdapter, BlockQuote, Bold, ClassicEditor, Code, CodeBlock, Essentials, FontBackgroundColor, FontColor, FontFamily, FontSize, Fullscreen, GeneralHtmlSupport, Heading, HorizontalLine, Image, ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageUpload, Indent, Italic, Link, List, ListProperties, MediaEmbed, Paragraph, PasteFromOffice, PasteFromMarkdownExperimental, Plugin, ButtonView, Table, TableCellProperties, TableProperties, TableToolbar, Underline, WordCount, } from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { pickLocalFile } from "./wysiwyg-common.js";
const LAYOUT_STYLES = `
.shared-utils-ckeditor-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.shared-utils-ckeditor-container .shared-utils-ckeditor-editor {
  flex: 1 1 auto;
  min-height: 0;
}

/* Ensure the CKEditor root participates in flex layout and stretches to the available height. */
.shared-utils-ckeditor-container .shared-utils-ckeditor-editor .ck.ck-editor {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.shared-utils-ckeditor-container .shared-utils-ckeditor-editor .ck.ck-editor__main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

/* Editable area must be allowed to shrink and must stretch. */
.shared-utils-ckeditor-container .shared-utils-ckeditor-editor .ck.ck-editor__editable,
.shared-utils-ckeditor-container .shared-utils-ckeditor-editor .ck.ck-editor__editable_inline {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}
`;
const DARK_THEME_STYLES = `
.shared-utils-ckeditor-dark-global,
.shared-utils-ckeditor-dark-global.ck-fullscreen {
  /* Provide CKEditor UI variables globally for UI rendered outside the component subtree (dropdowns, balloons, etc). */
  --ck-color-base-foreground: #1a1a1a;
  --ck-color-base-background: #242424;
  --ck-color-base-border: rgba(255, 255, 255, 0.12);
  --ck-color-base-text: rgba(255, 255, 255, 0.87);
  --ck-color-toolbar-background: #18191b;
  --ck-color-dropdown-panel-background: #18191b;
  --ck-color-list-background: #18191b;
  --ck-color-button-default-hover-background: rgba(255, 255, 255, 0.08);
  --ck-color-button-on-background: rgba(100, 108, 255, 0.25);
  --ck-color-button-on-hover-background: rgba(100, 108, 255, 0.35);
  --ck-color-button-on-active-background: rgba(100, 108, 255, 0.45);
  --ck-color-button-on-color: rgba(255, 255, 255, 0.87);

  --ck-color-list-button-on-background: rgba(100, 108, 255, 0.25);
  --ck-color-list-button-on-background-focus: rgba(100, 108, 255, 0.35);
  --ck-color-list-button-on-text: rgba(255, 255, 255, 0.87);

  /* Split buttons (e.g. Code block language) use these vars when opened/hovered. */
  --ck-color-split-button-hover-background: rgba(255, 255, 255, 0.08);
  --ck-color-split-button-hover-border: rgba(255, 255, 255, 0.12);
  --ck-color-focus-border: rgba(100, 108, 255, 0.7);
  --ck-color-input-background: #242424;
  --ck-color-input-border: rgba(255, 255, 255, 0.12);
  --ck-color-input-text: rgba(255, 255, 255, 0.87);
  --ck-color-input-placeholder-text: rgba(255, 255, 255, 0.55);
}

/* Target UI rendered under <body>/<html> when the global class is enabled. */
html.shared-utils-ckeditor-dark-global .ck.ck-dropdown__panel,
body.shared-utils-ckeditor-dark-global .ck.ck-dropdown__panel {
  background: #18191b;
  border-color: rgba(255, 255, 255, 0.12);
}

html.shared-utils-ckeditor-dark-global .ck.ck-list,
body.shared-utils-ckeditor-dark-global .ck.ck-list {
  background: #18191b;
  color: rgba(255, 255, 255, 0.87);
}

html.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button,
body.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button {
  color: rgba(255, 255, 255, 0.87);
}

html.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button:hover,
body.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button:hover {
  background: rgba(255, 255, 255, 0.08);
}

html.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button.ck-on,
body.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button.ck-on,
html.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button.ck-selected,
body.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button.ck-selected {
  background: rgba(100, 108, 255, 0.25);
  color: rgba(255, 255, 255, 0.87);
}

html.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button.ck-on:hover,
body.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button.ck-on:hover,
html.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button.ck-selected:hover,
body.shared-utils-ckeditor-dark-global .ck.ck-list__item .ck-button.ck-selected:hover {
  background: rgba(100, 108, 255, 0.35);
}

/* When a dropdown is open, its trigger button becomes "on". Ensure it remains dark. */
html.shared-utils-ckeditor-dark-global .ck.ck-toolbar .ck-button.ck-on,
body.shared-utils-ckeditor-dark-global .ck.ck-toolbar .ck-button.ck-on,
html.shared-utils-ckeditor-dark-global .ck.ck-toolbar .ck-dropdown__button.ck-on,
body.shared-utils-ckeditor-dark-global .ck.ck-toolbar .ck-dropdown__button.ck-on {
  background: rgba(100, 108, 255, 0.25);
  color: rgba(255, 255, 255, 0.87);
}

html.shared-utils-ckeditor-dark-global .ck.ck-input-text,
body.shared-utils-ckeditor-dark-global .ck.ck-input-text {
  background: #242424;
  color: rgba(255, 255, 255, 0.87);
  border-color: rgba(255, 255, 255, 0.12);
}

.shared-utils-ckeditor-dark .ck.ck-editor__main > .ck-editor__editable {
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.87);
}
.shared-utils-ckeditor-dark .ck.ck-toolbar {
  background: #18191b;
  border-color: rgba(255, 255, 255, 0.12);
}
.shared-utils-ckeditor-dark .ck.ck-toolbar .ck-button,
.shared-utils-ckeditor-dark .ck.ck-toolbar .ck-dropdown__button {
  color: rgba(255, 255, 255, 0.87);
}
.shared-utils-ckeditor-dark .ck.ck-toolbar .ck-button:hover,
.shared-utils-ckeditor-dark .ck.ck-toolbar .ck-dropdown__button:hover {
  background: rgba(255, 255, 255, 0.08);
}
.shared-utils-ckeditor-dark .ck.ck-toolbar .ck-button.ck-on {
  background: rgba(100, 108, 255, 0.25);
}
.shared-utils-ckeditor-dark .ck.ck-toolbar .ck-dropdown__button.ck-on {
  background: rgba(100, 108, 255, 0.25);
}
.shared-utils-ckeditor-dark .ck.ck-toolbar .ck-button.ck-on,
.shared-utils-ckeditor-dark .ck.ck-toolbar .ck-dropdown__button.ck-on {
  color: rgba(255, 255, 255, 0.87);
}
.shared-utils-ckeditor-dark .ck.ck-dropdown__panel {
  background: #18191b;
  border-color: rgba(255, 255, 255, 0.12);
}

/* Fullscreen mode is rendered outside the local container, so we also theme it via a global class. */
html:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen,
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen {
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.87);

  /* Override CKEditor UI variables for dark mode while in fullscreen. */
  --ck-color-base-foreground: #1a1a1a;
  --ck-color-base-background: #242424;
  --ck-color-base-border: rgba(255, 255, 255, 0.12);
  --ck-color-base-text: rgba(255, 255, 255, 0.87);
  --ck-color-toolbar-background: #18191b;
  --ck-color-dropdown-panel-background: #18191b;
  --ck-color-editor-background: #1a1a1a;
  --ck-color-text: rgba(255, 255, 255, 0.87);
}

html:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-fullscreen,
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-fullscreen,
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-fullscreen__main-wrapper {
  background: #1a1a1a !important;
}

body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-toolbar {
  background: #18191b;
  border-color: rgba(255, 255, 255, 0.12);
}

body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-toolbar .ck-button,
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-toolbar .ck-dropdown__button {
  color: rgba(255, 255, 255, 0.87);
}

body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-dropdown__panel {
  background: #18191b !important;
  border-color: rgba(255, 255, 255, 0.12);
}

html:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-editor__main > .ck-editor__editable,
html:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck-fullscreen__editable,
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck.ck-editor__main > .ck-editor__editable,
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen .ck-fullscreen__editable {
  background: #1a1a1a !important;
  color: rgba(255, 255, 255, 0.87) !important;
}

/* Fullscreen plugin intentionally renders a "page" with a hardcoded white background. Override to match dark mode. */
html:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen
  .ck.ck-fullscreen__main-wrapper
  .ck-fullscreen__editable
  .ck.ck-editor__editable:not(.ck-editor__nested-editable),
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen
  .ck.ck-fullscreen__main-wrapper
  .ck-fullscreen__editable
  .ck.ck-editor__editable:not(.ck-editor__nested-editable),
html:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen
  .ck-fullscreen__main-wrapper
  .ck-fullscreen__editable
  .ck.ck-editor__editable:not(.ck-editor__nested-editable),
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen
  .ck-fullscreen__main-wrapper
  .ck-fullscreen__editable
  .ck.ck-editor__editable:not(.ck-editor__nested-editable) {
  background: #1a1a1a !important;
  color: rgba(255, 255, 255, 0.87) !important;
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.35);
}

html:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen
  .ck-fullscreen__main-wrapper
  .ck-fullscreen__editable
  .ck-source-editing-area
  textarea,
body:is(.shared-utils-ckeditor-dark-fullscreen, .shared-utils-ckeditor-dark-global).ck-fullscreen
  .ck-fullscreen__main-wrapper
  .ck-fullscreen__editable
  .ck-source-editing-area
  textarea {
  background: #1a1a1a !important;
  color: rgba(255, 255, 255, 0.87) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}
`;
const useCkeditorDarkThemeStyles = (enabled) => {
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const styleId = "shared-utils-ckeditor-dark-theme";
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = DARK_THEME_STYLES;
        if (styleElement.parentNode === document.head) {
            document.head.appendChild(styleElement);
        }
    }, [enabled]);
};
const useCkeditorLayoutStyles = () => {
    useEffect(() => {
        const styleId = "shared-utils-ckeditor-layout";
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = styleId;
            styleElement.textContent = LAYOUT_STYLES;
            document.head.appendChild(styleElement);
        }
    }, []);
};
const mergeReplaceArrays = (objValue, srcValue) => {
    if (Array.isArray(objValue)) {
        return srcValue;
    }
    return undefined;
};
const guessKindFromUrl = (url) => {
    const lower = String(url || "").toLowerCase();
    if (lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".gif") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".svg")) {
        return "image";
    }
    if (lower.includes("youtube.com") ||
        lower.includes("youtu.be") ||
        lower.includes("vimeo.com") ||
        lower.includes("open.spotify.com")) {
        return "media";
    }
    return "file";
};
const tryInsertImageUrl = (editor, url, alt) => {
    const candidates = [
        ["insertImage", { source: url, altText: alt }],
        ["insertImage", { source: [url], altText: alt }],
        ["imageInsert", { source: url, altText: alt }],
        ["imageInsert", { source: [url], altText: alt }],
    ];
    for (const [command, args] of candidates) {
        try {
            if (editor.commands.get(command)) {
                editor.execute(command, args);
                return;
            }
        }
        catch (err) {
            // Try next candidate.
        }
    }
    // As a last resort insert a link.
    const selection = editor.model.document.selection;
    const position = selection.getFirstPosition();
    editor.model.change((writer) => {
        writer.insertText(url, { linkHref: url }, position);
    });
};
const insertLink = (editor, url, text) => {
    const label = text || url;
    const selection = editor.model.document.selection;
    const position = selection.getFirstPosition();
    editor.model.change((writer) => {
        writer.insertText(label, { linkHref: url }, position);
    });
};
const createSharedUtilsFilePickerPlugin = (options) => {
    var _a;
    const { onPickFile, onUploadImage, canonicalizeUrl, createdObjectUrlsRef } = options;
    return _a = class SharedUtilsFilePickerPlugin extends Plugin {
            init() {
                const editor = this.editor;
                const resolveUrl = (url) => {
                    if (canonicalizeUrl) {
                        return canonicalizeUrl(url);
                    }
                    return url;
                };
                const runPicker = async (filetype) => {
                    if (onPickFile) {
                        return await onPickFile({
                            value: "",
                            meta: { filetype },
                        });
                    }
                    // Default picker UI: native file input (for image/file) or prompt (for media).
                    if (filetype === "media") {
                        const url = window.prompt("Enter a media URL to embed:", "");
                        if (!url) {
                            return null;
                        }
                        return { url, kind: "media" };
                    }
                    const accept = filetype === "image" ? "image/*" : "*/*";
                    const file = await pickLocalFile({ accept });
                    if (!file) {
                        return null;
                    }
                    if (filetype === "image") {
                        if (onUploadImage) {
                            const result = await onUploadImage({
                                file,
                                filename: file.name,
                                mimeType: file.type || "application/octet-stream",
                                sizeBytes: file.size,
                            });
                            return { url: result.url, kind: "image" };
                        }
                        const objectUrl = URL.createObjectURL(file);
                        createdObjectUrlsRef.current.push(objectUrl);
                        return { url: objectUrl, kind: "image" };
                    }
                    // For non-image files, we can only insert a link without an upload pipeline.
                    const objectUrl = URL.createObjectURL(file);
                    createdObjectUrlsRef.current.push(objectUrl);
                    return {
                        url: objectUrl,
                        title: file.name,
                        text: file.name,
                        kind: "file",
                    };
                };
                editor.ui.componentFactory.add("sharedUtilsInsertImage", (locale) => {
                    const view = new ButtonView(locale);
                    view.set({
                        label: "Insert image",
                        tooltip: true,
                        withText: true,
                    });
                    view.on("execute", () => {
                        void (async () => {
                            try {
                                const pick = await runPicker("image");
                                if (!pick) {
                                    return;
                                }
                                const url = resolveUrl(pick.url);
                                tryInsertImageUrl(editor, url, pick.alt);
                            }
                            catch (err) {
                                console.error("CKEditor5Classic shared image picker failed", err);
                            }
                        })();
                    });
                    return view;
                });
                editor.ui.componentFactory.add("sharedUtilsInsertFile", (locale) => {
                    const view = new ButtonView(locale);
                    view.set({
                        label: "Insert file",
                        tooltip: true,
                        withText: true,
                    });
                    view.on("execute", () => {
                        void (async () => {
                            try {
                                const pick = await runPicker("file");
                                if (!pick) {
                                    return;
                                }
                                const url = resolveUrl(pick.url);
                                const text = pick.text || pick.title || url;
                                insertLink(editor, url, text);
                            }
                            catch (err) {
                                console.error("CKEditor5Classic shared file picker failed", err);
                            }
                        })();
                    });
                    return view;
                });
                editor.ui.componentFactory.add("sharedUtilsInsertMedia", (locale) => {
                    const view = new ButtonView(locale);
                    view.set({
                        label: "Insert media",
                        tooltip: true,
                        withText: true,
                    });
                    view.on("execute", () => {
                        void (async () => {
                            try {
                                const pick = await runPicker("media");
                                if (!pick) {
                                    return;
                                }
                                const url = resolveUrl(pick.url);
                                if (editor.commands.get("mediaEmbed")) {
                                    editor.execute("mediaEmbed", url);
                                    return;
                                }
                                insertLink(editor, url, pick.text || pick.title || url);
                            }
                            catch (err) {
                                console.error("CKEditor5Classic shared media picker failed", err);
                            }
                        })();
                    });
                    return view;
                });
            }
        },
        _a.pluginName = "SharedUtilsFilePicker",
        _a;
};
const createUploadAdapterPlugin = (onUploadImage, canonicalizeUrl) => {
    var _a;
    return _a = class SharedUtilsUploadAdapterPlugin extends Plugin {
            init() {
                if (!onUploadImage) {
                    return;
                }
                const editor = this.editor;
                const fileRepository = editor.plugins.get("FileRepository");
                fileRepository.createUploadAdapter = (loader) => {
                    return {
                        upload: async () => {
                            const file = await loader.file;
                            const result = await onUploadImage({
                                file,
                                filename: file.name,
                                mimeType: file.type || "application/octet-stream",
                                sizeBytes: file.size,
                                progress: (percent) => {
                                    if (typeof percent !== "number") {
                                        return;
                                    }
                                    loader.uploadTotal = file.size;
                                    loader.uploaded = Math.round((percent / 100) * file.size);
                                },
                            });
                            const url = canonicalizeUrl
                                ? canonicalizeUrl(result.url)
                                : result.url;
                            return { default: url };
                        },
                        abort: () => {
                            // We cannot reliably abort user-defined upload pipelines.
                        },
                    };
                };
            }
        },
        _a.pluginName = "SharedUtilsUploadAdapter",
        _a;
};
const CKEditor5Classic = (props) => {
    const { data, onChange, onEditorInstance, onPickFile, onUploadImage, canonicalizeUrl, darkMode = false, readOnly = false, height = 500, config, additionalPlugins = [], } = props;
    useCkeditorLayoutStyles();
    useCkeditorDarkThemeStyles(darkMode);
    const editorRef = useRef(null);
    const isReadyRef = useRef(false);
    const initialDataRef = useRef(data || "");
    // Stable value passed to <CKEditor data={}> — never changes after mount.
    // This prevents the React wrapper's shouldComponentUpdate from calling
    // editor.data.set() before document roots exist.  Our useEffect([data])
    // handles all subsequent data synchronisation.
    const [mountData] = useState(() => data || "");
    const createdObjectUrlsRef = useRef([]);
    const fullscreenCleanupRef = useRef(null);
    const fullscreenActiveRef = useRef(false);
    const darkModeRef = useRef(darkMode);
    const globalDarkAppliedRef = useRef(false);
    const [wordCountStats, setWordCountStats] = useState({
        words: 0,
        characters: 0,
    });
    const handleWordCountUpdate = useCallback((stats) => {
        const words = typeof stats?.words === "number" ? stats.words : 0;
        const characters = typeof stats?.characters === "number" ? stats.characters : 0;
        setWordCountStats({
            words,
            characters,
        });
    }, []);
    const syncFullscreenDarkClass = useCallback(() => {
        if (typeof document === "undefined") {
            return;
        }
        const globalClassName = "shared-utils-ckeditor-dark-fullscreen";
        const shouldEnable = !!darkModeRef.current && !!fullscreenActiveRef.current;
        if (shouldEnable) {
            document.body.classList.add(globalClassName);
            document.documentElement.classList.add(globalClassName);
        }
        else {
            document.body.classList.remove(globalClassName);
            document.documentElement.classList.remove(globalClassName);
        }
    }, []);
    const syncGlobalDarkClass = useCallback((enable) => {
        if (typeof document === "undefined") {
            return;
        }
        const globalClassName = "shared-utils-ckeditor-dark-global";
        const key = "sharedUtilsCkeditorDarkCount";
        const getCount = () => {
            const raw = document.documentElement.dataset[key];
            const parsed = raw ? Number(raw) : 0;
            if (!Number.isFinite(parsed) || parsed < 0) {
                return 0;
            }
            return parsed;
        };
        const setCount = (count) => {
            const next = Math.max(0, Math.floor(count));
            document.documentElement.dataset[key] = String(next);
        };
        if (enable && !globalDarkAppliedRef.current) {
            const nextCount = getCount() + 1;
            setCount(nextCount);
            globalDarkAppliedRef.current = true;
            document.documentElement.classList.add(globalClassName);
            document.body.classList.add(globalClassName);
            return;
        }
        if (!enable && globalDarkAppliedRef.current) {
            const nextCount = Math.max(0, getCount() - 1);
            setCount(nextCount);
            globalDarkAppliedRef.current = false;
            if (nextCount === 0) {
                document.documentElement.classList.remove(globalClassName);
                document.body.classList.remove(globalClassName);
            }
        }
    }, []);
    useEffect(() => {
        darkModeRef.current = darkMode;
        syncFullscreenDarkClass();
        syncGlobalDarkClass(!!darkMode);
    }, [darkMode, syncFullscreenDarkClass]);
    useEffect(() => {
        return () => {
            syncGlobalDarkClass(false);
        };
    }, [syncGlobalDarkClass]);
    useEffect(() => {
        return () => {
            if (fullscreenCleanupRef.current) {
                fullscreenCleanupRef.current();
                fullscreenCleanupRef.current = null;
            }
            isReadyRef.current = false;
            // Revoke any object URLs we created for local file preview insertion.
            for (const url of createdObjectUrlsRef.current) {
                try {
                    URL.revokeObjectURL(url);
                }
                catch (err) {
                    // Ignore.
                }
            }
            createdObjectUrlsRef.current = [];
        };
    }, []);
    // Update cached initial data when prop changes and editor is not focused.
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !isReadyRef.current) {
            initialDataRef.current = data || "";
            return;
        }
        const isFocused = !!editor.editing?.view?.document?.isFocused;
        if (isFocused) {
            return;
        }
        const nextData = data ?? "";
        const currentData = String(editor.getData?.() || "");
        if (currentData !== nextData) {
            try {
                editor.setData(nextData);
            }
            catch (err) {
                // Guard against "datacontroller-set-non-existent-root" from
                // setData being invoked before the editor document model is
                // fully initialised (timing race with @ckeditor/ckeditor5-react).
                initialDataRef.current = nextData;
                return;
            }
        }
        initialDataRef.current = nextData;
    }, [data]);
    const editorPlugins = useMemo(() => {
        const filePickerPlugin = createSharedUtilsFilePickerPlugin({
            onPickFile,
            onUploadImage,
            canonicalizeUrl,
            createdObjectUrlsRef,
        });
        const uploadAdapterPlugin = createUploadAdapterPlugin(onUploadImage, canonicalizeUrl);
        return {
            filePickerPlugin,
            uploadAdapterPlugin,
        };
    }, [onPickFile, onUploadImage, canonicalizeUrl]);
    const defaultConfig = useMemo(() => {
        const plugins = [
            Essentials,
            Paragraph,
            Heading,
            Bold,
            Italic,
            Underline,
            Alignment,
            FontSize,
            FontFamily,
            FontColor,
            FontBackgroundColor,
            ListProperties,
            Indent,
            Code,
            Link,
            List,
            BlockQuote,
            CodeBlock,
            Table,
            TableToolbar,
            TableProperties,
            TableCellProperties,
            HorizontalLine,
            MediaEmbed,
            Fullscreen,
            GeneralHtmlSupport,
            Image,
            ImageCaption,
            ImageStyle,
            ImageResize,
            ImageToolbar,
            ImageUpload,
            Autoformat,
            PasteFromOffice,
            PasteFromMarkdownExperimental,
            WordCount,
            ...(!onUploadImage ? [Base64UploadAdapter] : []),
            editorPlugins.uploadAdapterPlugin,
            editorPlugins.filePickerPlugin,
            ...additionalPlugins,
        ];
        return {
            licenseKey: "GPL",
            plugins,
            toolbar: {
                shouldNotGroupWhenFull: true,
                items: [
                    "undo",
                    "redo",
                    "|",
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "underline",
                    "code",
                    "|",
                    "fontSize",
                    "fontFamily",
                    "fontColor",
                    "fontBackgroundColor",
                    "|",
                    "link",
                    "bulletedList",
                    "numberedList",
                    "outdent",
                    "indent",
                    "alignment",
                    "|",
                    "blockQuote",
                    "codeBlock",
                    "insertTable",
                    "|",
                    "sharedUtilsInsertImage",
                    "sharedUtilsInsertFile",
                    "mediaEmbed",
                    "sharedUtilsInsertMedia",
                    "|",
                    "horizontalLine",
                    "|",
                    "fullscreen",
                ],
            },
            image: {
                toolbar: [
                    "toggleImageCaption",
                    "imageTextAlternative",
                    "|",
                    "imageStyle:inline",
                    "imageStyle:block",
                    "imageStyle:side",
                ],
            },
            table: {
                contentToolbar: [
                    "tableColumn",
                    "tableRow",
                    "mergeTableCells",
                    "|",
                    "tableProperties",
                    "tableCellProperties",
                ],
            },
            list: {
                properties: {
                    styles: true,
                    startIndex: true,
                    reversed: true,
                },
            },
            fontFamily: {
                supportAllValues: true,
            },
            fontSize: {
                options: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
                supportAllValues: true,
            },
            mediaEmbed: {
                previewsInData: false,
            },
            htmlSupport: {
                allow: [
                    {
                        name: /^(p|h[1-6]|span|div|a|table|thead|tbody|tfoot|tr|th|td|ol|ul|li|figure|figcaption|img|blockquote|pre|code)$/,
                        styles: true,
                        classes: true,
                        attributes: true,
                    },
                ],
            },
            wordCount: {
                onUpdate: handleWordCountUpdate,
            },
        };
    }, [
        additionalPlugins,
        editorPlugins.filePickerPlugin,
        editorPlugins.uploadAdapterPlugin,
        handleWordCountUpdate,
        onUploadImage,
    ]);
    const finalConfig = useMemo(() => {
        return mergeWith({}, defaultConfig, config || {}, mergeReplaceArrays);
    }, [defaultConfig, config]);
    const containerClassName = [
        "shared-utils-ckeditor-container",
        darkMode ? "shared-utils-ckeditor-dark" : "",
    ]
        .filter(Boolean)
        .join(" ");
    const heightValue = typeof height === "number" ? `${height}px` : height;
    return (_jsxs("div", { className: containerClassName, style: {
            height: heightValue,
            border: "1px solid",
            borderColor: darkMode ? "rgba(255, 255, 255, 0.12)" : "#ccc",
            borderRadius: "4px",
            overflow: "hidden",
        }, children: [_jsx("div", { className: "shared-utils-ckeditor-editor", children: _jsx(CKEditor, { editor: ClassicEditor, data: mountData, config: finalConfig, disabled: readOnly, onReady: (editor) => {
                        editorRef.current = editor;
                        isReadyRef.current = true;
                        // Keep fullscreen dark styling aligned with darkMode.
                        const fullscreenCommand = editor.commands.get("fullscreen");
                        if (fullscreenCommand &&
                            typeof fullscreenCommand.on === "function") {
                            const onChangeValue = () => {
                                fullscreenActiveRef.current = !!fullscreenCommand.value;
                                syncFullscreenDarkClass();
                            };
                            fullscreenCommand.on("change:value", onChangeValue);
                            onChangeValue();
                            fullscreenCleanupRef.current = () => {
                                try {
                                    fullscreenCommand.off("change:value", onChangeValue);
                                }
                                catch (err) {
                                    // Ignore.
                                }
                                fullscreenActiveRef.current = false;
                                syncFullscreenDarkClass();
                            };
                        }
                        if (onEditorInstance) {
                            onEditorInstance(editor);
                        }
                    }, onChange: (event, editor) => {
                        if (onChange) {
                            onChange(event, { getData: () => editor.getData() });
                        }
                    } }) }), _jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    padding: "6px 10px",
                    fontSize: "12px",
                    flex: "0 0 auto",
                    borderTop: "1px solid",
                    borderColor: darkMode ? "rgba(255, 255, 255, 0.12)" : "#e0e0e0",
                    color: darkMode ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
                    background: darkMode ? "#18191b" : "#fafafa",
                }, children: ["Words: ", wordCountStats.words, "\u00A0\u00A0Characters:", " ", wordCountStats.characters] })] }));
};
CKEditor5Classic.displayName = "CKEditor5Classic";
export default CKEditor5Classic;
