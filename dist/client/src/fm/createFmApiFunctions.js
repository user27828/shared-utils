/**
 * Create a bag of standalone functions that delegate to an FmApi instance.
 *
 * Signatures are backward-compatible with the legacy `db-supabase/client/fm/api`
 * module, so consuming code can switch with minimal changes.
 */
export function createFmApiFunctions(api) {
    return {
        // ── Upload ────────────────────────────────────────────────────────
        fmUploadInitApi: (input) => api.uploadInit(input),
        fmUploadFinalizeApi: (input) => api.uploadFinalize(input),
        fmUploadProxiedApi: (input) => api.uploadProxied(input),
        // ── Variant upload ────────────────────────────────────────────────
        fmVariantUploadInitApi: (input) => api.variantUploadInit(input),
        fmVariantUploadFinalizeApi: (input) => api.variantUploadFinalize(input),
        fmVariantUploadProxiedApi: (input) => api.variantUploadProxied(input),
        // ── File CRUD ─────────────────────────────────────────────────────
        fmGetFileApi: (input) => api.getFile(input.fileUid),
        fmPatchFileApi: (input) => api.patchFile(input),
        fmListFilesApi: (params) => api.listFiles(params),
        // ── File lifecycle ────────────────────────────────────────────────
        fmArchiveFileApi: (input) => api.archiveFile(input.fileUid),
        fmRestoreFileApi: (input) => api.restoreFile(input.fileUid),
        fmDeleteFileApi: (input) => api.deleteFile(input),
        fmMoveFileApi: (input) => api.moveFile(input),
        // ── Metadata & URLs ─────────────────────────────────────────────
        fmListVariantsApi: (input) => api.listVariants(input.fileUid),
        fmGetReadUrlApi: (input) => api.getReadUrl(input),
        fmGetObjectMetadataApi: (input) => api.getObjectMetadata(input),
        // ── Links ───────────────────────────────────────────────────────
        fmListLinksApi: (input) => api.listLinks(input),
        fmCreateLinkApi: (input) => api.createLink(input),
        fmDeleteLinkApi: (input) => api.deleteLink(input),
        // ── Synchronous URL builders ────────────────────────────────────
        fmGetContentUrl: (input) => api.getContentUrl(input),
        fmGetProxyUploadUrl: (input) => api.getProxyUploadUrl(input.fileUid),
        fmGetVariantProxyUploadUrl: (input) => api.getVariantProxyUploadUrl(input.variantUid),
        fmGetPublicMediaUrl: (input) => api.getPublicMediaUrl(input.fileUid),
    };
}
