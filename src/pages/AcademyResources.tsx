// /academy/resources · /academy/resources/ru — admin-only gateway.
//
// The Resources library is treated as a lead-magnet staging area
// (PDFs, frameworks, deep-dives for IG / newsletter / outreach
// campaigns), not a public-facing product. The members-area framing
// here was creating a half-built "coming soon" surface for any visitor
// who guessed the URL.
//
// This route now redirects:
//   · admins → /admin/academy/resources (the upload + manage panel)
//   · everyone else → /academy
//
// Source of truth for the file/link library lives at
// src/pages/admin/AcademyResources.tsx (CRUD on academy_resources).
// Publish a row from there to expose it; nothing here renders content
// directly anymore, so no risk of a stale public surface.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser, isAdminBypass, consumeAdminUrlFlag } from "@/lib/adminMode";

interface AcademyResourcesProps { language?: "en" | "ru"; }

const AcademyResources = ({ language = "en" }: AcademyResourcesProps) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    consumeAdminUrlFlag(); // allow ?admin=1 to flip the bypass on entry
    const admin = isAdminUser(user) || isAdminBypass();
    if (admin) {
      navigate("/admin/academy/resources", { replace: true });
    } else {
      navigate(language === "ru" ? "/academy/ru" : "/academy", { replace: true });
    }
  }, [loading, user, navigate, language]);

  return null;
};

export default AcademyResources;
