import { pipeline } from '@xenova/transformers';

let sentiment: any;

export async function analyzeSentiment(text: string) {
  if (!sentiment) {
    // Loads model locally (downloads on first run)
    sentiment = await pipeline('text-classification', 'ProsusAI/finbert');
  }
  return sentiment(text);
}
