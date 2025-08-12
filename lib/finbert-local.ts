// FinBERT sentiment analysis helper with dynamic client-side loading.
// We avoid importing @xenova/transformers at module scope so Next.js SSR build
// doesn't attempt to bundle onnxruntime-node native bindings.

interface FinBertResult { label: string; score: number; }

let _pipeline: any | null = null;
let _loading: Promise<any> | null = null;

async function getPipeline() {
  if (typeof window === 'undefined') {
    // SSR: skip heavy model load; return a mock function to prevent crashes.
    return async (text: string) => [{ label: 'neutral', score: 0.0 }];
  }
  if (_pipeline) return _pipeline;
  if (_loading) return _loading;
  _loading = (async () => {
    const { pipeline } = await import('@xenova/transformers');
    _pipeline = await pipeline('text-classification', 'ProsusAI/finbert');
    return _pipeline;
  })();
  return _loading;
}

export async function analyzeSentiment(text: string): Promise<FinBertResult[]> {
  try {
    const pipe = await getPipeline();
    const out = await pipe(text);
    // Normalize to array
    return Array.isArray(out) ? out : [out];
  } catch (e) {
    console.warn('FinBERT analyzeSentiment fallback due to error:', (e as any)?.message);
    return [{ label: 'neutral', score: 0 }];
  }
}
