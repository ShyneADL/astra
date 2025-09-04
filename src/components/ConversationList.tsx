import { memo } from "react";

interface ConversationItem {
  id: string;
  title: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  onSelect: (id: string) => void;
}

export const ConversationList = memo(function ConversationList({
  conversations,
  onSelect,
}: ConversationListProps) {
  return (
    <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
      {conversations.map((conversation) => (
        <li
          key={conversation.id}
          onClick={() => onSelect(conversation.id)}
          className="p-3 hover:bg-gray-100 cursor-pointer rounded-lg transition-colors"
        >
          <span className="text-sm font-medium">{conversation.title}</span>
        </li>
      ))}
    </ul>
  );
});
