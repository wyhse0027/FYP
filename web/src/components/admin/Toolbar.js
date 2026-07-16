import React from "react";
import { IoSearchOutline } from "react-icons/io5";

export default function Toolbar({ search, filters, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      {search && (
        <div className="relative flex-1">
          <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-mut" />
          <input
            className="fld w-full rounded-full pl-10 pr-4 py-3 text-sm"
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
          />
        </div>
      )}
      {filters}
      {action && <div className="sm:ml-auto">{action}</div>}
    </div>
  );
}
