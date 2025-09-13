import {
  memo,
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { MoreVertical, Edit, Trash2, Check, X } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConversationItem {
  id: string;
  title: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export const ConversationList = memo(function ConversationList({
  conversations,
  onSelect,
  onDelete,
  onRename,
}: ConversationListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleRenameClick = (conversation: ConversationItem) => {
    setEditValue(conversation.title);
    setEditingId(conversation.id);
    setMenuOpenId(null);
  };

  const handleSaveRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleDeleteClick = (conversationId: string) => {
    setDeleteDialogId(conversationId);
    setMenuOpenId(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteDialogId) {
      onDelete(deleteDialogId);
      setDeleteDialogId(null);
    }
  };

  return (
    <>
      <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
        {conversations.map((conversation) => (
          <li
            key={conversation.id}
            onClick={() =>
              editingId !== conversation.id && onSelect(conversation.id)
            }
            onKeyDown={(e: KeyboardEvent<HTMLLIElement>) => {
              if (
                (e.key === "Enter" || e.key === " ") &&
                editingId !== conversation.id
              ) {
                e.preventDefault();
                onSelect(conversation.id);
              }
            }}
            tabIndex={editingId === conversation.id ? -1 : 0}
            role="button"
            className={`p-3 rounded-lg transition-colors ${
              editingId === conversation.id
                ? "bg-blue-50"
                : "hover:bg-gray-100 cursor-pointer"
            }`}
          >
            <span className="text-sm font-medium flex gap-2 items-center justify-between relative">
              {editingId === conversation.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        handleSaveRename();
                      } else if (e.key === "Escape") {
                        handleCancelRename();
                      }
                    }}
                    className="h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveRename();
                    }}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    disabled={!editValue.trim()}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelRename();
                    }}
                    className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 truncate">{conversation.title}</span>
                  <Popover
                    open={menuOpenId === conversation.id}
                    onOpenChange={(open) =>
                      setMenuOpenId(open ? conversation.id : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="More options"
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                        }}
                        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        className="p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={6}
                      className="w-40 p-1"
                    >
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameClick(conversation);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          Rename
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(conversation.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteDialogId}
        onOpenChange={() => setDeleteDialogId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this conversation? This action
              cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
