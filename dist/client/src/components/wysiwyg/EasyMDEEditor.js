import { jsx as _jsx } from "react/jsx-runtime";
/**
 * WYSIWYG editor component using EasyMDE (Markdown)
 *
 * Notes:
 * - This is a lightweight React wrapper around the EasyMDE textarea replacement.
 * - Supports normalized asset insertion hooks (file/image/media) and image uploads.
 */
import { useEffect, useRef } from "react";
import EasyMDE from "easymde";
import "easymde/dist/easymde.min.css";
import { normalizeCssSize, } from "./wysiwyg-common.js";
import { formatMarkdownImage, formatMarkdownLink } from "./markdown.js";
const insertTextAtCursor = (editor, text) => {
    const cm = editor?.codemirror;
    if (!cm) {
        return;
    }
    const doc = cm.getDoc();
    const cursor = doc.getCursor();
    doc.replaceRange(text, cursor);
};
const toKindLabel = (kind) => {
    if (kind === "image") {
        return "Image";
    }
    if (kind === "media") {
        return "Media";
    }
    return "File";
};
const EasyMDEEditor = (props) => {
    const { value, onChange, onEditorInstance, onPickAsset, onUploadImage, canonicalizeUrl, readOnly, height, options, } = props;
    const textareaRef = useRef(null);
    const easyMdeRef = useRef(null);
    const initialValueRef = useRef(value || "");
    const lastExternalValueRef = useRef(value || "");
    // Keep volatile inputs in refs so we don't have to tear down/recreate the editor.
    const onChangeRef = useRef(onChange);
    const onEditorInstanceRef = useRef(onEditorInstance);
    const onPickAssetRef = useRef(onPickAsset);
    const onUploadImageRef = useRef(onUploadImage);
    const canonicalizeUrlRef = useRef(canonicalizeUrl);
    const optionsRef = useRef(options);
    useEffect(() => {
        onChangeRef.current = onChange;
        onEditorInstanceRef.current = onEditorInstance;
        onPickAssetRef.current = onPickAsset;
        onUploadImageRef.current = onUploadImage;
        canonicalizeUrlRef.current = canonicalizeUrl;
        optionsRef.current = options;
    }, [
        canonicalizeUrl,
        onChange,
        onEditorInstance,
        onPickAsset,
        onUploadImage,
        options,
    ]);
    useEffect(() => {
        if (!textareaRef.current) {
            return;
        }
        if (easyMdeRef.current) {
            return;
        }
        const normalizedHeight = normalizeCssSize(height);
        const handlePickAndInsert = async (kind, editor) => {
            const pickAsset = onPickAssetRef.current;
            if (!pickAsset) {
                return;
            }
            const pick = await pickAsset({
                value: editor.value?.() || "",
                kind,
            });
            if (!pick) {
                return;
            }
            const canonicalize = canonicalizeUrlRef.current;
            const resolvedUrl = canonicalize ? canonicalize(pick.url) : pick.url;
            if (kind === "image") {
                const alt = pick.alt || pick.text || pick.title || "";
                insertTextAtCursor(editor, formatMarkdownImage({ url: resolvedUrl, alt }));
                return;
            }
            const label = pick.text || pick.title || resolvedUrl;
            insertTextAtCursor(editor, formatMarkdownLink({ url: resolvedUrl, label }));
        };
        const toolbar = (() => {
            const frozenOptions = optionsRef.current;
            const baseToolbar = frozenOptions?.toolbar;
            if (baseToolbar === false) {
                return false;
            }
            if (!onPickAssetRef.current && !onUploadImageRef.current) {
                return baseToolbar;
            }
            const customButtons = [];
            if (onPickAssetRef.current) {
                customButtons.push({
                    name: "shared-utils-insert-image",
                    text: "Image",
                    title: `Insert ${toKindLabel("image")}`,
                    action: (editor) => {
                        void handlePickAndInsert("image", editor).catch((err) => {
                            console.error("EasyMDE insert image failed", err);
                        });
                    },
                }, {
                    name: "shared-utils-insert-file",
                    text: "File",
                    title: `Insert ${toKindLabel("file")}`,
                    action: (editor) => {
                        void handlePickAndInsert("file", editor).catch((err) => {
                            console.error("EasyMDE insert file failed", err);
                        });
                    },
                }, {
                    name: "shared-utils-insert-media",
                    text: "Media",
                    title: `Insert ${toKindLabel("media")}`,
                    action: (editor) => {
                        void handlePickAndInsert("media", editor).catch((err) => {
                            console.error("EasyMDE insert media failed", err);
                        });
                    },
                }, "|");
            }
            // If the consumer provided an upload hook, enable EasyMDE's built-in upload flow
            // (drag+drop / paste / and the built-in upload-image button).
            if (onUploadImageRef.current) {
                customButtons.push("upload-image", "|");
            }
            const defaultToolbar = [
                "bold",
                "italic",
                "heading",
                "|",
                "quote",
                "unordered-list",
                "ordered-list",
                "|",
                "link",
                "|",
                "preview",
                "side-by-side",
                "fullscreen",
            ];
            if (Array.isArray(baseToolbar)) {
                return [...customButtons, ...baseToolbar];
            }
            return [...customButtons, ...defaultToolbar];
        })();
        const frozenOptions = optionsRef.current;
        const uploadHook = onUploadImageRef.current;
        const instance = new EasyMDE({
            element: textareaRef.current,
            initialValue: initialValueRef.current,
            ...(frozenOptions || {}),
            toolbar,
            minHeight: normalizedHeight,
            maxHeight: normalizedHeight,
            uploadImage: !!uploadHook,
            imageUploadFunction: uploadHook
                ? (file, onSuccess, onError) => {
                    void (async () => {
                        try {
                            const latestUploadHook = onUploadImageRef.current;
                            if (!latestUploadHook) {
                                onError("Image upload not configured");
                                return;
                            }
                            const result = await latestUploadHook({
                                file,
                                filename: file.name || "image",
                                mimeType: file.type || "application/octet-stream",
                                sizeBytes: typeof file.size === "number" ? file.size : 0,
                            });
                            const canonicalize = canonicalizeUrlRef.current;
                            const resolvedUrl = canonicalize
                                ? canonicalize(result.url)
                                : result.url;
                            onSuccess(resolvedUrl);
                        }
                        catch (err) {
                            const message = String(err?.message || "Image upload failed");
                            onError(message);
                        }
                    })();
                }
                : undefined,
        });
        easyMdeRef.current = instance;
        if (typeof readOnly === "boolean") {
            try {
                instance.codemirror.setOption("readOnly", readOnly);
            }
            catch {
                // Ignore.
            }
        }
        const editorInstanceCb = onEditorInstanceRef.current;
        if (editorInstanceCb) {
            editorInstanceCb(instance);
        }
        const onCmChange = () => {
            const changeCb = onChangeRef.current;
            if (!changeCb) {
                return;
            }
            const current = instance.value();
            lastExternalValueRef.current = current;
            changeCb(current);
        };
        instance.codemirror.on("change", onCmChange);
        return () => {
            try {
                instance.codemirror.off("change", onCmChange);
            }
            catch {
                // Ignore.
            }
            try {
                instance.cleanup();
            }
            catch {
                // Ignore.
            }
            try {
                instance.toTextArea();
            }
            catch {
                // Ignore.
            }
            easyMdeRef.current = null;
        };
    }, []);
    useEffect(() => {
        const instance = easyMdeRef.current;
        if (!instance) {
            initialValueRef.current = value || "";
            lastExternalValueRef.current = value || "";
            return;
        }
        const next = value || "";
        if (next === lastExternalValueRef.current) {
            return;
        }
        try {
            const hasFocus = !!instance.codemirror?.hasFocus?.();
            if (hasFocus) {
                return;
            }
            instance.value(next);
            lastExternalValueRef.current = next;
        }
        catch {
            // Ignore.
        }
    }, [value]);
    useEffect(() => {
        const instance = easyMdeRef.current;
        if (!instance) {
            return;
        }
        if (typeof readOnly !== "boolean") {
            return;
        }
        try {
            instance.codemirror.setOption("readOnly", readOnly);
        }
        catch {
            // Ignore.
        }
    }, [readOnly]);
    return _jsx("textarea", { ref: textareaRef });
};
EasyMDEEditor.displayName = "EasyMDEEditor";
export default EasyMDEEditor;
