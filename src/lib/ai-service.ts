import {
  EXTRACT_PAIN_POINTS_SYSTEM,
  EXTRACT_PAIN_POINTS_USER,
  SUMMARIZE_COMPLAINTS_SYSTEM,
  SUMMARIZE_COMPLAINTS_USER,
  CLUSTER_PAIN_POINTS_SYSTEM,
  CLUSTER_PAIN_POINTS_USER,
  SCORE_SEVERITY_SYSTEM,
  SCORE_SEVERITY_USER,
  ESTIMATE_WTP_SYSTEM,
  ESTIMATE_WTP_USER,
  GENERATE_PRODUCT_IDEAS_SYSTEM,
  GENERATE_PRODUCT_IDEAS_USER,
  DETECT_TREND_SYSTEM,
  DETECT_TREND_USER,
  GENERATE_NEXT_STEPS_SYSTEM,
  GENERATE_NEXT_STEPS_USER,
} from './ai-prompts';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface AIProvider {
  extractPainPoints(
    rawText: string
  ): Promise<{ title: string; summary: string; category: string; severity: number }[]>;

  summarizeComplaints(texts: string[]): Promise<string>;

  clusterPainPoints(
    painPoints: { id: string; title: string; summary: string }[]
  ): Promise<{ clusterName: string; description: string; painPointIds: string[] }[]>;

  scoreSeverity(title: string, summary: string): Promise<number>;

  estimateWillingnessToPay(title: string, summary: string, category: string): Promise<number>;

  generateProductIdeas(
    painPoint: { title: string; summary: string; category: string }
  ): Promise<
    {
      name: string;
      description: string;
      targetCustomer: string;
      mvpFeatures: string;
      difficulty: number;
      revenuePotential: number;
      existingAlternatives: string;
      recommendedFirstFeature: string;
    }[]
  >;

  detectTrendDirection(mentions: { date: string; count: number }[]): Promise<'up' | 'down' | 'stable'>;

  generateNextSteps(
    painPoint: { title: string; summary: string; category: string; opportunityScore: number }
  ): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Mock Provider
// ---------------------------------------------------------------------------

export class MockAIProvider implements AIProvider {
  async extractPainPoints(rawText: string) {
    await delay(100);
    const categories = ['security', 'automation', 'integration', 'monitoring', 'cost'] as const;
    const words = rawText.split(/\s+/).slice(0, 6).join(' ');
    return [
      {
        title: `Issue with ${words.slice(0, 30)}`,
        summary: `Users report frustration related to: ${rawText.slice(0, 80)}...`,
        category: categories[Math.floor(Math.random() * categories.length)],
        severity: 40 + Math.floor(Math.random() * 50),
      },
    ];
  }

  async summarizeComplaints(texts: string[]) {
    await delay(80);
    return `Across ${texts.length} complaints, users consistently report difficulties with their current workflow. The most common theme involves manual processes that could be automated, leading to wasted time and increased error rates. Several users mention considering switching to competitors if the situation doesn't improve.`;
  }

  async clusterPainPoints(painPoints: { id: string; title: string; summary: string }[]) {
    await delay(120);
    const mid = Math.ceil(painPoints.length / 2);
    return [
      {
        clusterName: 'Automation Gaps',
        description: 'Manual repetitive tasks that should be automated',
        painPointIds: painPoints.slice(0, mid).map((p) => p.id),
      },
      {
        clusterName: 'Integration Challenges',
        description: 'Tools that don\'t work well together causing data silos',
        painPointIds: painPoints.slice(mid).map((p) => p.id),
      },
    ];
  }

  async scoreSeverity(_title: string, _summary: string) {
    await delay(50);
    return 45 + Math.floor(Math.random() * 40);
  }

  async estimateWillingnessToPay(_title: string, _summary: string, _category: string) {
    await delay(50);
    return 35 + Math.floor(Math.random() * 45);
  }

  async generateProductIdeas(painPoint: { title: string; summary: string; category: string }) {
    await delay(150);
    return [
      {
        name: 'AutoFix Pro',
        description: `Automated solution for "${painPoint.title}" targeting small IT teams`,
        targetCustomer: 'IT admins at companies with 10-100 employees',
        mvpFeatures: 'Dashboard, Alert rules, One-click remediation, Slack integration, Audit log',
        difficulty: 45,
        revenuePotential: 68,
        existingAlternatives: 'Manual scripts, Enterprise tools (overpriced for SMB)',
        recommendedFirstFeature: 'Dashboard with real-time alerting',
      },
      {
        name: 'SmartOps',
        description: `Intelligent ${painPoint.category} management platform for small businesses`,
        targetCustomer: 'Small business owners managing their own IT',
        mvpFeatures: 'Setup wizard, Monitoring, Auto-remediation, Reports, Mobile app',
        difficulty: 60,
        revenuePotential: 55,
        existingAlternatives: 'Zapier (limited), custom scripts, manual processes',
        recommendedFirstFeature: 'Guided setup wizard with immediate value',
      },
    ];
  }

  async detectTrendDirection(mentions: { date: string; count: number }[]) {
    await delay(60);
    if (mentions.length < 2) return 'stable' as const;
    const first = mentions.slice(0, Math.floor(mentions.length / 2));
    const second = mentions.slice(Math.floor(mentions.length / 2));
    const avgFirst = first.reduce((s, m) => s + m.count, 0) / first.length;
    const avgSecond = second.reduce((s, m) => s + m.count, 0) / second.length;
    const change = (avgSecond - avgFirst) / (avgFirst || 1);
    if (change > 0.2) return 'up';
    if (change < -0.2) return 'down';
    return 'stable';
  }

  async generateNextSteps(painPoint: {
    title: string;
    summary: string;
    category: string;
    opportunityScore: number;
  }) {
    await delay(100);
    return [
      `Interview 5 IT admins who experience "${painPoint.title}" weekly`,
      `Map the current workaround workflow and identify time-waste hotspots`,
      `Research top 3 competitors in the ${painPoint.category} space on G2`,
      `Draft a one-page solution spec focusing on the #1 pain driver`,
      `Build a clickable prototype and run 3 usability tests`,
      `Set up a landing page to measure signup intent before building`,
    ];
  }
}

// ---------------------------------------------------------------------------
// Shared helpers for real providers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 || response.status >= 500) {
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await delay(backoff);
        continue;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `AI API request failed: ${response.status} ${response.statusText} - ${body}`
        );
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await delay(backoff);
      }
    }
  }

  throw lastError ?? new Error('AI API request failed after retries');
}

function parseJsonResponse<T>(text: string): T {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as T;
}

// ---------------------------------------------------------------------------
// Azure OpenAI Provider
// ---------------------------------------------------------------------------

export class AzureOpenAIProvider implements AIProvider {
  private endpoint: string;
  private apiKey: string;
  private deployment: string;
  private apiVersion: string;

  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT ?? '';
    this.apiKey = process.env.AZURE_OPENAI_API_KEY ?? '';
    this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? '';
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-02-01';

    if (!this.endpoint || !this.apiKey || !this.deployment) {
      throw new Error(
        'Azure OpenAI configuration missing. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT.'
      );
    }
  }

  private async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async extractPainPoints(rawText: string) {
    const result = await this.chat(EXTRACT_PAIN_POINTS_SYSTEM, EXTRACT_PAIN_POINTS_USER(rawText));
    return parseJsonResponse<{ title: string; summary: string; category: string; severity: number }[]>(result);
  }

  async summarizeComplaints(texts: string[]) {
    return this.chat(SUMMARIZE_COMPLAINTS_SYSTEM, SUMMARIZE_COMPLAINTS_USER(texts));
  }

  async clusterPainPoints(painPoints: { id: string; title: string; summary: string }[]) {
    const result = await this.chat(CLUSTER_PAIN_POINTS_SYSTEM, CLUSTER_PAIN_POINTS_USER(painPoints));
    return parseJsonResponse<{ clusterName: string; description: string; painPointIds: string[] }[]>(result);
  }

  async scoreSeverity(title: string, summary: string) {
    const result = await this.chat(SCORE_SEVERITY_SYSTEM, SCORE_SEVERITY_USER(title, summary));
    const score = parseInt(result, 10);
    return Math.min(100, Math.max(0, isNaN(score) ? 50 : score));
  }

  async estimateWillingnessToPay(title: string, summary: string, category: string) {
    const result = await this.chat(ESTIMATE_WTP_SYSTEM, ESTIMATE_WTP_USER(title, summary, category));
    const score = parseInt(result, 10);
    return Math.min(100, Math.max(0, isNaN(score) ? 50 : score));
  }

  async generateProductIdeas(painPoint: { title: string; summary: string; category: string }) {
    const result = await this.chat(GENERATE_PRODUCT_IDEAS_SYSTEM, GENERATE_PRODUCT_IDEAS_USER(painPoint));
    return parseJsonResponse<
      {
        name: string;
        description: string;
        targetCustomer: string;
        mvpFeatures: string;
        difficulty: number;
        revenuePotential: number;
        existingAlternatives: string;
        recommendedFirstFeature: string;
      }[]
    >(result);
  }

  async detectTrendDirection(mentions: { date: string; count: number }[]) {
    const result = await this.chat(DETECT_TREND_SYSTEM, DETECT_TREND_USER(mentions));
    const direction = result.toLowerCase().trim() as 'up' | 'down' | 'stable';
    if (['up', 'down', 'stable'].includes(direction)) return direction;
    return 'stable';
  }

  async generateNextSteps(painPoint: {
    title: string;
    summary: string;
    category: string;
    opportunityScore: number;
  }) {
    const result = await this.chat(GENERATE_NEXT_STEPS_SYSTEM, GENERATE_NEXT_STEPS_USER(painPoint));
    return parseJsonResponse<string[]>(result);
  }
}

// ---------------------------------------------------------------------------
// OpenAI Provider
// ---------------------------------------------------------------------------

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private model = 'gpt-4o-mini';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? '';
    if (!this.apiKey) {
      throw new Error('OpenAI configuration missing. Set OPENAI_API_KEY.');
    }
  }

  private async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async extractPainPoints(rawText: string) {
    const result = await this.chat(EXTRACT_PAIN_POINTS_SYSTEM, EXTRACT_PAIN_POINTS_USER(rawText));
    return parseJsonResponse<{ title: string; summary: string; category: string; severity: number }[]>(result);
  }

  async summarizeComplaints(texts: string[]) {
    return this.chat(SUMMARIZE_COMPLAINTS_SYSTEM, SUMMARIZE_COMPLAINTS_USER(texts));
  }

  async clusterPainPoints(painPoints: { id: string; title: string; summary: string }[]) {
    const result = await this.chat(CLUSTER_PAIN_POINTS_SYSTEM, CLUSTER_PAIN_POINTS_USER(painPoints));
    return parseJsonResponse<{ clusterName: string; description: string; painPointIds: string[] }[]>(result);
  }

  async scoreSeverity(title: string, summary: string) {
    const result = await this.chat(SCORE_SEVERITY_SYSTEM, SCORE_SEVERITY_USER(title, summary));
    const score = parseInt(result, 10);
    return Math.min(100, Math.max(0, isNaN(score) ? 50 : score));
  }

  async estimateWillingnessToPay(title: string, summary: string, category: string) {
    const result = await this.chat(ESTIMATE_WTP_SYSTEM, ESTIMATE_WTP_USER(title, summary, category));
    const score = parseInt(result, 10);
    return Math.min(100, Math.max(0, isNaN(score) ? 50 : score));
  }

  async generateProductIdeas(painPoint: { title: string; summary: string; category: string }) {
    const result = await this.chat(GENERATE_PRODUCT_IDEAS_SYSTEM, GENERATE_PRODUCT_IDEAS_USER(painPoint));
    return parseJsonResponse<
      {
        name: string;
        description: string;
        targetCustomer: string;
        mvpFeatures: string;
        difficulty: number;
        revenuePotential: number;
        existingAlternatives: string;
        recommendedFirstFeature: string;
      }[]
    >(result);
  }

  async detectTrendDirection(mentions: { date: string; count: number }[]) {
    const result = await this.chat(DETECT_TREND_SYSTEM, DETECT_TREND_USER(mentions));
    const direction = result.toLowerCase().trim() as 'up' | 'down' | 'stable';
    if (['up', 'down', 'stable'].includes(direction)) return direction;
    return 'stable';
  }

  async generateNextSteps(painPoint: {
    title: string;
    summary: string;
    category: string;
    opportunityScore: number;
  }) {
    const result = await this.chat(GENERATE_NEXT_STEPS_SYSTEM, GENERATE_NEXT_STEPS_USER(painPoint));
    return parseJsonResponse<string[]>(result);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'mock';

  switch (provider) {
    case 'azure-openai':
      return new AzureOpenAIProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'mock':
      return new MockAIProvider();
    default:
      console.warn(`Unknown AI_PROVIDER "${provider}", falling back to mock.`);
      return new MockAIProvider();
  }
}
