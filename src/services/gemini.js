class GeminiService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.isEnabled = import.meta.env.VITE_AI_ENABLED === 'true';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  }

  isAvailable() {
    return this.isEnabled && this.apiKey;
  }

  async generateItemDescription(itemName) {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    if (!itemName || !itemName.trim()) {
      throw new Error('Item name is required');
    }

    try {
      const prompt = `Generate a detailed but concise description for a delivery item named "${itemName.trim()}". 
      The description should be professional, include relevant details about the item's characteristics, 
      handling requirements if any, and be suitable for a delivery service. 
      Keep it under 100 words and focus on practical delivery information.
      
      Example format: "A [item type] measuring approximately [size if relevant]. [Key characteristics]. [Special handling notes if any]. [Additional relevant details for delivery personnel]."`;

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response format from Gemini API');
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      return generatedText.trim();

    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('Failed to generate description. Please try again or enter manually.');
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
