/**
 * In-memory FmConnector implementation for test-consumer.
 *
 * Goal: exercise `runFmConnectorConformanceTests()` without external services.
 */

const clone = (value) => {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const nowIso = () => new Date().toISOString();

const safeSearch = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\0/g, "").slice(0, 200);
};

const normalizeLimitOffset = (
  { limit, offset },
  defaults = { limit: 50, offset: 0 },
) => {
  const safeOffset = Number.isFinite(offset)
    ? Math.max(0, offset)
    : defaults.offset;
  const safeLimit = Number.isFinite(limit)
    ? Math.max(0, limit)
    : defaults.limit;
  return { limit: safeLimit, offset: safeOffset };
};

export class InMemoryFmConnector {
  constructor() {
    this._files = new Map(); // uid -> FmFileRow
    this._variants = new Map(); // uid -> FmFileVariantRow
    this._links = []; // array of FmFileLinkRow
    this._linkSeq = 0;
  }

  reset() {
    this._files.clear();
    this._variants.clear();
    this._links = [];
    this._linkSeq = 0;
  }

  // ── File CRUD ───────────────────────────────────────────────────────

  async getFileByUid(uid) {
    return this._files.has(uid) ? clone(this._files.get(uid)) : null;
  }

  async insertFile(row) {
    const createdAt = row.created_at ?? nowIso();
    const full = {
      ...clone(row),
      uid: row.uid,
      created_at: createdAt,
      updated_at: row.updated_at ?? createdAt,
      archived_at: row.archived_at ?? null,
      tags: row.tags ?? [],
    };

    this._files.set(row.uid, full);
    return clone(full);
  }

  async updateFileByUid(uid, patch) {
    const existing = this._files.get(uid);
    if (!existing) {
      return null;
    }

    const updated = {
      ...clone(existing),
      ...clone(patch),
      uid,
      updated_at: nowIso(),
    };

    this._files.set(uid, updated);
    return clone(updated);
  }

  async deleteFileByUid(uid) {
    this._files.delete(uid);

    // Cascade: variants
    for (const [variantUid, variant] of this._variants.entries()) {
      if (variant.variant_of_uid === uid) {
        this._variants.delete(variantUid);
      }
    }

    // Cascade: links
    this._links = this._links.filter((l) => l.file_uid !== uid);
  }

  async listFiles(params) {
    const safeParams = params ? clone(params) : {};

    let items = Array.from(this._files.values());

    if (safeParams.ownerUserUid) {
      items = items.filter((f) => f.owner_user_uid === safeParams.ownerUserUid);
    }

    if (typeof safeParams.isPublic === "boolean") {
      items = items.filter((f) => f.is_public === safeParams.isPublic);
    }

    const includeArchived = safeParams.includeArchived === true;
    if (!includeArchived) {
      items = items.filter((f) => !f.archived_at);
    }

    const q = safeSearch(safeParams.search).toLowerCase();
    if (q) {
      items = items.filter((f) => {
        const hay =
          `${f.title ?? ""} ${f.alt_text ?? ""} ${f.original_filename ?? ""} ${f.uid ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const totalCount = items.length;

    const { limit, offset } = normalizeLimitOffset(safeParams, {
      limit: 50,
      offset: 0,
    });

    const orderBy = safeParams.orderBy ?? "created_at";
    const orderDirection = safeParams.orderDirection === "asc" ? "asc" : "desc";

    const dir = orderDirection === "asc" ? 1 : -1;

    const getOrderValue = (row) => {
      const v = row[orderBy];
      if (typeof v === "number") {
        return v;
      }
      if (typeof v === "string") {
        return v;
      }
      return "";
    };

    items.sort((a, b) => {
      const av = getOrderValue(a);
      const bv = getOrderValue(b);

      if (av < bv) {
        return -1 * dir;
      }
      if (av > bv) {
        return 1 * dir;
      }

      // Stable tie-breaker
      return String(a.uid).localeCompare(String(b.uid));
    });

    const page = items.slice(offset, offset + limit).map((f) => clone(f));

    return {
      items: page,
      totalCount,
      limit,
      offset,
    };
  }

  // ── Variant CRUD ────────────────────────────────────────────────────

  async getVariantByUid(uid) {
    return this._variants.has(uid) ? clone(this._variants.get(uid)) : null;
  }

  async listVariantsForFile(fileUid) {
    const variants = [];
    for (const row of this._variants.values()) {
      if (row.variant_of_uid === fileUid) {
        variants.push(clone(row));
      }
    }

    variants.sort((a, b) => String(a.uid).localeCompare(String(b.uid)));
    return variants;
  }

  async insertVariant(row) {
    const createdAt = row.created_at ?? nowIso();
    const full = {
      ...clone(row),
      uid: row.uid,
      created_at: createdAt,
      updated_at: row.updated_at ?? createdAt,
    };

    this._variants.set(row.uid, full);
    return clone(full);
  }

  async updateVariantByUid(uid, patch) {
    const existing = this._variants.get(uid);
    if (!existing) {
      return null;
    }

    const updated = {
      ...clone(existing),
      ...clone(patch),
      uid,
      updated_at: nowIso(),
    };

    this._variants.set(uid, updated);
    return clone(updated);
  }

  async deleteVariantsForFile(fileUid) {
    for (const [variantUid, row] of this._variants.entries()) {
      if (row.variant_of_uid === fileUid) {
        this._variants.delete(variantUid);
      }
    }
  }

  // ── Links ───────────────────────────────────────────────────────────

  async countLinksForFile(fileUid) {
    return this._links.filter((l) => l.file_uid === fileUid).length;
  }

  async createLink(row) {
    const id = ++this._linkSeq;
    const full = {
      ...clone(row),
      id,
      created_at: row.created_at ?? nowIso(),
    };

    this._links.push(full);
    return clone(full);
  }

  async deleteLink({
    fileUid,
    linkedEntityType,
    linkedEntityUid,
    linkedField,
  }) {
    this._links = this._links.filter((l) => {
      if (l.file_uid !== fileUid) {
        return true;
      }
      if (l.linked_entity_type !== linkedEntityType) {
        return true;
      }
      if (l.linked_entity_uid !== linkedEntityUid) {
        return true;
      }
      if (linkedField) {
        return l.linked_field !== linkedField;
      }
      return false;
    });
  }

  async listLinksForFile(fileUid, params = {}) {
    const safeParams = params ? clone(params) : {};

    const { limit, offset } = normalizeLimitOffset(safeParams, {
      limit: 50,
      offset: 0,
    });

    let items = this._links.filter((l) => l.file_uid === fileUid);
    const totalCount = items.length;

    items = items
      .slice()
      .sort((a, b) => {
        // newest first by id
        if (a.id !== b.id) {
          return a.id < b.id ? 1 : -1;
        }
        return String(a.file_uid).localeCompare(String(b.file_uid));
      })
      .slice(offset, offset + limit)
      .map((l) => clone(l));

    return {
      items,
      totalCount,
      limit,
      offset,
    };
  }
}
