import { memo, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface ConversationItem {
  id: string;
  title: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ConversationList = memo(function ConversationList({
  conversations,
  onSelect,
  onDelete,
}: ConversationListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
      {conversations.map((conversation) => (
        <li
          key={conversation.id}
          onClick={() => onSelect(conversation.id)}
          onKeyDown={(e: KeyboardEvent<HTMLLIElement>) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(conversation.id);
            }
          }}
          tabIndex={0}
          role="button"
          className="p-3 hover:bg-gray-100 cursor-pointer rounded-lg transition-colors"
        >
          <span className="text-sm font-medium flex gap-2 items-center justify-between relative">
            {conversation.title}
            <Popover
              open={confirmId === conversation.id}
              onOpenChange={(open) =>
                setConfirmId(open ? conversation.id : null)
              }
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Delete conversation"
                  aria-haspopup="dialog"
                  aria-expanded={confirmId === conversation.id}
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    // Prevent triggering parent li selection
                    e.stopPropagation();
                  }}
                  onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      // Radix will toggle open automatically with Enter/Space
                    }
                  }}
                  className="text-red-600 border border-red-600 rounded px-2 py-0.5 text-xs hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Delete
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={6} className="w-56 p-3">
                <p className="text-xs text-gray-700">
                  Delete this conversation?
                </p>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conversation.id);
                      setConfirmId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </span>
        </li>
      ))}
    </ul>
  );
});
