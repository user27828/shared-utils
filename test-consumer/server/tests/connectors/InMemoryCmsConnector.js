/**
 * In-memory CmsConnector implementation for test-consumer.
 *
 * Goal: exercise `runCmsConnectorConformanceTests()` without external services.
 */

const clone = (value) => {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const nowIso = () => new Date().toISOString();

export class InMemoryCmsConnector {
  constructor() {
    this._heads = new Map(); // uid -> CmsHeadRow
    this._history = new Map(); // id(number) -> CmsHistoryRow
    this._historySeq = 0;
    this._collaborators = new Map(); // cmsUid -> CmsCollaboratorRow[]
  }

  reset() {
    this._heads.clear();
    this._history.clear();
    this._historySeq = 0;
    this._collaborators.clear();
  }

  async getByUid(uid) {
    return this._heads.has(uid) ? clone(this._heads.get(uid)) : null;
  }

  async insert(row) {
    const full = {
      ...clone(row),
      uid: row.uid,
      created_at: row.created_at ?? nowIso(),
      updated_at: row.updated_at ?? nowIso(),
    };
    this._heads.set(row.uid, full);
    return clone(full);
  }

  async updateByUid(uid, patch) {
    const existing = this._heads.get(uid);
    if (!existing) {
      return null;
    }

    const updated = {
      ...clone(existing),
      ...clone(patch),
      uid,
      updated_at: nowIso(),
    };

    this._heads.set(uid, updated);
    return clone(updated);
  }

  async deleteByUid(uid) {
    this._heads.delete(uid);
    // Keep history/collaborators as-is; real DB would likely cascade but conformance
    // does not require it.
  }

  async list(params) {
    const safeParams = params ? clone(params) : {};

    let items = Array.from(this._heads.values());

    if (safeParams.status) {
      items = items.filter((r) => r.status === safeParams.status);
    }

    if (safeParams.post_type) {
      items = items.filter((r) => r.post_type === safeParams.post_type);
    }

    if (safeParams.locale) {
      items = items.filter((r) => r.locale === safeParams.locale);
    }

    if (safeParams.includeTrash !== true) {
      items = items.filter((r) => !r.archived_at);
    }

    // Light search support: match against slug/title/uid
    if (typeof safeParams.q === "string" && safeParams.q.trim()) {
      const q = safeParams.q
        .trim()
        .toLowerCase()
        .replace(/\0/g, "")
        .slice(0, 200);
      items = items.filter((r) => {
        const hay =
          `${r.uid ?? ""} ${r.slug ?? ""} ${r.title ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const totalCount = items.length;

    const offset = Number.isFinite(safeParams.offset)
      ? Math.max(0, safeParams.offset)
      : 0;
    const limit = Number.isFinite(safeParams.limit)
      ? Math.max(0, safeParams.limit)
      : 50;

    // Deterministic order: updated_at desc, then created_at desc, then uid asc
    items.sort((a, b) => {
      const au = a.updated_at ?? "";
      const bu = b.updated_at ?? "";
      if (au !== bu) {
        return au < bu ? 1 : -1;
      }
      const ac = a.created_at ?? "";
      const bc = b.created_at ?? "";
      if (ac !== bc) {
        return ac < bc ? 1 : -1;
      }
      const aUid = a.uid ?? "";
      const bUid = b.uid ?? "";
      return aUid.localeCompare(bUid);
    });

    const page = items.slice(offset, offset + limit).map((r) => clone(r));

    return {
      items: page,
      totalCount,
      limit,
      offset,
    };
  }

  async getPublishedBySlug({ postType, locale, slug }) {
    const now = Date.now();

    for (const row of this._heads.values()) {
      if (row.status !== "published") {
        continue;
      }
      if (row.archived_at) {
        continue;
      }
      if (
        row.post_type !== postType ||
        row.locale !== locale ||
        row.slug !== slug
      ) {
        continue;
      }

      if (row.published_at) {
        const publishedAt = Date.parse(row.published_at);
        if (Number.isFinite(publishedAt) && publishedAt > now) {
          continue;
        }
      }

      return clone(row);
    }

    return null;
  }

  async insertHistory(row) {
    const id = ++this._historySeq;

    const revision = row.revision ?? row.version ?? 1;
    const createdBy =
      row.created_by ?? row.changed_by ?? row.owner_user_uid ?? null;

    // Store entire input as snapshot if none provided.
    const snapshot = row.snapshot ?? clone(row);

    const hist = {
      ...clone(row),
      id,
      revision,
      snapshot,
      created_by: createdBy,
      created_at: row.created_at ?? nowIso(),
      soft_deleted_at: row.soft_deleted_at ?? null,
      is_deleted: Boolean(row.soft_deleted_at),
    };

    this._history.set(id, hist);
    return clone(hist);
  }

  async listHistory({
    cmsUid,
    limit = 50,
    offset = 0,
    includeSoftDeleted = false,
  }) {
    let items = Array.from(this._history.values()).filter(
      (h) => h.cms_uid === cmsUid,
    );

    if (!includeSoftDeleted) {
      items = items.filter((h) => !h.soft_deleted_at);
    }

    // Deterministic: newest first by id
    items.sort((a, b) => (a.id < b.id ? 1 : -1));

    const totalCount = items.length;
    const safeOffset = Math.max(0, offset || 0);
    const safeLimit = Math.max(0, limit || 50);

    const page = items
      .slice(safeOffset, safeOffset + safeLimit)
      .map((h) => clone(h));

    return { items: page, totalCount };
  }

  async getHistoryById(id) {
    return this._history.has(id) ? clone(this._history.get(id)) : null;
  }

  async updateHistoryById(id, patch) {
    const existing = this._history.get(id);
    if (!existing) {
      return null;
    }

    const softDeletedAt =
      patch.soft_deleted_at ?? existing.soft_deleted_at ?? null;

    const updated = {
      ...clone(existing),
      ...clone(patch),
      id,
      soft_deleted_at: softDeletedAt,
      is_deleted: Boolean(softDeletedAt),
      updated_at: nowIso(),
    };

    this._history.set(id, updated);
    return clone(updated);
  }

  async deleteHistoryById(id) {
    this._history.delete(id);
  }

  async listCollaborators(cmsUid) {
    const rows = this._collaborators.get(cmsUid) ?? [];
    return clone(rows);
  }

  async replaceCollaborators(cmsUid, collaborators) {
    const safe = Array.isArray(collaborators) ? collaborators : [];

    const normalized = safe.map((c, idx) => {
      return {
        id: idx + 1,
        cms_uid: cmsUid,
        user_uid: c.user_uid,
        role: c.role,
        created_at: nowIso(),
      };
    });

    this._collaborators.set(cmsUid, normalized);
    return clone(normalized);
  }
}
