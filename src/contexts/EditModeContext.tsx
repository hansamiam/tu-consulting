import { createContext, useContext, useState, ReactNode } from "react";

/**
 * Edit mode is a per-page toggle that admin users opt into when they want to
 * fix typos / eligibility / etc. directly on the public scholarship detail
 * page. When off, `<InlineEdit>` children render passthrough (read-only).
 *
 * Not persisted — leaving the page resets it. That's intentional: returning
 * to a public page should always show the public view first.
 */

interface EditModeContextValue {
  isEditing: boolean;
  setEditing: (next: boolean) => void;
}

const EditModeContext = createContext<EditModeContextValue>({
  isEditing: false,
  setEditing: () => {},
});

export const EditModeProvider = ({ children }: { children: ReactNode }) => {
  const [isEditing, setEditing] = useState(false);
  return (
    <EditModeContext.Provider value={{ isEditing, setEditing }}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => useContext(EditModeContext);
