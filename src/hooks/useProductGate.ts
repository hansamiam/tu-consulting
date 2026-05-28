import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser, isAdminBypass } from "@/lib/adminMode";
import { isPublished } from "@/lib/productCatalog";

/**
 * Hook that resolves whether the current visitor can view the full
 * content of a product on TopUni. Different admin-detection from LF
 * — TU uses an email allowlist + localStorage flag (lib/adminMode.ts)
 * rather than a user_roles table query.
 *
 * Returns:
 *   canView   — true if visitor sees the full product
 *   isAdmin   — true if user is on the admin allowlist OR the local
 *               bypass flag is set
 *   published — resolved per-product status
 */
export const useProductGate = (slug: string) => {
  const { user } = useAuth();
  const adminViaAllowlist = isAdminUser(user as { email?: string | null } | null);
  const adminViaLocalBypass = isAdminBypass();
  const isAdmin = adminViaAllowlist || adminViaLocalBypass;
  const published = isPublished(slug);
  const canView = published || isAdmin;
  return { canView, isAdmin, published };
};
