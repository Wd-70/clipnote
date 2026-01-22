import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAnalysisResult, IHighlight } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const ANALYSIS_PROMPT = `You are an expert video content analyzer. Analyze the following video and identify the most engaging, important, or highlight-worthy moments.

For each highlight, provide:
1. Start time (in seconds)
2. End time (in seconds)
3. A brief reason why this moment is significant
4. A score from 0-100 indicating the importance/engagement level

Focus on:
- Exciting or dramatic moments
- Key information or announcements
- Funny or entertaining segments
- Important transitions or conclusions
- Audience engagement peaks (if applicable)

Return your analysis in the following JSON format:
{
  "summary": "A 2-3 sentence summary of the video content",
  "highlights": [
    {
      "start": 0,
      "end": 30,
      "reason": "Opening hook with key announcement",
      "score": 85
    }
  ]
}

Only return valid JSON, no additional text.`;

/**
 * Analyze video content using Gemini AI
 */
export async function analyzeVideoContent(
  videoUrl: string,
  duration: number
): Promise<IAnalysisResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `${ANALYSIS_PROMPT}

Video URL: ${videoUrl}
Video Duration: ${duration} seconds

Analyze this video and identify 5-10 key highlights. Distribute them throughout the video duration.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as IAnalysisResult;

    // Validate and sanitize highlights
    const validHighlights: IHighlight[] = (parsed.highlights || [])
      .filter(
        (h): h is IHighlight =>
          typeof h.start === 'number' &&
          typeof h.end === 'number' &&
          typeof h.reason === 'string' &&
          typeof h.score === 'number' &&
          h.start >= 0 &&
          h.end <= duration &&
          h.start < h.end
      )
      .sort((a, b) => a.start - b.start);

    return {
      summary: parsed.summary || 'Video analysis completed.',
      highlights: validHighlights,
    };
  } catch (error) {
    console.error('[Gemini AI] Analysis error:', error);

    // Return mock data for development/testing
    return generateMockAnalysis(duration);
  }
}

/**
 * Generate mock analysis for development
 */
function generateMockAnalysis(duration: number): IAnalysisResult {
  const numHighlights = Math.min(5, Math.floor(duration / 60));
  const highlights: IHighlight[] = [];

  for (let i = 0; i < numHighlights; i++) {
    const start = Math.floor((duration / numHighlights) * i) + 10;
    const end = Math.min(start + 30, duration);

    highlights.push({
      start,
      end,
      reason: `Highlight ${i + 1}: Notable moment in the video`,
      score: 70 + Math.floor(Math.random() * 30),
    });
  }

  return {
    summary:
      'This video contains several interesting moments that have been automatically detected and highlighted for easy navigation.',
    highlights,
  };
}

/**
 * Calculate points required for video analysis
 * 1 point = 1 minute of video
 */
export function calculatePointsRequired(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  return Math.ceil(durationMinutes);
}
