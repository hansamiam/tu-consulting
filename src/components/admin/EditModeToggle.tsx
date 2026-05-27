import { Pencil, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEditMode } from "@/contexts/EditModeContext";
import { isAdminUser } from "@/lib/adminMode";
import { Button } from "@/components/ui/button";

/**
 * Sticky pill at the top of admin-editable pages. Invisible to non-admins.
 * When ON, every `<InlineEdit>` on the page lights up with click-to-edit
 * affordance. When OFF, the page reads exactly as it does for the public.
 */
export const EditModeToggle = () => {
  const { user } = useAuth();
  const { isEditing, setEditing } = useEditMode();

  if (!isAdminUser(user)) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        type="button"
        size="sm"
        variant={isEditing ? "default" : "outline"}
        onClick={() => setEditing(!isEditing)}
        className={
          isEditing
            ? "bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/30 gap-1.5"
            : "bg-background/95 backdrop-blur shadow-md gap-1.5"
        }
      >
        {isEditing ? (
          <>
            <X className="size-3.5" />
            Exit edit mode
          </>
        ) : (
          <>
            <Pencil className="size-3.5" />
            Edit page
          </>
        )}
      </Button>
    </div>
  );
};
