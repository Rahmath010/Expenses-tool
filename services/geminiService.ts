
import { GoogleGenAI, Type } from "@google/genai";
import type { ReceiptData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    merchant_name: {
      type: Type.STRING,
      description: "The name of the merchant or store.",
    },
    transaction_date: {
      type: Type.STRING,
      description: "The date of the transaction in YYYY-MM-DD format.",
    },
    currency: {
        type: Type.STRING,
        description: "The ISO 4217 currency code of the transaction (e.g., 'USD', 'INR', 'GBP', 'AED').",
        enum: ['USD', 'INR', 'GBP', 'AED'],
    },
    total_amount: {
      type: Type.NUMBER,
      description: "The final total amount of the transaction.",
    },
    tax_amount: {
      type: Type.NUMBER,
      description: "The total tax amount. If not present, this should be 0.",
    },
    line_items: {
      type: Type.ARRAY,
      description: "A list of all items purchased.",
      items: {
        type: Type.OBJECT,
        properties: {
          description: {
            type: Type.STRING,
            description: "The description of the purchased item.",
          },
          amount: {
            type: Type.NUMBER,
            description: "The price of the individual item.",
          },
        },
        required: ["description", "amount"],
      },
    },
  },
  required: ["merchant_name", "transaction_date", "currency", "total_amount", "tax_amount", "line_items"],
};

export async function extractReceiptData(base64Image: string, mimeType: string, currencyHint: 'USD' | 'INR' | 'GBP' | 'AED'): Promise<ReceiptData> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this receipt image. The currency is likely ${currencyHint}, but confirm from the receipt and use the correct ISO 4217 code from the allowed list [USD, INR, GBP, AED]. Extract the merchant name, transaction date, currency, total amount, tax amount, and all line items. Ensure the date is in YYYY-MM-DD format. If a value is not found, use a sensible default (e.g., 0 for tax).`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText) as ReceiptData;
    
    // Fallback if model returns a non-enum string
    if (!['USD', 'INR', 'GBP', 'AED'].includes(data.currency)) {
        data.currency = currencyHint;
    }

    return data;
  } catch (error) {
    console.error("Error extracting receipt data:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to process receipt with Gemini API: ${error.message}`);
    }
    throw new Error("An unknown error occurred while processing the receipt.");
  }
}