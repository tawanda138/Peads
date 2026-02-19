
import { GoogleGenAI, Type } from "@google/genai";
import { WorksheetState } from "./types";

export const extractWorksheetData = async (base64Image: string): Promise<Partial<WorksheetState>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analyze this hospital ward worksheet image. Extract all data into a JSON object. 
  The worksheet contains rows of diseases with columns for Admissions (<5, >5, Total) and Deaths (<5, >5, Total). 
  Also extract summary fields like Ward Name, Month, Total Admissions, Referrals, etc.
  Return the numeric values accurately. If a cell is empty or zero, record it as 0.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            metadata: {
              type: Type.OBJECT,
              properties: {
                wardName: { type: Type.STRING },
                month: { type: Type.STRING },
                compiledBy: { type: Type.STRING },
                checkedBy: { type: Type.STRING },
                totalInpatientDays: { type: Type.NUMBER },
                referralsFromHC: { type: Type.NUMBER },
                referralsToHospital: { type: Type.NUMBER },
                wardRounds: { type: Type.NUMBER },
                abscondees: { type: Type.NUMBER }
              }
            },
            entries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  admissions_u5: { type: Type.NUMBER },
                  admissions_o5: { type: Type.NUMBER },
                  deaths_u5: { type: Type.NUMBER },
                  deaths_o5: { type: Type.NUMBER }
                },
                required: ["name"]
              }
            }
          }
        }
      }
    });

    const resultText = response.text || "{}";
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};
