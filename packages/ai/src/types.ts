export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIInput {
  messages: AIMessage[];
  temperature?: number;
  responseFormat?: 'text' | 'json';
  jsonSchema?: any; // JSON Schema for structured output
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  generateText(input: AIInput): Promise<AIResponse>;
}
