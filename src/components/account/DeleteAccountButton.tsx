// DeleteAccountButton — GDPR self-service. Two-step confirm to
// prevent accidental clicks. Calls delete-account which cancels the
// Stripe subscription at period end, scrubs the profile, and
// hard-deletes auth.users. On success the user is logged out and
// returned to the homepage.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props { language?: "en" | "ru"; }

export const DeleteAccountButton = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function performDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw new Error(error.message);
      // Sign out client-side so the cached session can't interact with
      // the (now deleted) account row before the page navigates away.
      await supabase.auth.signOut();
      toast.success(t("Your account has been deleted.", "Аккаунт удалён."));
      navigate(ru ? "/ru" : "/");
    } catch (err) {
      toast.error((err as Error).message || t("Couldn't delete. Contact support.", "Не получилось. Напишите в поддержку."));
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 underline-offset-4 hover:underline"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {t("Delete account", "Удалить аккаунт")}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-rose-700 font-medium">
        {t("Permanently delete?", "Удалить навсегда?")}
      </span>
      <button
        onClick={performDelete}
        disabled={deleting}
        className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50"
      >
        {deleting ? t("Deleting…", "Удаляем…") : t("Yes, delete", "Да, удалить")}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={deleting}
        className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        {t("Cancel", "Отмена")}
      </button>
    </span>
  );
};
