import { createClient } from "@supabase/supabase-js";
import { embedWithGemini, cosineSimilarity } from "./embedding-service.js";

let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

// Initialize therapy knowledge base with common therapeutic concepts
const THERAPY_KNOWLEDGE_BASE = [
  {
    id: "cbt-basics",
    content:
      "Cognitive Behavioral Therapy (CBT) focuses on identifying and changing negative thought patterns and behaviors. It helps clients recognize the connection between thoughts, feelings, and behaviors.",
    category: "therapeutic_approach",
  },
  {
    id: "active-listening",
    content:
      "Active listening involves fully concentrating on what the client is saying, reflecting their emotions, and asking clarifying questions to show understanding and empathy.",
    category: "therapeutic_technique",
  },
  {
    id: "emotional-validation",
    content:
      "Emotional validation means acknowledging and accepting a person's feelings without judgment. It helps build trust and shows that their emotions are legitimate and understandable.",
    category: "therapeutic_technique",
  },
  {
    id: "anxiety-management",
    content:
      "Anxiety management techniques include deep breathing exercises, progressive muscle relaxation, grounding techniques, and challenging catastrophic thinking patterns.",
    category: "mental_health_condition",
  },
  {
    id: "depression-support",
    content:
      "Supporting someone with depression involves encouraging small daily activities, helping them identify negative thought patterns, and providing hope while maintaining professional boundaries.",
    category: "mental_health_condition",
  },
  {
    id: "crisis-intervention",
    content:
      "In crisis situations, prioritize safety, remain calm, validate feelings, and guide toward professional resources. Never provide medical advice or diagnoses.",
    category: "crisis_management",
  },
  {
    id: "boundary-setting",
    content:
      "Therapeutic boundaries maintain a professional relationship while providing support. This includes not giving personal advice, maintaining confidentiality, and staying within scope of practice.",
    category: "professional_ethics",
  },
];

// Cache for therapy documents to avoid repeated database queries
let documentsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - increased for better performance

async function getCachedDocuments() {
  const now = Date.now();

  if (
    documentsCache &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return documentsCache;
  }

  const supabase = getSupabaseClient();
  const { data: documents, error } = await supabase
    .from("therapy_knowledge")
    .select("*");

  if (error) {
    console.error("Error fetching documents:", error);
    return documentsCache || []; // Return cached version if available
  }

  documentsCache = documents;
  cacheTimestamp = now;
  return documents;
}

export async function initializeVectorDB() {
  try {
    const supabase = getSupabaseClient();
    const { data: existingDocs, error: checkError } = await supabase
      .from("therapy_knowledge")
      .select("id")
      .limit(1);

    if (checkError && checkError.code === "42P01") {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.rpc(
        "create_therapy_knowledge_table"
      );
      if (createError) {
        console.error("Error creating therapy_knowledge table:", createError);
        return false;
      }
    }

    if (!existingDocs || existingDocs.length === 0) {
      // Populate with initial knowledge base
      for (const doc of THERAPY_KNOWLEDGE_BASE) {
        const embedding = await embedWithGemini(doc.content);

        const { error: insertError } = await supabase
          .from("therapy_knowledge")
          .insert({
            id: doc.id,
            content: doc.content,
            category: doc.category,
            embedding: embedding,
          });

        if (insertError) {
          console.error(`Error inserting document ${doc.id}:`, insertError);
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Vector DB initialization error:", error);
    return false;
  }
}

export async function searchVectorDB(queryEmbedding, limit = 5) {
  try {
    const documents = await getCachedDocuments();

    if (!documents || documents.length === 0) {
      return [];
    }

    // Calculate similarities and sort
    const documentsWithSimilarity = documents.map((doc) => ({
      ...doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    return documentsWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error("Vector search error:", error);
    return [];
  }
}

export function getRecentHistory(chatHistory, limit = 5) {
  if (!chatHistory || chatHistory.length === 0) return "";

  return chatHistory
    .slice(-limit * 2) // Get last N exchanges (user + assistant pairs)
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Therapist"}: ${msg.content}`
    )
    .join("\n");
}
