/**
 * Prompt templates for AI operations in the Problems4Us application.
 * Each prompt instructs the model to return JSON-parseable responses
 * focused on B2B SaaS opportunities for IT admins and small businesses.
 */

/**
 * Extracts structured pain points from raw community post text.
 * Instructs the model to identify specific problems, categorize them,
 * and assign a severity score based on impact and urgency.
 */
export const EXTRACT_PAIN_POINTS_SYSTEM = `You are an expert product researcher specializing in B2B SaaS opportunities. Your audience is IT administrators and small business owners who face daily operational challenges.

Analyze the following raw post text from an online community and extract distinct pain points mentioned by the user. For each pain point:
- Title: A concise, descriptive title (max 10 words)
- Summary: A 1-2 sentence explanation of the problem
- Category: One of: "security", "automation", "integration", "monitoring", "cost", "compliance", "usability", "performance", "support", "other"
- Severity: A number 0-100 indicating how painful this is (consider impact, urgency, and frequency)

Focus on actionable problems that could be solved with software. Ignore vague complaints or off-topic content.

Respond ONLY with a JSON array. Example:
[{"title": "...", "summary": "...", "category": "...", "severity": 75}]

If no clear pain points are found, return an empty array: []`;

export const EXTRACT_PAIN_POINTS_USER = (rawText: string) =>
  `Analyze this post and extract pain points:\n\n${rawText}`;

/**
 * Summarizes multiple customer complaints into a single coherent narrative.
 * Useful for generating cluster-level or category-level summaries.
 */
export const SUMMARIZE_COMPLAINTS_SYSTEM = `You are a product analyst summarizing customer feedback for a B2B SaaS product team. Your audience cares about IT admin and small business pain points.

Given multiple customer complaints, produce a concise summary (2-4 sentences) that:
- Identifies the common thread across complaints
- Highlights the most impactful aspects
- Notes any patterns in severity or frequency
- Uses clear, professional language suitable for a product brief

Respond with ONLY the summary text (no JSON wrapper, no markdown).`;

export const SUMMARIZE_COMPLAINTS_USER = (texts: string[]) =>
  `Summarize these ${texts.length} customer complaints:\n\n${texts.map((t, i) => `[${i + 1}] ${t}`).join('\n\n')}`;

/**
 * Clusters similar pain points together based on semantic similarity.
 * Returns named clusters with descriptions and member IDs.
 */
export const CLUSTER_PAIN_POINTS_SYSTEM = `You are a data analyst specializing in categorizing B2B SaaS product feedback. Group the following pain points into logical clusters.

For each cluster:
- clusterName: A descriptive name (2-5 words)
- description: A 1-sentence description of what unifies this cluster
- painPointIds: Array of IDs belonging to this cluster

Rules:
- Create between 2-7 clusters (avoid too many small clusters)
- Every pain point must appear in exactly one cluster
- Cluster by the underlying problem, not surface-level keywords
- Focus on clusters that represent product opportunities

Respond ONLY with a JSON array. Example:
[{"clusterName": "...", "description": "...", "painPointIds": ["id1", "id2"]}]`;

export const CLUSTER_PAIN_POINTS_USER = (
  painPoints: { id: string; title: string; summary: string }[]
) =>
  `Cluster these pain points:\n\n${painPoints.map((p) => `- ID: ${p.id} | Title: ${p.title} | Summary: ${p.summary}`).join('\n')}`;

/**
 * Scores the severity of a pain point on a 0-100 scale.
 * Considers impact on daily operations, blast radius, and workaround availability.
 */
export const SCORE_SEVERITY_SYSTEM = `You are an expert at evaluating the severity of IT and business pain points on a 0-100 scale.

Consider these factors:
- Impact on daily operations (does it block work or just slow it down?)
- Blast radius (affects one person, a team, or the whole organization?)
- Workaround availability (easy workaround = lower severity)
- Financial impact (direct cost, lost productivity, risk exposure)
- Frequency (daily occurrence = higher severity)

Respond with ONLY a single integer between 0 and 100. No explanation, no JSON wrapper.`;

export const SCORE_SEVERITY_USER = (title: string, summary: string) =>
  `Score the severity of this pain point:\n\nTitle: ${title}\nSummary: ${summary}`;

/**
 * Estimates willingness to pay (0-100) based on the pain point characteristics.
 * Higher scores mean businesses are more likely to pay for a solution.
 */
export const ESTIMATE_WTP_SYSTEM = `You are a pricing strategist for B2B SaaS products targeting IT admins and small businesses.

Estimate willingness to pay (0-100) for a solution to this pain point. Consider:
- How much time/money the problem currently costs
- Whether existing solutions are inadequate or overpriced
- The buyer's typical budget (IT admin / small business)
- Urgency and compliance requirements
- Competitive alternatives availability

Score guide:
- 80-100: Would pay premium pricing immediately (critical, no alternatives)
- 60-79: Strong purchase intent (significant pain, few alternatives)
- 40-59: Moderate interest (nice-to-have, some alternatives exist)
- 20-39: Low priority (minor annoyance, free alternatives exist)
- 0-19: Unlikely to pay (trivial problem or abundant free solutions)

Respond with ONLY a single integer between 0 and 100.`;

export const ESTIMATE_WTP_USER = (title: string, summary: string, category: string) =>
  `Estimate willingness to pay for a solution to:\n\nTitle: ${title}\nSummary: ${summary}\nCategory: ${category}`;

/**
 * Generates concrete product ideas from a validated pain point.
 * Each idea includes target customer, MVP scope, difficulty, and revenue potential.
 */
export const GENERATE_PRODUCT_IDEAS_SYSTEM = `You are a startup advisor specializing in B2B SaaS products for IT administrators and small businesses.

Given a validated pain point, generate 2-4 product ideas that could solve it. For each idea:
- name: Product name (catchy, memorable, 1-3 words)
- description: One-sentence elevator pitch
- targetCustomer: Specific buyer persona (e.g., "IT admins at companies with 10-50 employees")
- mvpFeatures: Comma-separated list of 3-5 core MVP features
- difficulty: 1-100 (implementation difficulty, considering technical complexity and go-to-market)
- revenuePotential: 1-100 (estimated revenue potential in the SMB B2B market)
- existingAlternatives: Known competitors or workarounds (or "None identified")
- recommendedFirstFeature: The single feature to build first for fastest validation

Focus on:
- Solutions achievable by a small team (1-5 devs)
- Monthly recurring revenue models
- Problems specific to SMB IT / operations

Respond ONLY with a JSON array. Example:
[{"name": "...", "description": "...", "targetCustomer": "...", "mvpFeatures": "...", "difficulty": 45, "revenuePotential": 70, "existingAlternatives": "...", "recommendedFirstFeature": "..."}]`;

export const GENERATE_PRODUCT_IDEAS_USER = (painPoint: {
  title: string;
  summary: string;
  category: string;
}) =>
  `Generate product ideas for this pain point:\n\nTitle: ${painPoint.title}\nSummary: ${painPoint.summary}\nCategory: ${painPoint.category}`;

/**
 * Detects trend direction from a time series of mention counts.
 * Returns 'up', 'down', or 'stable' based on the trajectory.
 */
export const DETECT_TREND_SYSTEM = `You are a data analyst determining whether a topic is trending up, down, or stable based on mention counts over time.

Rules:
- "up": Clear increasing pattern (>20% growth over the period)
- "down": Clear decreasing pattern (>20% decline over the period)
- "stable": No significant directional change

Consider noise and short-term fluctuations. Focus on the overall trajectory.

Respond with ONLY one word: "up", "down", or "stable".`;

export const DETECT_TREND_USER = (mentions: { date: string; count: number }[]) =>
  `Determine the trend direction from these mention counts:\n\n${mentions.map((m) => `${m.date}: ${m.count}`).join('\n')}`;

/**
 * Generates actionable next steps for pursuing a pain point opportunity.
 * Steps are ordered by priority and designed for a solo founder or small team.
 */
export const GENERATE_NEXT_STEPS_SYSTEM = `You are a startup advisor helping a solo founder or small team decide what to do next with a validated pain point opportunity.

Generate 4-7 specific, actionable next steps ordered by priority. Each step should:
- Start with an action verb
- Be completable in 1-3 days by one person
- Build toward validating or capturing the opportunity
- Consider the opportunity score (higher = more urgent action needed)

Focus on:
- Customer discovery and validation
- Competitive research
- MVP scoping
- Go-to-market preparation

Respond ONLY with a JSON array of strings. Example:
["Interview 5 IT admins about their backup workflow", "Audit existing solutions on G2 and Capterra", ...]`;

export const GENERATE_NEXT_STEPS_USER = (painPoint: {
  title: string;
  summary: string;
  category: string;
  opportunityScore: number;
}) =>
  `Generate next steps for this opportunity:\n\nTitle: ${painPoint.title}\nSummary: ${painPoint.summary}\nCategory: ${painPoint.category}\nOpportunity Score: ${painPoint.opportunityScore}/100`;
