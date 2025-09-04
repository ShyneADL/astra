# Astra - AI-Powered Chat Application

Astra is a modern, real-time chat application that leverages Google's Gemini AI for intelligent conversations. Built with React, TypeScript, and Vite, it offers a seamless chat experience with features like conversation management, real-time typing indicators, and AI-powered responses.

![Astra Demo](public/logo.png)

## 🌟 Features

- **Real-time AI Chat**: Integration with Google's Gemini AI model
- **Authentication**: Secure user authentication with Supabase
- **Streaming Responses**: Real-time streaming of AI responses
- **Conversation Management**: Save and manage multiple chat sessions
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Auto-resizing Input**: Dynamic textarea that adjusts to content
- **TypeScript**: Full type safety across the application

## 🚀 Technologies Used

### Frontend

- **React 18** with TypeScript
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

## 🔍 Key Technical Implementations

### AI Chat Implementation

```typescript
// Streaming Response Handler
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of response) {
      controller.enqueue(new TextEncoder().encode(chunk.text));
    }
    controller.close();
  },
});
```

### Form Validation

```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

### Real-time Chat

```typescript
// Auto-resizing Textarea Hook
const useAutoResizeTextarea = ({ minHeight, maxHeight }: AutoResizeOptions) => {
  // Implementation details
};
```

## 🛠️ Architecture

### Frontend Architecture

- **Context API** for global state management
- **Custom Hooks** for reusable logic
- **Component composition** for UI modularity
- **TypeScript** for type safety
- **Error Boundaries** for graceful error handling

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

## 📈 Performance Optimizations

1. **Frontend**

   - Code splitting
   - Memoization
   - Virtual scrolling for chat history

2. **Backend**
   - Connection pooling
   - Query optimization
   - Caching strategies

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI team
- Supabase team
- shadcn/ui

---

Built with ❤️ by [ShyneADL](https://github.com/ShyneADL)
