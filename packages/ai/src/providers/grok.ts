import { AIProvider, AIInput, AIResponse } from '../types.js';

export class GrokProvider implements AIProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName = 'grok-2') {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async generateText(input: AIInput): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Grok/Groq API key is not configured.');
    }

    // Determine base URL: Groq keys start with 'gsk_'
    const isGroq = this.apiKey.startsWith('gsk_');
    const url = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions' 
      : 'https://api.x.ai/v1/chat/completions';

    // Map messages directly (OpenAI format matches input perfectly)
    const targetModel = isGroq 
      ? (this.modelName.startsWith('gemini') || this.modelName === 'grok-2' || this.modelName === 'groq/compound-mini' || this.modelName === 'openai/gpt-oss-120b' ? 'openai/gpt-oss-20b' : this.modelName)
      : this.modelName;

    const requestBody: any = {
      model: targetModel,
      messages: input.messages,
    };

    if (input.temperature !== undefined) {
      requestBody.temperature = input.temperature;
    }

    const formattedMessages = [...input.messages];
    if (input.responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
      // Groq requires the word 'json' or 'JSON' in the messages when using json_object mode
      const hasJsonKeyword = formattedMessages.some(m => /json/i.test(m.content));
      if (!hasJsonKeyword && formattedMessages.length > 0) {
        formattedMessages[0] = {
          ...formattedMessages[0],
          content: formattedMessages[0].content + '\nOutput valid JSON only.'
        };
      }
    }
    requestBody.messages = formattedMessages;

    let attempts = 0;
    const maxAttempts = 4;
    let retryDelay = 2000;

    while (attempts < maxAttempts) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          attempts++;
          const errText = await response.text();
          if (attempts >= maxAttempts) {
            throw new Error(`Grok/Groq API error (HTTP ${response.status}): ${errText}`);
          }
          // Parse retry delay from error message e.g. "Please try again in 3.615s"
          const retryMatch = errText.match(/try again in ([\d.]+)s/i);
          const waitTime = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500 : retryDelay;
          console.warn(`Groq rate limit (429) hit. Waiting ${waitTime}ms before retry ${attempts}/${maxAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryDelay = Math.min(retryDelay * 1.5, 8000);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          // Handle json_validate_failed: model couldn't produce valid JSON in json_object mode
          // Retry without response_format constraint and extract JSON manually
          if (errText.includes('json_validate_failed') && requestBody.response_format?.type === 'json_object') {
            console.warn(`Groq json_validate_failed. Retrying without json_object mode and extracting JSON manually...`);
            const fallbackBody = { ...requestBody };
            delete fallbackBody.response_format;
            const fallbackRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
              body: JSON.stringify(fallbackBody),
            });
            if (fallbackRes.ok) {
              const fallbackJson = await fallbackRes.json() as any;
              let text = fallbackJson.choices?.[0]?.message?.content || '';
              if (text.includes('<think>')) {
                text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              }
              // Extract JSON block from text response
              const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/(\{[\s\S]*\})/s);
              if (jsonMatch) text = jsonMatch[1].trim();
              return {
                text,
                usage: {
                  promptTokens: fallbackJson.usage?.prompt_tokens || 0,
                  completionTokens: fallbackJson.usage?.completion_tokens || 0,
                  totalTokens: fallbackJson.usage?.total_tokens || 0,
                },
              };
            }
            // If fallback also fails, count as an attempt and continue retry loop
            attempts++;
            if (attempts >= maxAttempts) {
              throw new Error(`Grok/Groq API error (HTTP ${response.status}): ${errText}`);
            }
            continue;
          }
          throw new Error(`Grok/Groq API error (HTTP ${response.status}): ${errText}`);
        }

        const resJson = await response.json() as any;
        let text = resJson.choices?.[0]?.message?.content || '';

        // Strip thinking tokens/tags from reasoning models (e.g. Qwen / DeepSeek)
        if (text.includes('<think>')) {
          text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        }

        const promptTokens = resJson.usage?.prompt_tokens || 0;
        const completionTokens = resJson.usage?.completion_tokens || 0;
        const totalTokens = resJson.usage?.total_tokens || 0;

        return {
          text,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
          },
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        let error = err;
        if (err.name === 'AbortError') {
          error = new Error('Grok/Groq API request timed out after 45 seconds.');
        }
        console.error(`Grok/Groq Provider attempt ${attempts + 1} failed:`, error);
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay = Math.min(retryDelay * 1.5, 8000);
      }
    }
    throw new Error('Grok/Groq API failed after max retry attempts.');
  }
}
