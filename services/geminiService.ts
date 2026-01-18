
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface VerificationResult {
  isSuccessful: boolean;
  explanation: string;
  pointsAdjustment: number;
}

export const getYahyaChatResponse = async (
  userMessage: string,
  mood: 'happy' | 'sad' | 'neutral',
  lang: string
): Promise<string> => {
  try {
    const systemInstruction = `You are Yahya, a dignified personal guide and productivity mentor. 
    Physical description: slightly dark complexion, black wavy hair.
    Personality: You are wise, fair, and encouraging. You provide honest, balanced counsel. You celebrate success with grace and view failure as an opportunity for growth and reflection.
    
    CRITICAL STYLE INSTRUCTION:
    When responding in Arabic, you MUST use eloquent Modern Standard Arabic (اللغة العربية الفصحى). 
    Your style must be beautiful, elegant, and sophisticated. Avoid slang.
    
    Response Language: ${lang}.
    Keep your response concise, respectful, and strictly in character.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || (lang === 'ar' ? "أعتذر، خانتني الكلمات في هذه اللحظة." : "I apologize, words escape me at this moment.");
  } catch (error) {
    console.error("Yahya chat error:", error);
    return lang === 'ar' ? "يبدو أن هناك عائقاً يحول بيني وبين إجابتك الآن." : "It seems there is an obstacle between me and your answer now.";
  }
};

export const generateYahyaAvatar = async (mood: 'happy' | 'sad' | 'neutral'): Promise<string | null> => {
  try {
    const prompt = `A stylized profile avatar of a young man named Yahya. Slightly dark complexion, black wavy hair. Expression: ${mood}. Professional minimalist background. Elegant 3D render.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Avatar generation failed:", error);
    return null;
  }
};

export const verifyTaskCompletion = async (
  taskTitle: string,
  taskDescription: string,
  imageBase64: string
): Promise<VerificationResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `As a fair and wise auditor, verify this task:
            Title: ${taskTitle}
            Description: ${taskDescription}
            
            SCORING: Success=10, Failure=-5.`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSuccessful: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING },
            pointsAdjustment: { type: Type.NUMBER }
          },
          required: ["isSuccessful", "explanation", "pointsAdjustment"]
        }
      }
    });

    return JSON.parse(response.text) as VerificationResult;
  } catch (error) {
    console.error("Verification failed:", error);
    return {
      isSuccessful: false,
      explanation: "Verification failed. Please try again later.",
      pointsAdjustment: -5
    };
  }
};
