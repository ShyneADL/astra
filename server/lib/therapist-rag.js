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

// Cache for recent embeddings to avoid redundant API calls
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

    let relevantDocs = [];
    let queryEmbedding = null;

    // Only do expensive embedding/search if query seems on-topic
    if (!isOffTopic) {
      // Check cache first
      queryEmbedding = getCachedEmbedding(userQuery);

      if (!queryEmbedding) {
        queryEmbedding = await embedWithGemini(userQuery);
        setCachedEmbedding(userQuery, queryEmbedding);
      }

      // Reduce search results for faster processing
      relevantDocs = await searchVectorDB(queryEmbedding, 3);
    }

    const pastChats = getRecentHistory(chatHistory, 3); // Reduced from 5

    // Build context from relevant therapy knowledge
    const context = relevantDocs
      .map((d) => `[${d.category}] ${d.content}`)
      .join("\n\n");

    let redirectionNote = "";
    if (isOffTopic) {
      redirectionNote = `
IMPORTANT: The user appears to be asking about something unrelated to mental health. Gently redirect them back to discussing their emotional wellbeing, feelings, or mental health concerns. Acknowledge their question briefly but guide the conversation back to therapeutic topics.`;
    }

    // Streamlined prompt for faster processing
    const prompt = `${THERAPEUTIC_SYSTEM_PROMPT}

${redirectionNote}

${context ? `Relevant Knowledge:\n${context}\n` : ""}
${pastChats ? `Recent Context:\n${pastChats}\n` : ""}
User: ${userQuery}

Respond as a compassionate therapist. Keep responses concise (2-3 sentences max) and focus on mental health. Be brief but supportive.`;

    return {
      prompt,
      isOffTopic,
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
