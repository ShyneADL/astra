# Astra - AI-Powered Chat Application

Astra is a modern, real-time chat application that leverages Google's Gemini AI for intelligent conversations. Built with React, TypeScript, and Vite, it offers a seamless chat experience with features like conversation management, real-time typing indicators, and AI-powered responses.

![Astra Demo](public/logo.png)

## 🌟 Features

- **Real-time AI chat with streaming** via Google Gemini, providing token-by-token responses for instant feedback
- **Session-aware conversations** saved in Supabase (`chat_sessions`, `chat_messages`)
- **Automatic session creation on server** and propagation to the client via `X-Conversation-Id`
- **Secure authentication** with Supabase and Bearer tokens
- **Sidebar conversation list** with TanStack Query caching and virtualization for large histories
- **Smart auto-scroll** only when the user is at the bottom during streaming
- **Keyboard-friendly UX** (Enter to send, Shift+Enter for newline)
- **Auto-resizing input** for comfortable typing backed by a custom hook
- **TypeScript-first** codebase for safety and maintainability

## 🚀 Technologies Used

### Frontend

- **React 19** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **shadcn/ui** for UI components
- **React Hook Form** with Zod for form validation
- **TanStack Query** for server state management
- **Lucide React** for icons

### Backend

- **Supabase**
  - Authentication
  - Database
  - Real-time subscriptions
- **Google Gemini AI** for chat responses
- **Streaming API** implementation
- **ElevenLabs** for voice chat

## 🔍 Key Technical Implementations

### Client streaming fetch (Conversation)

Path: `src/components/chat/Conversation.tsx` in `handleSendMessage`

```tsx
const response = await fetch(`${API_URL}/api/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  },
  body: JSON.stringify({
    messages: updatedMessages.map(({ sender, content }) => ({
      role: sender === "user" ? "user" : "assistant",
      content,
    })),
    // Prefer globally selected conversation; fall back to local when missing
    conversationId: selectedId ?? conversationId,
    message: currentInput,
    wantTitle: false,
  }),
});

// Adopt the server-issued conversation id so subsequent sends are consistent
const serverConversationId = response.headers.get("X-Conversation-Id");
if (serverConversationId) {
  if (conversationId !== serverConversationId)
    setConversationId(serverConversationId);
  if (selectedId !== serverConversationId) setSelectedId(serverConversationId);
}

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let aiResponse = "";
let lastUpdateTime = 0;
const throttleMs = 16; // ~60fps UI updates

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  aiResponse += decoder.decode(value, { stream: true });

  const now = Date.now();
  if (now - lastUpdateTime >= throttleMs) {
    lastUpdateTime = now;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === aiMessageId ? { ...m, content: aiResponse } : m
      )
    );
  }
}
```

### Server API with streaming and exposed headers

Path: `server/index.js` in `app.post("/api/chat", ...)`

```js
// Create session if conversationId is missing
let sessionId = conversationId;
if (!sessionId) {
  const { data: session } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id })
    .select()
    .single();
  sessionId = session.id;
}

// Expose custom headers so the browser can read them
res.setHeader("Content-Type", "text/plain");
res.setHeader(
  "Access-Control-Expose-Headers",
  "X-Conversation-Id, X-Generated-Title"
);
res.setHeader("Transfer-Encoding", "chunked");
res.setHeader("X-Conversation-Id", sessionId);
if (generatedTitle) res.setHeader("X-Generated-Title", generatedTitle);

// Stream the AI response
const result = await chat.sendMessageStream(userMessage.content);
let fullResponse = "";
for await (const chunk of result.stream) {
  const chunkText = chunk.text();
  fullResponse += chunkText;
  res.write(chunkText);
}
res.end();
```

### Sidebar conversations: query + virtualization

Path: `src/components/AppSidebar.tsx`

```tsx
const { data: conversations = [] } = useQuery({
  queryKey: ["chat_sessions"],
  queryFn: async () => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, title")
      .order("created_at", { ascending: false });
    return data ?? [];
  },
  staleTime: 1000 * 60 * 5,
});

const rowVirtualizer = useVirtualizer({
  count: conversations.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
  overscan: 5,
});

function handleConversationClick(id: string) {
  setSelectedId(id);
  onConversationSelect();
}
```

### Loading messages on selection

Path: `src/components/Dashboard.tsx`

```tsx
useEffect(() => {
  if (!selectedId) return;
  (async () => {
    const fetched = await getChatMessages(selectedId);
    const formatted = (fetched ?? []).map((msg: any) => ({
      id: String(msg.id),
      content: msg.content,
      sender: (msg.role === "assistant" ? "ai" : "user") as "user" | "ai",
      timestamp: msg.created_at,
    }));
    setMessages(formatted);
    setHasActiveChat(true);
  })();
}, [selectedId]);
```

## 🛠️ Architecture

### Frontend Architecture

- **Context API** for global state (e.g. `SelectedConversationContext`)
- **Custom hooks** (e.g. `use-auto-resize-textarea`) for reusable UX logic
- **Component composition**: `Dashboard` orchestrates `NewChat` vs `Conversation` vs `VoiceChat`
- **TanStack Query** for server state and caching (`chat_sessions`)
- **TypeScript** everywhere for safety and IDE support

### Security Considerations

- Input sanitization
- Form validation
- Auth token management
- Rate limiting
- Error handling

## 📦 Installation

1. Clone the repository:

```bash
git clone https://github.com/ShyneADL/astra.git
cd astra
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Run the development server:

```bash
npm run dev
```

5. Run the API server:

```bash
cd server
npm install
npm run server
```

Ensure `.env` in `server/` contains `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY`.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch:

```bash
git checkout -b feature/AmazingFeature
```

3. Commit your changes:

```bash
git commit -m 'Add some AmazingFeature'
```

4. Push to the branch:

```bash
git push origin feature/AmazingFeature
```

5. Open a Pull Request

### Commit Guidelines

- Use conventional commits
- Keep commits atomic and focused
- Include relevant tests
- Update documentation

## 🔐 Security Measures

1. **Input Validation**

   - Zod schemas for form validation
   - Sanitization of user inputs
   - Type checking with TypeScript

2. **Authentication**

   - JWT token management
   - Secure session handling

3. **API Security**
   - Rate limiting
   - CORS configuration
   - Error handling

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI team
- Supabase team
- shadcn/ui

---

Built with ❤️ by [ShyneADL](https://github.com/ShyneADL)
