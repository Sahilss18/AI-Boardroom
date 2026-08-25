import { AIProvider, AIInput, AIResponse, AIMessage } from '../types.js';

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async generateText(input: AIInput): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    // Separate system message from conversation contents
    let systemInstructionText = '';
    const contents: any[] = [];

    for (const msg of input.messages) {
      if (msg.role === 'system') {
        systemInstructionText += (systemInstructionText ? '\n' : '') + msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    const requestBody: any = {
      contents,
    };

    if (systemInstructionText) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstructionText }],
      };
    }

    const generationConfig: any = {};
    if (input.temperature !== undefined) {
      generationConfig.temperature = input.temperature;
    }

    if (input.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
      if (input.jsonSchema) {
        generationConfig.responseSchema = input.jsonSchema;
      }
    }

    if (Object.keys(generationConfig).length > 0) {
      requestBody.generationConfig = generationConfig;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (HTTP ${response.status}): ${errText}`);
      }

      const resJson = await response.json() as any;
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const promptTokens = resJson.usageMetadata?.promptTokenCount || 0;
      const completionTokens = resJson.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = resJson.usageMetadata?.totalTokenCount || 0;

      return {
        text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        const timeoutErr = new Error('Gemini API request timed out after 12 seconds.');
        console.error('Gemini Provider invocation timed out:', timeoutErr);
        throw timeoutErr;
      }
      console.error('Gemini Provider invocation failed:', error);
      throw error;
    }
  }
}
