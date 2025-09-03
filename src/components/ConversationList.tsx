import { memo } from "react";

interface ConversationListProps {
  conversations: Array<{ id: string; title: string }>;
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
          className="text-sm text-gray-800 py-2 px-3 rounded-md hover:bg-gray-100 cursor-pointer"
        >
          {conversation.title}
        </li>
      ))}
    </ul>
  );
});
