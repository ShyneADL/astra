import { embedWithGemini } from "./embedding-service.js";
import { searchVectorDB, getRecentHistory } from "./vector-db.js";

const THERAPEUTIC_SYSTEM_PROMPT = `You are a compassionate AI therapist focused on mental health and wellbeing. Your role is to:

1. STAY FOCUSED ON MENTAL HEALTH: Always keep conversations centered on mental health, emotional wellbeing, and therapeutic support. If users try to change topics, gently redirect them back to their mental health needs.

2. PROVIDE THERAPEUTIC SUPPORT: Use evidence-based therapeutic techniques like CBT, active listening, and emotional validation. Draw from your therapy knowledge base to provide informed responses.

3. MAINTAIN BOUNDARIES: You are not a replacement for professional therapy. Encourage users to seek professional help when appropriate, especially for crisis situations.

4. PREVENT TOPIC DEVIATION: If a user asks about unrelated topics (technology, politics, general knowledge, etc.), respond with something like: "I understand you're curious about that, but I'm here to focus on your mental health and wellbeing. How are you feeling today? Is there something on your mind that's affecting your emotional state?"

5. CRISIS MANAGEMENT: If someone expresses suicidal thoughts or immediate danger, prioritize their safety and direct them to crisis resources immediately.

6. BE EMPATHETIC: Validate emotions, show understanding, and create a safe space for sharing.

Remember: Your primary purpose is mental health support. Always guide conversations back to emotional wellbeing and therapeutic goals.`;

const embeddingCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedEmbedding(text) {
  const key = text.toLowerCase().trim();
  const cached = embeddingCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.embedding;
  }
  return null;
}

function setCachedEmbedding(text, embedding) {
  const key = text.toLowerCase().trim();
  embeddingCache.set(key, {
    embedding,
    timestamp: Date.now(),
  });

  // Clean old entries periodically
  if (embeddingCache.size > 100) {
    const cutoff = Date.now() - CACHE_TTL;
    for (const [k, v] of embeddingCache.entries()) {
      if (v.timestamp < cutoff) {
        embeddingCache.delete(k);
      }
    }
  }
}

export async function therapistRAGChat(userQuery, chatHistory) {
  try {
    // Fast topic deviation check first (no embedding needed)
    const isOffTopic = detectTopicDeviationFast(userQuery);

    // Skip expensive RAG operations for off-topic queries
    if (isOffTopic) {
      const redirectionNote = `
IMPORTANT: The user appears to be asking about something unrelated to mental health. Gently redirect them back to discussing their emotional wellbeing, feelings, or mental health concerns. Acknowledge their question briefly but guide the conversation back to therapeutic topics.`;

      return {
        prompt: `${THERAPEUTIC_SYSTEM_PROMPT}\n\n${redirectionNote}\n\nUser: ${userQuery}\n\nRespond as a compassionate therapist. Keep responses concise (2-3 sentences max) and focus on mental health. Be brief but supportive.`,
        isOffTopic: true,
        relevantKnowledge: [],
        systemPrompt: THERAPEUTIC_SYSTEM_PROMPT,
      };
    }

    // For on-topic queries, do lightweight RAG
    let relevantDocs = [];
    let queryEmbedding = null;

    // Check cache first
    queryEmbedding = getCachedEmbedding(userQuery);

    if (!queryEmbedding) {
      queryEmbedding = await embedWithGemini(userQuery);
      setCachedEmbedding(userQuery, queryEmbedding);
    }

    // Reduce search results for faster processing
    relevantDocs = await searchVectorDB(queryEmbedding, 2); // Reduced from 3

    const pastChats = getRecentHistory(chatHistory, 2); // Reduced from 3

    // Build context from relevant therapy knowledge
    const context = relevantDocs
      .map((d) => `[${d.category}] ${d.content}`)
      .join("\n\n");

    // Streamlined prompt for faster processing
    const prompt = `${THERAPEUTIC_SYSTEM_PROMPT}

${context ? `Relevant Knowledge:\n${context}\n` : ""}
${pastChats ? `Recent Context:\n${pastChats}\n` : ""}
User: ${userQuery}

Respond as a compassionate therapist. Keep responses concise (2-3 sentences max) and focus on mental health. Be brief but supportive.`;

    return {
      prompt,
      isOffTopic: false,
      relevantKnowledge: relevantDocs.map((d) => d.category),
      systemPrompt: THERAPEUTIC_SYSTEM_PROMPT,
    };
  } catch (error) {
    console.error("RAG Chat error:", error);
    return {
      prompt: `${THERAPEUTIC_SYSTEM_PROMPT}\n\nUser: ${userQuery}\n\nRespond with empathy and focus on mental health support.`,
      isOffTopic: false,
      relevantKnowledge: [],
      systemPrompt: THERAPEUTIC_SYSTEM_PROMPT,
    };
  }
}

// Fast keyword-based topic detection (no embedding needed)
function detectTopicDeviationFast(userQuery) {
  const offTopicKeywords = [
    "weather",
    "sports",
    "politics",
    "technology",
    "programming",
    "code",
    "recipe",
    "cooking",
    "travel",
    "movies",
    "games",
    "shopping",
    "news",
    "celebrity",
    "music",
    "math",
    "science",
    "history",
  ];

  const mentalHealthKeywords = [
    "feel",
    "feeling",
    "emotion",
    "sad",
    "happy",
    "angry",
    "anxious",
    "stress",
    "worry",
    "depression",
    "anxiety",
    "therapy",
    "counseling",
    "mental",
    "health",
    "wellbeing",
    "mood",
    "thoughts",
    "thinking",
    "relationship",
    "family",
    "work stress",
    "burnout",
    "overwhelmed",
  ];

  const lowerQuery = userQuery.toLowerCase();

  const hasOffTopicKeywords = offTopicKeywords.some((keyword) =>
    lowerQuery.includes(keyword)
  );

  const hasMentalHealthKeywords = mentalHealthKeywords.some((keyword) =>
    lowerQuery.includes(keyword)
  );

  return hasOffTopicKeywords && !hasMentalHealthKeywords;
}

// Fast response mode for simple queries
export function shouldUseFastMode(userQuery) {
  const lowerQuery = userQuery.toLowerCase();

  // Simple greetings and short responses
  const simplePatterns = [
    /^(hi|hello|hey|good morning|good afternoon|good evening)$/,
    /^(how are you|how's it going|what's up)$/,
    /^(thank you|thanks|bye|goodbye|see you)$/,
    /^(yes|no|ok|okay|sure|alright)$/,
    /^(help|support|assistance)$/,
  ];

  return simplePatterns.some((pattern) => pattern.test(lowerQuery.trim()));
}

// Fast response templates for common queries
export function getFastResponse(userQuery) {
  const lowerQuery = userQuery.toLowerCase().trim();

  if (/^(hi|hello|hey)$/.test(lowerQuery)) {
    return "Hello! I'm here to support your mental health and wellbeing. How are you feeling today?";
  }

  if (/^(how are you|how's it going|what's up)$/.test(lowerQuery)) {
    return "I'm doing well, thank you for asking. I'm here to focus on how you're doing. How are you feeling right now?";
  }

  if (/^(thank you|thanks)$/.test(lowerQuery)) {
    return "You're very welcome. I'm here whenever you need support. How can I help you today?";
  }

  if (/^(bye|goodbye|see you)$/.test(lowerQuery)) {
    return "Take care of yourself. Remember, I'm here whenever you need to talk. Have a good day!";
  }

  if (/^(help|support|assistance)$/.test(lowerQuery)) {
    return "I'm here to provide emotional support and help with mental health concerns. What's on your mind today?";
  }

  return null; // No fast response available
}
