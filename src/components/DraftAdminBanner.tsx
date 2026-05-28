import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

export const DraftAdminBanner = ({ slug }: { slug: string }) => (
  <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 print:hidden">
    <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs">
      <Eye className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1">
        <strong>Admin preview.</strong> "{slug}" is in <code className="px-1 py-0.5 rounded bg-amber-200/60 text-[11px]">draft</code> — public visitors see the Coming Soon wall.
      </span>
      <Link
        to="/admin/products"
        className="text-amber-900 hover:text-amber-950 underline font-medium"
      >
        Admin view
      </Link>
    </div>
  </div>
);

export default DraftAdminBanner;
