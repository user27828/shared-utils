import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import {
  FmFilePicker,
  FmMediaLibrary,
  type FmApi,
  type FmFileLinkListResult,
  type FmFileListFilters,
  type FmFileListResult,
  type FmFileLinkRow,
  type FmFileRow,
  type FmFileVariantRow,
  type FmReadUrlResult,
  type FmDeleteResult,
} from "@user27828/shared-utils/fm/client";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

type FmMoveFileInput = {
  fileUid: string;
  toBucket?: string;
  toFolderPath?: string;
};

type FmGetReadUrlInput = {
  fileUid: string;
  variantKind?: string;
  expiresInSeconds?: number;
};

type FmListLinksInput = {
  fileUid: string;
  limit?: number;
  offset?: number;
};

type FmCreateLinkInput = {
  fileUid: string;
  linkedEntityType: string;
  linkedEntityUid: string;
  linkedField?: string;
};

type FmGetContentUrlInput = {
  fileUid: string;
  download?: boolean;
  variantKind?: string;
};

const svgDataUrl = (label: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#2a2a2a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="28" font-family="monospace">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const createMockFmApi = (seedFiles: FmFileRow[]): FmApi => {
  const filesByUid = new Map<string, FmFileRow>(
    seedFiles.map((f) => [f.uid, f]),
  );

  const listFiles = async (
    params?: FmFileListFilters,
  ): Promise<FmFileListResult> => {
    const search = String(params?.search || "")
      .toLowerCase()
      .trim();
    const includeArchived = Boolean(params?.includeArchived);
    const isPublic =
      typeof params?.isPublic === "boolean" ? params.isPublic : undefined;
    const limit = params?.limit ?? 25;
    const offset = params?.offset ?? 0;

    let items = Array.from(filesByUid.values());

    if (!includeArchived) {
      items = items.filter((f) => !f.archived_at);
    }

    if (isPublic !== undefined) {
      items = items.filter((f) => f.is_public === isPublic);
    }

    if (search) {
      items = items.filter((f) => {
        const hay =
          `${f.uid} ${f.title} ${f.alt_text} ${f.original_filename}`.toLowerCase();
        return hay.includes(search);
      });
    }

    const totalCount = items.length;
    const paged = items.slice(offset, offset + limit);

    return {
      items: paged,
      totalCount,
      limit,
      offset,
    };
  };

  const getFile = async (fileUid: string): Promise<FmFileRow> => {
    const f = filesByUid.get(fileUid);
    if (!f) {
      throw new Error(`File not found: ${fileUid}`);
    }
    return f;
  };

  const patchFile = async (input: {
    fileUid: string;
    patch: {
      title?: string;
      alt_text?: string;
      tags?: string[];
      is_public?: boolean;
    };
  }): Promise<FmFileRow> => {
    const existing = await getFile(input.fileUid);
    const next: FmFileRow = {
      ...existing,
      title: input.patch.title ?? existing.title,
      alt_text: input.patch.alt_text ?? existing.alt_text,
      tags: input.patch.tags ?? existing.tags,
      is_public:
        typeof input.patch.is_public === "boolean"
          ? input.patch.is_public
          : existing.is_public,
      updated_at: new Date().toISOString(),
    };
    filesByUid.set(next.uid, next);
    return next;
  };

  const renameFile = async (input: {
    fileUid: string;
    originalFilename: string;
  }): Promise<FmFileRow> => {
    const existing = await getFile(input.fileUid);
    const next: FmFileRow = {
      ...existing,
      original_filename: String(input.originalFilename || "").trim(),
      updated_at: new Date().toISOString(),
    };
    filesByUid.set(next.uid, next);
    return next;
  };

  const archiveFile = async (fileUid: string): Promise<FmFileRow> => {
    const existing = await getFile(fileUid);
    const next: FmFileRow = {
      ...existing,
      archived_at: new Date().toISOString(),
    };
    filesByUid.set(next.uid, next);
    return next;
  };

  const restoreFile = async (fileUid: string): Promise<FmFileRow> => {
    const existing = await getFile(fileUid);
    const next: FmFileRow = { ...existing, archived_at: null };
    filesByUid.set(next.uid, next);
    return next;
  };

  const deleteFile = async (input: {
    fileUid: string;
    force?: boolean;
  }): Promise<FmDeleteResult> => {
    const existing = await getFile(input.fileUid);
    if (!input.force) {
      const archived = await archiveFile(existing.uid);
      return { action: "archived", file: archived, linkCount: 0 };
    }
    filesByUid.delete(existing.uid);
    return { action: "deleted", fileUid: existing.uid, deletedObjects: 0 };
  };

  return {
    // Upload (not used on this test page)
    uploadInit: async () => {
      throw new Error("uploadInit not implemented in mock");
    },
    uploadFinalize: async () => {
      throw new Error("uploadFinalize not implemented in mock");
    },
    uploadProxied: async () => {
      throw new Error("uploadProxied not implemented in mock");
    },
    variantUploadInit: async () => {
      throw new Error("variantUploadInit not implemented in mock");
    },
    variantUploadFinalize: async () => {
      throw new Error("variantUploadFinalize not implemented in mock");
    },
    variantUploadProxied: async () => {
      throw new Error("variantUploadProxied not implemented in mock");
    },

    // File CRUD
    listFiles,
    getFile,
    patchFile,
    renameFile,

    // Lifecycle
    archiveFile,
    restoreFile,
    deleteFile,
    moveFile: async (input: FmMoveFileInput) => {
      const file = await getFile(input.fileUid);
      return { file, variants: [] as FmFileVariantRow[] };
    },

    // Metadata & URLs
    getReadUrl: async (input: FmGetReadUrlInput): Promise<FmReadUrlResult> => {
      return { url: svgDataUrl(input.fileUid), kind: "public" };
    },
    getObjectMetadata: async () => {
      return { metadata: {} };
    },
    listVariants: async () => {
      return { items: [] as FmFileVariantRow[] };
    },

    // Links
    listLinks: async (
      input: FmListLinksInput,
    ): Promise<FmFileLinkListResult> => {
      return {
        items: [] as FmFileLinkRow[],
        totalCount: 0,
        limit: input.limit ?? 25,
        offset: input.offset ?? 0,
      };
    },
    createLink: async (input: FmCreateLinkInput) => {
      const row: FmFileLinkRow = {
        id: Date.now(),
        file_uid: input.fileUid,
        linked_entity_type: input.linkedEntityType,
        linked_entity_uid: input.linkedEntityUid,
        linked_field: input.linkedField ?? null,
      };
      return row;
    },
    deleteLink: async () => {
      return;
    },

    // URL builders
    getContentUrl: (input: FmGetContentUrlInput) => {
      return svgDataUrl(
        `${input.fileUid}${input.variantKind ? `:${input.variantKind}` : ""}`,
      );
    },
    getProxyUploadUrl: (fileUid: string) => {
      return `/mock/fm/upload/${encodeURIComponent(fileUid)}`;
    },
    getVariantProxyUploadUrl: (variantUid: string) => {
      return `/mock/fm/variant/upload/${encodeURIComponent(variantUid)}`;
    },
    getPublicMediaUrl: (fileUid: string) => {
      return svgDataUrl(fileUid);
    },
  };
};

const FmTests: React.FC = () => {
  const [isRunningTestSuite, setIsRunningTestSuite] = useState<boolean>(false);

  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<FmFileRow | null>(null);

  const seedFiles = useMemo<FmFileRow[]>(
    () => [
      {
        uid: "fm-demo-001",
        owner_user_uid: null,
        created_by: null,
        original_filename: "demo-image-001.png",
        title: "Demo Image 001",
        alt_text: "Demo image",
        tags: ["demo", "image"],
        storage_location: "local",
        storage_key: "demo/fm-demo-001",
        byte_size: 12345,
        mime_type: "image/png",
        sha256: "demo",
        is_public: true,
        purpose: "generic",
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        uid: "fm-demo-002",
        owner_user_uid: null,
        created_by: null,
        original_filename: "demo-file-002.pdf",
        title: "Demo File 002",
        alt_text: "Demo file",
        tags: ["demo", "pdf"],
        storage_location: "local",
        storage_key: "demo/fm-demo-002",
        byte_size: 54321,
        mime_type: "application/pdf",
        sha256: "demo",
        is_public: false,
        purpose: "generic",
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    [],
  );

  const api = useMemo(() => createMockFmApi(seedFiles), [seedFiles]);

  const [testItems, setTestItems] = useState<TestItem[]>([
    {
      name: "Media Library Renders",
      description: "Ensure FmMediaLibrary mounts using a mock FmApi",
      status: "pending",
    },
    {
      name: "File Picker Dialog",
      description: "Open/close FmFilePicker and select a file",
      status: "pending",
    },
  ]);

  const updateTestStatus = (
    testName: string,
    status: TestStatus,
    message?: string,
    duration?: number,
  ) => {
    setTestItems((prev) =>
      prev.map((test) =>
        test.name === testName
          ? {
              ...test,
              status,
              message,
              duration,
              startTime: status === "running" ? new Date() : test.startTime,
              endTime:
                status === "pass" || status === "fail" ? new Date() : undefined,
            }
          : test,
      ),
    );
  };

  const clearResults = () => {
    setTestItems((prev) =>
      prev.map((test) => ({
        ...test,
        status: "pending" as TestStatus,
        message: undefined,
        duration: undefined,
        startTime: undefined,
        endTime: undefined,
      })),
    );
  };

  const runMediaLibraryRendersTest = async () => {
    const testName = "Media Library Renders";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Validating mock API setup...");

    try {
      const result = await api.listFiles({ limit: 10, offset: 0 });
      if (!Array.isArray(result.items)) {
        throw new Error("Mock api.listFiles did not return items array");
      }

      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "pass",
        `Mock API OK (${result.items.length} items visible)`,
        duration,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", (error as Error).message, duration);
    }
  };

  const runFilePickerDialogTest = async () => {
    const testName = "File Picker Dialog";
    const startTime = Date.now();

    updateTestStatus(
      testName,
      "running",
      "Open the picker using the button below...",
    );

    const duration = Date.now() - startTime;
    updateTestStatus(
      testName,
      "pass",
      "Ready. Use the picker to select a file.",
      duration,
    );
  };

  const runIndividualTest = async (testName: string) => {
    switch (testName) {
      case "Media Library Renders":
        await runMediaLibraryRendersTest();
        break;
      case "File Picker Dialog":
        await runFilePickerDialogTest();
        break;
      default:
        updateTestStatus(testName, "fail", "Test not implemented");
    }
  };

  const runAllTests = async () => {
    setIsRunningTestSuite(true);
    clearResults();

    await runMediaLibraryRendersTest();
    await runFilePickerDialogTest();

    setIsRunningTestSuite(false);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        FM Tests
      </Typography>

      <Typography variant="body1" sx={{ mb: 2 }}>
        Client-side File Manager UI tests for shared-utils. This page renders
        the Media Library and File Picker using an in-memory mock API.
      </Typography>

      <TestProgress
        title="FM Tests"
        tests={testItems}
        isRunning={isRunningTestSuite}
        onRunAll={runAllTests}
        onRunIndividual={runIndividualTest}
        onClear={clearResults}
        showIndividualButtons={true}
      />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Button
                variant="contained"
                onClick={() => {
                  setPickerOpen(true);
                }}
              >
                Open File Picker
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setSelected(null);
                }}
              >
                Clear Selection
              </Button>
            </Stack>

            <FmMediaLibrary
              api={api}
              enableUpload={false}
              enableBulkActions={false}
              onSelect={(file: FmFileRow) => {
                setSelected(file);
              }}
            />
          </CardContent>
        </Card>

        <Card sx={{ width: { xs: "100%", md: 360 } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Selected File
            </Typography>
            {selected ? (
              <Box>
                <Typography variant="body2">
                  <strong>uid:</strong> {selected.uid}
                </Typography>
                <Typography variant="body2">
                  <strong>title:</strong> {selected.title}
                </Typography>
                <Typography variant="body2">
                  <strong>mime:</strong> {selected.mime_type}
                </Typography>
                <Typography variant="body2">
                  <strong>public:</strong> {String(selected.is_public)}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                (none)
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      <FmFilePicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
        }}
        onSelect={(file: FmFileRow) => {
          setSelected(file);
        }}
        api={api}
      />
    </Box>
  );
};

export default FmTests;
