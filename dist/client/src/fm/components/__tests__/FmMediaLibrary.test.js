import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FmMediaLibrary } from "../FmMediaLibrary.js";
describe("FmMediaLibrary split select menu", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });
    test("opens the image variant split menu without requiring MenuList context", async () => {
        const file = {
            uid: "file-1",
            original_filename: "hero-image.png",
            mime_type: "image/png",
            created_at: "2026-05-09T00:00:00.000Z",
            byte_size: 1234,
            is_public: false,
            archived_at: null,
            title: null,
            alt_text: null,
            tags: [],
            storage_location: "local",
        };
        const variant = {
            uid: "variant-1",
            file_uid: "file-1",
            width: 640,
            height: 480,
            kind: "thumb",
        };
        const onSelect = vi.fn();
        const api = {
            listFiles: vi.fn().mockResolvedValue({
                items: [file],
                totalCount: 1,
                limit: 25,
                offset: 0,
            }),
            listVariants: vi.fn().mockResolvedValue({
                items: [variant],
            }),
            getContentUrl: vi.fn().mockImplementation(({ fileUid, variantKind }) => {
                return variantKind
                    ? `/media/${fileUid}?variant=${variantKind}`
                    : `/media/${fileUid}`;
            }),
        };
        render(_jsx(FmMediaLibrary, { api: api, onSelect: onSelect, enableUpload: false, enableBulkActions: false }));
        await screen.findByText("hero-image.png");
        const dropdownButton = await screen.findByRole("button", {
            name: /select variant size/i,
        });
        expect(() => {
            fireEvent.click(dropdownButton);
        }).not.toThrow();
        const variantMenuItem = await screen.findByRole("menuitem", {
            name: /select size:\s*640×480/i,
        });
        expect(api.listVariants).toHaveBeenCalledWith("file-1");
        expect(variantMenuItem).toBeTruthy();
        fireEvent.click(variantMenuItem);
        await waitFor(() => {
            expect(onSelect).toHaveBeenCalledTimes(1);
        });
        expect(onSelect).toHaveBeenCalledWith(file, variant);
    });
    test("closes the image variant menu from keyboard Escape", async () => {
        const file = {
            uid: "file-1",
            original_filename: "hero-image.png",
            mime_type: "image/png",
            created_at: "2026-05-09T00:00:00.000Z",
            byte_size: 1234,
            is_public: false,
            archived_at: null,
            title: null,
            alt_text: null,
            tags: [],
            storage_location: "local",
        };
        const variant = {
            uid: "variant-1",
            file_uid: "file-1",
            width: 640,
            height: 480,
            kind: "thumb",
        };
        const api = {
            listFiles: vi.fn().mockResolvedValue({
                items: [file],
                totalCount: 1,
                limit: 25,
                offset: 0,
            }),
            listVariants: vi.fn().mockResolvedValue({
                items: [variant],
            }),
            getContentUrl: vi.fn().mockImplementation(({ fileUid, variantKind }) => {
                return variantKind
                    ? `/media/${fileUid}?variant=${variantKind}`
                    : `/media/${fileUid}`;
            }),
        };
        render(_jsx(FmMediaLibrary, { api: api, onSelect: vi.fn(), enableUpload: false, enableBulkActions: false }));
        await screen.findByText("hero-image.png");
        fireEvent.click(await screen.findByRole("button", {
            name: /select variant size/i,
        }));
        const variantMenuItem = await screen.findByRole("menuitem", {
            name: /select size:\s*640×480/i,
        });
        fireEvent.keyDown(variantMenuItem, { key: "Escape" });
        await waitFor(() => {
            expect(screen.queryByRole("menuitem", {
                name: /select size:\s*640×480/i,
            })).toBeNull();
        });
    });
});
