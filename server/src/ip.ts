// Robust client IP detection for server-side requests.
// Supports common proxies and IPv6 address formats.
export const getClientIp = (req: Request): string | undefined => {
  // Helper to normalize an IP (strip port, surrounding brackets for IPv6)
  const normalizeIp = (ip?: string | null): string | undefined => {
    if (!ip) {
      return undefined;
    }
    let out = ip.trim();
    // If the IP is in the form "::ffff:127.0.0.1" return the IPv4 part
    // but keep IPv6 otherwise.
    // Remove surrounding IPv6 brackets like "[::1]" which appear in some headers.
    if (out.startsWith("[") && out.endsWith("]")) {
      out = out.slice(1, -1);
    }
    // If there's a port suffix like "1.2.3.4:5678" or "[::1]:8080", strip it.
    const portIndex = out.lastIndexOf(":");
    if (portIndex !== -1) {
      // For IPv6 addresses the last ':' is not a port separator, so only
      // consider it a port separator when there are no other ':' characters
      // (i.e., looks like IPv4:port) or when the address contains ']' (brackets removed above).
      const hasMultipleColons = out.indexOf(":") !== portIndex;
      if (!hasMultipleColons) {
        out = out.slice(0, portIndex);
      }
    }
    // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
    const ipv4Mapped = out.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (ipv4Mapped) {
      return ipv4Mapped[1];
    }
    return out || undefined;
  };

  // Common headers that may contain the client IP
  const headers = (req as any).headers as Record<string, unknown> | undefined;
  if (headers) {
    const headerKeys = [
      "x-client-ip",
      "x-forwarded-for",
      "x-real-ip",
      "cf-connecting-ip",
      "fastly-client-ip",
      "true-client-ip",
      "x-cluster-client-ip",
    ];

    for (const key of headerKeys) {
      const val = headers[key];
      if (!val) {
        continue;
      }
      if (typeof val === "string") {
        // x-forwarded-for can be a comma separated list. The left-most is the originating client.
        const parts = val
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length > 0) {
          const ip = normalizeIp(parts[0]);
          if (ip) {
            return ip;
          }
        }
      } else if (Array.isArray(val)) {
        // If header is an array, take the first non-empty entry
        for (const entry of val) {
          if (typeof entry === "string" && entry.trim()) {
            const ip = normalizeIp(entry);
            if (ip) {
              return ip;
            }
          }
        }
      }
    }
  }

  // Fallbacks on Request-like socket properties. Different runtimes expose
  // different shapes (Express's Request, Node's IncomingMessage, etc.).
  const anyReq = req as any;
  const socketCandidates = [
    anyReq.ip, // Express-compatible
    anyReq.connection && anyReq.connection.remoteAddress,
    anyReq.socket && anyReq.socket.remoteAddress,
    anyReq.connection &&
      anyReq.connection.socket &&
      anyReq.connection.socket.remoteAddress,
  ];

  for (const candidate of socketCandidates) {
    if (typeof candidate === "string" && candidate) {
      const ip = normalizeIp(candidate);
      if (ip) {
        return ip;
      }
    }
  }

  return undefined;
};
