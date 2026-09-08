import type { Access } from "payload";

/** Anyone may read published documents; editors may read everything. */
export const publishedOrAuthenticated: Access = ({ req }) => {
  if (req.user) return true;
  return { _status: { equals: "published" } };
};

export const authenticated: Access = ({ req }) => Boolean(req.user);
