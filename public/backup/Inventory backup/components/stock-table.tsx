import { InspectStockButton } from "./inspect-stock-button";

// In your table columns
{
  id: "actions",
  cell: ({ row }) => {
    const stock = row.original;
    return (
      <div className="flex items-center gap-2">
        <InspectStockButton stock={stock} />
        {/* Other actions */}
      </div>
    );
  },
} 