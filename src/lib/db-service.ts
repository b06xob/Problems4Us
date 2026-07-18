import { query, queryOne, execute } from './db';
import type {
  Source,
  SourceType,
  PainPoint,
  ProductIdea,
  TrendSnapshot,
  Cluster,
  DashboardStats,
  UserProblemSubmission,
  CreateSubmissionInput,
  SubmissionStatus,
  TrendDirection,
  WaitlistEntry,
  ConversionEventRecord,
  PlanEntitlementRecord,
} from './types';
import type { WaitlistSource } from './waitlist';
import type {
  ConversionEventName,
  ConversionFunnelCounts,
} from './conversion-events';
import { buildConversionFunnelCounts } from './conversion-events';
import {
  decideAdminPilotGrant,
  decideAdminPilotRevoke,
  decideAdminPilotRevokeAll,
  decidePaidBuilderGrant,
  decidePaidSeatRevokeGuard,
  normalizeEntitlementEmail,
  refusePilotOverwriteReason,
  type PlanEntitlement,
} from './entitlements';

export interface PainPointListItem extends PainPoint {
  SourceType: SourceType | string;
  TrendDirection: TrendDirection;
}

export interface ProductIdeaWithContext extends ProductIdea {
  PainPointTitle: string;
  Category: string;
}

export interface SourceWithStats extends Source {
  PostsCollected: number;
  PainPointsFound: number;
  LastScraped: string | null;
}

export interface SourceExample {
  source: string;
  sourceType: string;
  text: string;
  author: string;
  date: string;
  url: string;
}

export interface PainPointDetailResponse {
  painPoint: PainPointListItem;
  aiExplanation: string;
  sourceExamples: SourceExample[];
  similarComplaints: { id: string; title: string; score: number }[];
  productIdeas: {
    name: string;
    description: string;
    difficulty: number;
    revenue: number;
  }[];
  targetCustomers: string[];
  monetizationIdeas: string[];
  competitiveNotes: string[];
  trendHistory: { month: string; mentions: number; severity: number }[];
  nextSteps: string[];
}

function rowToPainPoint(row: Record<string, unknown>): PainPoint {
  return {
    PainPointId: String(row.PainPointId),
    Title: String(row.Title),
    Summary: String(row.Summary ?? ''),
    Category: String(row.Category ?? ''),
    SeverityScore: Number(row.SeverityScore ?? 0),
    FrequencyScore: Number(row.FrequencyScore ?? 0),
    WillingnessToPayScore: Number(row.WillingnessToPayScore ?? 0),
    MarketSizeScore: Number(row.MarketSizeScore ?? 0),
    TrendScore: Number(row.TrendScore ?? 0),
    OpportunityScore: Number(row.OpportunityScore ?? 0),
    FirstSeenAt: row.FirstSeenAt
      ? new Date(row.FirstSeenAt as string).toISOString()
      : new Date().toISOString(),
    LastSeenAt: row.LastSeenAt
      ? new Date(row.LastSeenAt as string).toISOString()
      : new Date().toISOString(),
    Status: (row.Status as PainPoint['Status']) ?? 'active',
  };
}

function computeTrendDirection(
  trendScore: number,
  snapshots: TrendSnapshot[]
): TrendDirection {
  if (snapshots.length >= 2) {
    const sorted = [...snapshots].sort((a, b) =>
      a.SnapshotDate.localeCompare(b.SnapshotDate)
    );
    const first = sorted[0].OpportunityScore ?? 0;
    const last = sorted[sorted.length - 1].OpportunityScore ?? 0;
    const diff = last - first;
    if (diff >= 5) return 'up';
    if (diff <= -5) return 'down';
    return 'stable';
  }

  if (trendScore >= 65) return 'up';
  if (trendScore <= 45) return 'down';
  return 'stable';
}

async function getPrimarySourceTypes(): Promise<Map<string, SourceType>> {
  const rows = await query<{ PainPointId: string; SourceType: SourceType }>(`
    SELECT pp.PainPointId, s.SourceType
    FROM PainPoints pp
    OUTER APPLY (
      SELECT TOP 1 src.SourceType
      FROM PainPointMentions m
      INNER JOIN RawPosts r ON m.RawPostId = r.RawPostId
      INNER JOIN Sources src ON r.SourceId = src.SourceId
      WHERE m.PainPointId = pp.PainPointId
      ORDER BY m.CreatedAt DESC
    ) s
  `);

  return new Map(rows.map((r) => [r.PainPointId, r.SourceType ?? 'forum']));
}

async function getTrendSnapshotsByPainPoint(): Promise<Map<string, TrendSnapshot[]>> {
  const rows = await query<TrendSnapshot>(`
    SELECT SnapshotId, PainPointId, SnapshotDate, MentionCount, AverageSeverity, OpportunityScore
    FROM TrendSnapshots
    ORDER BY SnapshotDate
  `);

  const map = new Map<string, TrendSnapshot[]>();
  for (const row of rows) {
    const list = map.get(row.PainPointId) ?? [];
    list.push({
      ...row,
      SnapshotDate:
        typeof row.SnapshotDate === 'string'
          ? row.SnapshotDate.slice(0, 10)
          : new Date(row.SnapshotDate).toISOString().slice(0, 10),
    });
    map.set(row.PainPointId, list);
  }
  return map;
}

export async function listPainPoints(
  filters: {
    search?: string;
    category?: string;
    sourceType?: string;
    minScore?: number;
    maxScore?: number;
    trend?: TrendDirection;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}
): Promise<{ data: PainPointListItem[]; total: number }> {
  const rows = await query<Record<string, unknown>>(`
    SELECT PainPointId, Title, Summary, Category,
           SeverityScore, FrequencyScore, WillingnessToPayScore,
           MarketSizeScore, TrendScore, OpportunityScore,
           FirstSeenAt, LastSeenAt, Status
    FROM PainPoints
  `);

  const sourceTypes = await getPrimarySourceTypes();
  const snapshotsByPainPoint = await getTrendSnapshotsByPainPoint();

  let items: PainPointListItem[] = rows.map((row) => {
    const painPoint = rowToPainPoint(row);
    const snapshots = snapshotsByPainPoint.get(painPoint.PainPointId) ?? [];
    return {
      ...painPoint,
      SourceType: sourceTypes.get(painPoint.PainPointId) ?? 'forum',
      TrendDirection: computeTrendDirection(painPoint.TrendScore, snapshots),
    };
  });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (pp) =>
        pp.Title.toLowerCase().includes(q) ||
        pp.Summary.toLowerCase().includes(q) ||
        pp.Category.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    items = items.filter((pp) => pp.Category === filters.category);
  }

  if (filters.sourceType) {
    items = items.filter((pp) => pp.SourceType === filters.sourceType);
  }

  if (filters.minScore !== undefined) {
    items = items.filter((pp) => pp.OpportunityScore >= filters.minScore!);
  }

  if (filters.maxScore !== undefined) {
    items = items.filter((pp) => pp.OpportunityScore <= filters.maxScore!);
  }

  if (filters.trend) {
    items = items.filter((pp) => pp.TrendDirection === filters.trend);
  }

  if (filters.status) {
    items = items.filter((pp) => pp.Status === filters.status);
  }

  const sortBy = filters.sortBy ?? 'OpportunityScore';
  const sortOrder = filters.sortOrder ?? 'desc';
  const sortFields: (keyof PainPointListItem)[] = [
    'OpportunityScore',
    'SeverityScore',
    'FrequencyScore',
    'WillingnessToPayScore',
    'TrendScore',
    'MarketSizeScore',
    'Title',
    'LastSeenAt',
    'FirstSeenAt',
  ];
  const field = sortFields.includes(sortBy as keyof PainPointListItem)
    ? (sortBy as keyof PainPointListItem)
    : 'OpportunityScore';

  items.sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
  });

  const total = items.length;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 100;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);

  return { data, total };
}

export async function getPainPointById(
  id: string
): Promise<PainPoint | undefined> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM PainPoints WHERE PainPointId = @id`,
    { id }
  );
  return row ? rowToPainPoint(row) : undefined;
}

export async function getPainPointDetail(
  id: string
): Promise<PainPointDetailResponse | undefined> {
  const painPoint = await getPainPointById(id);
  if (!painPoint) return undefined;

  const snapshots = await query<TrendSnapshot>(
    `SELECT SnapshotId, PainPointId, SnapshotDate, MentionCount, AverageSeverity, OpportunityScore
     FROM TrendSnapshots WHERE PainPointId = @id ORDER BY SnapshotDate`,
    { id }
  );

  const sourceType =
    (await queryOne<{ SourceType: SourceType }>(
      `SELECT TOP 1 s.SourceType
       FROM PainPointMentions m
       INNER JOIN RawPosts r ON m.RawPostId = r.RawPostId
       INNER JOIN Sources s ON r.SourceId = s.SourceId
       WHERE m.PainPointId = @id
       ORDER BY m.CreatedAt DESC`,
      { id }
    ))?.SourceType ?? 'forum';

  const painPointWithMeta: PainPointListItem = {
    ...painPoint,
    SourceType: sourceType,
    TrendDirection: computeTrendDirection(painPoint.TrendScore, snapshots),
  };

  const mentionRows = await query<{
    ExtractedText: string;
    SourceName: string;
    SourceType: SourceType;
    Author: string;
    Url: string;
    PublishedAt: string;
  }>(
    `SELECT m.ExtractedText, s.SourceName, s.SourceType, r.Author, r.Url, r.PublishedAt
     FROM PainPointMentions m
     INNER JOIN RawPosts r ON m.RawPostId = r.RawPostId
     INNER JOIN Sources s ON r.SourceId = s.SourceId
     WHERE m.PainPointId = @id
     ORDER BY m.CreatedAt DESC`,
    { id }
  );

  const ideaRows = await query<ProductIdea>(
    `SELECT * FROM ProductIdeas WHERE PainPointId = @id ORDER BY RevenuePotentialScore DESC`,
    { id }
  );

  const relatedRows = await query<{ PainPointId: string; Title: string; OpportunityScore: number }>(
    `SELECT TOP 5 pp.PainPointId, pp.Title, pp.OpportunityScore
     FROM ClusterPainPoints cp1
     INNER JOIN ClusterPainPoints cp2 ON cp1.ClusterId = cp2.ClusterId
     INNER JOIN PainPoints pp ON cp2.PainPointId = pp.PainPointId
     WHERE cp1.PainPointId = @id AND cp2.PainPointId <> @id
     ORDER BY pp.OpportunityScore DESC`,
    { id }
  );

  let similar = relatedRows;
  if (similar.length === 0) {
    similar = await query(
      `SELECT TOP 5 PainPointId, Title, OpportunityScore
       FROM PainPoints
       WHERE Category = @category AND PainPointId <> @id
       ORDER BY OpportunityScore DESC`,
      { category: painPoint.Category, id }
    );
  }

  const sourceExamples: SourceExample[] = mentionRows.map((m) => ({
    source: m.SourceName,
    sourceType: m.SourceType,
    text: m.ExtractedText,
    author: m.Author || 'Anonymous',
    date: m.PublishedAt
      ? new Date(m.PublishedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '',
    url: m.Url || '#',
  }));

  const productIdeas = ideaRows.map((i) => ({
    name: i.Name,
    description: i.Description,
    difficulty: i.DifficultyScore,
    revenue: i.RevenuePotentialScore,
  }));

  const aiExplanation = `${painPoint.Title} is a significant pain point affecting organizations in the ${painPoint.Category} space. With an opportunity score of ${painPoint.OpportunityScore}/100, this represents a strong product opportunity given the combination of frequency, severity, and willingness to pay observed across multiple community sources.

${painPoint.Summary}`;

  const targetCustomers = ideaRows.length
    ? ideaRows.map((i) => i.TargetCustomer).filter(Boolean)
    : [
        'IT teams at mid-size organizations (100-2000 employees)',
        'MSPs and consultants managing multiple client environments',
        'Teams without dedicated specialist staff for this domain',
      ];

  const competitiveNotes = ideaRows.length
    ? ideaRows.map((i) => `Alternatives: ${i.ExistingAlternatives}`).filter(Boolean)
    : [
        'Existing solutions are either too expensive or too limited',
        'Most competitors target enterprise, leaving mid-market underserved',
        'Community scripts and manual processes are the primary alternative',
      ];

  const nextSteps = ideaRows.length
    ? ideaRows.map((i) => `Build MVP starting with: ${i.RecommendedFirstFeature}`).filter(Boolean)
    : [
        'Validate pain intensity with 5-10 target customer interviews',
        'Build minimal viable solution addressing the core workflow',
        'Test pricing with early adopters from community forums',
      ];

  const trendHistory = snapshots.map((s) => ({
    month: new Date(s.SnapshotDate).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    mentions: s.MentionCount ?? 0,
    severity: Math.round(s.AverageSeverity ?? 0),
  }));

  return {
    painPoint: painPointWithMeta,
    aiExplanation,
    sourceExamples,
    similarComplaints: similar.map((r) => ({
      id: r.PainPointId,
      title: r.Title,
      score: r.OpportunityScore,
    })),
    productIdeas,
    targetCustomers,
    monetizationIdeas: [
      'SaaS subscription model ($99-$499/month depending on scale)',
      'Usage-based pricing aligned with value delivered',
      'Freemium tier to drive adoption and prove value',
    ],
    competitiveNotes,
    trendHistory,
    nextSteps,
  };
}

export async function listProductIdeas(filters: {
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<ProductIdeaWithContext[]> {
  let rows = await query<ProductIdeaWithContext>(`
    SELECT pi.*, pp.Title AS PainPointTitle, pp.Category
    FROM ProductIdeas pi
    INNER JOIN PainPoints pp ON pi.PainPointId = pp.PainPointId
  `);

  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (idea) =>
        idea.Name.toLowerCase().includes(q) ||
        idea.Description.toLowerCase().includes(q) ||
        idea.TargetCustomer.toLowerCase().includes(q) ||
        idea.PainPointTitle.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    rows = rows.filter((idea) => idea.Category === filters.category);
  }

  const sortBy = filters.sortBy ?? 'RevenuePotentialScore';
  const sortOrder = filters.sortOrder ?? 'desc';
  rows.sort((a, b) => {
    const aVal = a[sortBy as keyof ProductIdeaWithContext];
    const bVal = b[sortBy as keyof ProductIdeaWithContext];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc'
      ? Number(aVal) - Number(bVal)
      : Number(bVal) - Number(aVal);
  });

  return rows.map((row) => ({
    ...row,
    CreatedAt: row.CreatedAt
      ? new Date(row.CreatedAt).toISOString()
      : new Date().toISOString(),
  }));
}

export async function listSources(): Promise<SourceWithStats[]> {
  const rows = await query<SourceWithStats>(`
    SELECT s.SourceId, s.SourceType, s.SourceName, s.SourceUrl, s.IsActive, s.CreatedAt,
           CASE
             WHEN s.SourceType = 'community' THEN ISNULL(us.SubmissionCount, 0)
             ELSE ISNULL(rp.PostCount, 0)
           END AS PostsCollected,
           CASE
             WHEN s.SourceType = 'community' THEN ISNULL(us.AcceptedCount, 0)
             ELSE ISNULL(pp.PainPointCount, 0)
           END AS PainPointsFound,
           CASE
             WHEN s.SourceType = 'community' THEN us.LastSubmission
             ELSE rp.LastScraped
           END AS LastScraped
    FROM Sources s
    LEFT JOIN (
      SELECT SourceId, COUNT(*) AS PostCount, MAX(CollectedAt) AS LastScraped
      FROM RawPosts GROUP BY SourceId
    ) rp ON s.SourceId = rp.SourceId
    LEFT JOIN (
      SELECT r.SourceId, COUNT(DISTINCT m.PainPointId) AS PainPointCount
      FROM RawPosts r
      INNER JOIN PainPointMentions m ON r.RawPostId = m.RawPostId
      GROUP BY r.SourceId
    ) pp ON s.SourceId = pp.SourceId
    LEFT JOIN (
      SELECT COUNT(*) AS SubmissionCount,
             SUM(CASE WHEN Status = 'accepted' THEN 1 ELSE 0 END) AS AcceptedCount,
             MAX(CreatedAt) AS LastSubmission
      FROM UserSubmissions
    ) us ON s.SourceType = 'community'
    ORDER BY s.SourceName
  `);

  return rows.map((row) => ({
    ...row,
    IsActive: Boolean(row.IsActive),
    CreatedAt: new Date(row.CreatedAt).toISOString(),
    LastScraped: row.LastScraped
      ? new Date(row.LastScraped).toISOString()
      : null,
  }));
}

export async function getSourceById(id: string): Promise<Source | undefined> {
  const row = await queryOne<Source>(
    `SELECT SourceId, SourceType, SourceName, SourceUrl, IsActive, CreatedAt
     FROM Sources WHERE SourceId = @id`,
    { id }
  );
  if (!row) return undefined;
  return {
    ...row,
    IsActive: Boolean(row.IsActive),
    CreatedAt: new Date(row.CreatedAt).toISOString(),
  };
}

export async function createSource(input: {
  SourceType: SourceType;
  SourceName: string;
  SourceUrl: string;
}): Promise<Source> {
  const sourceId = `src-${input.SourceType}-${Date.now()}`;
  await execute(
    `INSERT INTO Sources (SourceId, SourceType, SourceName, SourceUrl, IsActive)
     VALUES (@sourceId, @sourceType, @sourceName, @sourceUrl, 1)`,
    {
      sourceId,
      sourceType: input.SourceType,
      sourceName: input.SourceName,
      sourceUrl: input.SourceUrl,
    }
  );
  return (await getSourceById(sourceId))!;
}

export async function updateSource(
  id: string,
  updates: Partial<Pick<Source, 'SourceName' | 'SourceUrl' | 'IsActive'>>
): Promise<Source | undefined> {
  const existing = await getSourceById(id);
  if (!existing) return undefined;

  await execute(
    `UPDATE Sources SET
       SourceName = @sourceName,
       SourceUrl = @sourceUrl,
       IsActive = @isActive
     WHERE SourceId = @id`,
    {
      id,
      sourceName: updates.SourceName ?? existing.SourceName,
      sourceUrl: updates.SourceUrl ?? existing.SourceUrl,
      isActive: updates.IsActive !== undefined ? (updates.IsActive ? 1 : 0) : existing.IsActive ? 1 : 0,
    }
  );

  return getSourceById(id);
}

export async function deleteSource(id: string): Promise<boolean> {
  const rows = await execute(`DELETE FROM Sources WHERE SourceId = @id`, { id });
  return rows > 0;
}

export async function getDashboardData() {
  const stats = await getDashboardStats();
  const { data: painPoints } = await listPainPoints({ limit: 1000 });

  const categoryMap = new Map<string, number>();
  for (const pp of painPoints) {
    categoryMap.set(pp.Category, (categoryMap.get(pp.Category) ?? 0) + 1);
  }
  const categoryBreakdown = Array.from(categoryMap.entries()).map(
    ([name, count]) => ({ name, count })
  );

  const severityDistribution = [
    { range: '0-20', count: 0 },
    { range: '21-40', count: 0 },
    { range: '41-60', count: 0 },
    { range: '61-80', count: 0 },
    { range: '81-100', count: 0 },
  ];
  for (const pp of painPoints) {
    const score = pp.SeverityScore;
    if (score <= 20) severityDistribution[0].count++;
    else if (score <= 40) severityDistribution[1].count++;
    else if (score <= 60) severityDistribution[2].count++;
    else if (score <= 80) severityDistribution[3].count++;
    else severityDistribution[4].count++;
  }

  const trendRows = await query<{
    monthLabel: string;
    problems: number;
    mentions: number;
  }>(`
    SELECT
      FORMAT(SnapshotDate, 'MMM yyyy') AS monthLabel,
      COUNT(DISTINCT PainPointId) AS problems,
      SUM(MentionCount) AS mentions
    FROM TrendSnapshots
    GROUP BY FORMAT(SnapshotDate, 'yyyy-MM'), FORMAT(SnapshotDate, 'MMM yyyy')
    ORDER BY MIN(SnapshotDate)
  `);

  const trendData = trendRows.map((r) => ({
    month: r.monthLabel,
    problems: Number(r.problems),
    mentions: Number(r.mentions),
  }));

  const topOpportunities = [...painPoints]
    .sort((a, b) => b.OpportunityScore - a.OpportunityScore)
    .slice(0, 8)
    .map((pp) => ({
      id: pp.PainPointId,
      title: pp.Title,
      score: pp.OpportunityScore,
      trend: pp.TrendDirection,
      category: pp.Category,
    }));

  return {
    ...stats,
    trendData,
    categoryBreakdown,
    severityDistribution,
    topOpportunities,
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM PainPoints`
  );
  const clusterRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM Clusters`
  );

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const newRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM PainPoints WHERE FirstSeenAt >= @weekAgo`,
    { weekAgo: weekAgo.toISOString() }
  );

  const topRow = await queryOne<{ Title: string }>(
    `SELECT TOP 1 Title FROM PainPoints ORDER BY TrendScore DESC`
  );

  const wtpRow = await queryOne<{ maxWtp: number }>(
    `SELECT MAX(WillingnessToPayScore) AS maxWtp FROM PainPoints`
  );

  const emergingRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM PainPoints WHERE Status = 'active' AND TrendScore >= 65`
  );

  return {
    TotalProblems: totalRow?.total ?? 0,
    NewThisWeek: newRow?.total ?? 0,
    TopTrending: topRow?.Title ?? '',
    HighestWTP: wtpRow?.maxWtp ?? 0,
    ClusterCount: clusterRow?.total ?? 0,
    EmergingAlerts: emergingRow?.total ?? 0,
  };
}

export async function listUserSubmissions(filters: {
  category?: string;
  urgency?: string;
  status?: string;
  search?: string;
} = {}): Promise<UserProblemSubmission[]> {
  let rows = await query<UserProblemSubmission>(`
    SELECT SubmissionId, Title, Description, Category, Urgency,
           SubmitterName, SubmitterEmail, Status, CreatedAt, UpdatedAt
    FROM UserSubmissions
    ORDER BY CreatedAt DESC
  `);

  if (filters.category) {
    rows = rows.filter((s) => s.Category === filters.category);
  }
  if (filters.urgency) {
    rows = rows.filter((s) => s.Urgency === filters.urgency);
  }
  if (filters.status) {
    rows = rows.filter((s) => s.Status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (s) =>
        s.Title.toLowerCase().includes(q) ||
        s.Description.toLowerCase().includes(q) ||
        s.Category.toLowerCase().includes(q)
    );
  }

  return rows.map((row) => ({
    ...row,
    SubmitterName: row.SubmitterName ?? '',
    SubmitterEmail: row.SubmitterEmail ?? '',
    CreatedAt: new Date(row.CreatedAt).toISOString(),
    UpdatedAt: new Date(row.UpdatedAt).toISOString(),
  }));
}

export async function createUserSubmissionDb(
  input: CreateSubmissionInput
): Promise<UserProblemSubmission> {
  const submissionId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO UserSubmissions
       (SubmissionId, Title, Description, Category, Urgency, SubmitterName, SubmitterEmail, Status, CreatedAt, UpdatedAt)
     VALUES
       (@submissionId, @title, @description, @category, @urgency, @submitterName, @submitterEmail, 'pending', @now, @now)`,
    {
      submissionId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      urgency: input.urgency,
      submitterName: input.submitterName?.trim() ?? '',
      submitterEmail: input.submitterEmail?.trim() ?? '',
      now,
    }
  );

  return {
    SubmissionId: submissionId,
    Title: input.title.trim(),
    Description: input.description.trim(),
    Category: input.category.trim(),
    Urgency: input.urgency,
    SubmitterName: input.submitterName?.trim() ?? '',
    SubmitterEmail: input.submitterEmail?.trim() ?? '',
    Status: 'pending',
    CreatedAt: now,
    UpdatedAt: now,
  };
}

export async function insertPainPoint(painPoint: PainPoint): Promise<void> {
  await execute(
    `INSERT INTO PainPoints
       (PainPointId, Title, Summary, Category, SeverityScore, FrequencyScore,
        WillingnessToPayScore, MarketSizeScore, TrendScore, OpportunityScore,
        FirstSeenAt, LastSeenAt, Status)
     VALUES
       (@id, @title, @summary, @category, @severity, @frequency, @wtp, @market, @trend, @opportunity, @firstSeen, @lastSeen, @status)`,
    {
      id: painPoint.PainPointId,
      title: painPoint.Title,
      summary: painPoint.Summary,
      category: painPoint.Category,
      severity: painPoint.SeverityScore,
      frequency: painPoint.FrequencyScore,
      wtp: painPoint.WillingnessToPayScore,
      market: painPoint.MarketSizeScore,
      trend: painPoint.TrendScore,
      opportunity: painPoint.OpportunityScore,
      firstSeen: painPoint.FirstSeenAt,
      lastSeen: painPoint.LastSeenAt,
      status: painPoint.Status,
    }
  );
}

export async function insertRawPost(post: {
  RawPostId: string;
  SourceId: string;
  ExternalId: string;
  Title: string;
  Body: string;
  Author: string;
  Url: string;
  PublishedAt: string;
}): Promise<void> {
  await execute(
    `INSERT INTO RawPosts
       (RawPostId, SourceId, ExternalId, Title, Body, Author, Url, PublishedAt)
     VALUES
       (@id, @sourceId, @externalId, @title, @body, @author, @url, @publishedAt)`,
    {
      id: post.RawPostId,
      sourceId: post.SourceId,
      externalId: post.ExternalId,
      title: post.Title,
      body: post.Body,
      author: post.Author,
      url: post.Url,
      publishedAt: post.PublishedAt,
    }
  );
}

export async function getClusters(): Promise<Cluster[]> {
  const clusters = await query<Omit<Cluster, 'PainPointIds'>>(
    `SELECT ClusterId, ClusterName, Description, Category, CreatedAt FROM Clusters`
  );

  const mappings = await query<{ ClusterId: string; PainPointId: string }>(
    `SELECT ClusterId, PainPointId FROM ClusterPainPoints`
  );

  return clusters.map((c) => ({
    ...c,
    CreatedAt: new Date(c.CreatedAt).toISOString(),
    PainPointIds: mappings
      .filter((m) => m.ClusterId === c.ClusterId)
      .map((m) => m.PainPointId),
  }));
}

export async function getProductIdeasForPainPoint(
  painPointId: string
): Promise<ProductIdea[]> {
  return query(
    `SELECT * FROM ProductIdeas WHERE PainPointId = @painPointId`,
    { painPointId }
  );
}

export async function getTrendSnapshotsForPainPoint(
  painPointId: string
): Promise<TrendSnapshot[]> {
  return query(
    `SELECT * FROM TrendSnapshots WHERE PainPointId = @painPointId ORDER BY SnapshotDate`,
    { painPointId }
  );
}

export async function updateSubmissionStatusDb(
  id: string,
  status: SubmissionStatus
): Promise<UserProblemSubmission | undefined> {
  const rows = await execute(
    `UPDATE UserSubmissions SET Status = @status, UpdatedAt = GETUTCDATE() WHERE SubmissionId = @id`,
    { id, status }
  );
  if (rows === 0) return undefined;
  const all = await listUserSubmissions();
  return all.find((s) => s.SubmissionId === id);
}

let waitlistTablesReady: Promise<void> | null = null;

async function ensureWaitlistTables(): Promise<void> {
  if (!waitlistTablesReady) {
    waitlistTablesReady = (async () => {
      await execute(`
        IF OBJECT_ID(N'dbo.WaitlistEntries', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.WaitlistEntries (
            WaitlistId   NVARCHAR(50)  NOT NULL PRIMARY KEY,
            Email        NVARCHAR(200) NOT NULL,
            Source       NVARCHAR(50)  NOT NULL CONSTRAINT DF_Waitlist_Source DEFAULT ('other'),
            CreatedAt    DATETIME2     NOT NULL CONSTRAINT DF_Waitlist_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_WaitlistEntries_Email ON dbo.WaitlistEntries(Email);
          CREATE INDEX IX_WaitlistEntries_CreatedAt ON dbo.WaitlistEntries(CreatedAt DESC);
        END
      `);
      await execute(`
        IF OBJECT_ID(N'dbo.ConversionEvents', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.ConversionEvents (
            EventId      NVARCHAR(50)  NOT NULL PRIMARY KEY,
            EventName    NVARCHAR(80)  NOT NULL,
            Path         NVARCHAR(500) NULL,
            PropsJson    NVARCHAR(MAX) NULL,
            CreatedAt    DATETIME2     NOT NULL CONSTRAINT DF_ConversionEvents_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE INDEX IX_ConversionEvents_Name_Created
            ON dbo.ConversionEvents(EventName, CreatedAt DESC);
        END
      `);
      await execute(`
        IF OBJECT_ID(N'dbo.PlanEntitlements', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.PlanEntitlements (
            EntitlementId    NVARCHAR(50)  NOT NULL PRIMARY KEY,
            Email            NVARCHAR(200) NOT NULL,
            Tier             NVARCHAR(40)  NOT NULL,
            Status           NVARCHAR(40)  NOT NULL,
            StripeSessionId  NVARCHAR(120) NULL,
            StripeEventId    NVARCHAR(120) NULL,
            GrantedAt        DATETIME2     NOT NULL CONSTRAINT DF_PlanEntitlements_GrantedAt DEFAULT (GETUTCDATE()),
            UpdatedAt        DATETIME2     NOT NULL CONSTRAINT DF_PlanEntitlements_UpdatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_PlanEntitlements_Email ON dbo.PlanEntitlements(Email);
          CREATE INDEX IX_PlanEntitlements_Tier_Status ON dbo.PlanEntitlements(Tier, Status);
        END
      `);
    })().catch((err) => {
      waitlistTablesReady = null;
      throw err;
    });
  }
  await waitlistTablesReady;
}

export async function createWaitlistEntryDb(
  email: string,
  source: WaitlistSource
): Promise<{ entry: WaitlistEntry; created: boolean }> {
  await ensureWaitlistTables();

  const existing = await queryOne<{ WaitlistId: string; Email: string; Source: string; CreatedAt: Date | string }>(
    `SELECT TOP 1 WaitlistId, Email, Source, CreatedAt FROM WaitlistEntries WHERE Email = @email`,
    { email }
  );

  if (existing) {
    return {
      created: false,
      entry: {
        WaitlistId: existing.WaitlistId,
        Email: existing.Email,
        Source: existing.Source,
        CreatedAt: new Date(existing.CreatedAt).toISOString(),
      },
    };
  }

  const waitlistId = `wl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO WaitlistEntries (WaitlistId, Email, Source, CreatedAt)
     VALUES (@waitlistId, @email, @source, @now)`,
    { waitlistId, email, source, now }
  );

  return {
    created: true,
    entry: {
      WaitlistId: waitlistId,
      Email: email,
      Source: source,
      CreatedAt: now,
    },
  };
}

export async function listWaitlistEntriesDb(): Promise<WaitlistEntry[]> {
  await ensureWaitlistTables();
  const rows = await query<{
    WaitlistId: string;
    Email: string;
    Source: string;
    CreatedAt: Date | string;
  }>(`SELECT WaitlistId, Email, Source, CreatedAt FROM WaitlistEntries ORDER BY CreatedAt DESC`);

  return rows.map((row) => ({
    WaitlistId: row.WaitlistId,
    Email: row.Email,
    Source: row.Source,
    CreatedAt: new Date(row.CreatedAt).toISOString(),
  }));
}

export async function countWaitlistEntriesDb(): Promise<number> {
  await ensureWaitlistTables();
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM WaitlistEntries`
  );
  return row?.cnt ?? 0;
}

export async function insertConversionEventDb(
  eventName: ConversionEventName,
  path: string,
  props: Record<string, unknown>
): Promise<ConversionEventRecord> {
  await ensureWaitlistTables();

  const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const propsJson = JSON.stringify(props ?? {});

  await execute(
    `INSERT INTO ConversionEvents (EventId, EventName, Path, PropsJson, CreatedAt)
     VALUES (@eventId, @eventName, @path, @propsJson, @now)`,
    { eventId, eventName, path: path.slice(0, 500), propsJson, now }
  );

  return {
    EventId: eventId,
    EventName: eventName,
    Path: path,
    PropsJson: propsJson,
    CreatedAt: now,
  };
}

/**
 * Idempotent paid_early_access insert keyed by Stripe event id (webhook retries).
 * Returns existing row when stripeEventId was already recorded.
 */
export async function insertPaidEarlyAccessEventDb(
  path: string,
  props: {
    sessionId: string;
    email: string | null;
    tier: string;
    paymentStatus: string | null;
    stripeEventId: string | null;
  }
): Promise<{ record: ConversionEventRecord; created: boolean }> {
  await ensureWaitlistTables();

  const stripeEventId = props.stripeEventId?.trim() || "";
  if (stripeEventId) {
    const existing = await queryOne<{
      EventId: string;
      EventName: string;
      Path: string | null;
      PropsJson: string | null;
      CreatedAt: Date | string;
    }>(
      `SELECT TOP 1 EventId, EventName, Path, PropsJson, CreatedAt
       FROM ConversionEvents
       WHERE EventName = N'paid_early_access'
         AND JSON_VALUE(PropsJson, '$.stripeEventId') = @stripeEventId
       ORDER BY CreatedAt DESC`,
      { stripeEventId }
    );
    if (existing) {
      return {
        record: {
          EventId: existing.EventId,
          EventName: existing.EventName,
          Path: existing.Path ?? "",
          PropsJson: existing.PropsJson ?? "{}",
          CreatedAt:
            typeof existing.CreatedAt === "string"
              ? existing.CreatedAt
              : existing.CreatedAt.toISOString(),
        },
        created: false,
      };
    }
  }

  const record = await insertConversionEventDb("paid_early_access", path, props);
  return { record, created: true };
}

/** Admin funnel KPI: conversion event counts in a recent window (default 24h). */
export async function summarizeConversionEventsDb(
  sinceHours = 24
): Promise<{ sinceHours: number; counts: ConversionFunnelCounts }> {
  await ensureWaitlistTables();

  const hours = Math.min(Math.max(Math.floor(sinceHours) || 24, 1), 720);
  const rows = await query<{ EventName: string; cnt: number }>(
    `SELECT EventName, COUNT(*) AS cnt
     FROM ConversionEvents
     WHERE CreatedAt >= DATEADD(hour, -@hours, SYSUTCDATETIME())
     GROUP BY EventName`,
    { hours }
  );

  return {
    sinceHours: hours,
    counts: buildConversionFunnelCounts(
      rows.map((r) => ({ eventName: r.EventName, count: Number(r.cnt) || 0 }))
    ),
  };
}

function mapPlanEntitlementRow(row: {
  EntitlementId: string;
  Email: string;
  Tier: string;
  Status: string;
  StripeSessionId: string | null;
  StripeEventId: string | null;
  GrantedAt: Date | string;
  UpdatedAt: Date | string;
}): PlanEntitlementRecord {
  return {
    EntitlementId: row.EntitlementId,
    Email: row.Email,
    Tier: row.Tier,
    Status: row.Status,
    StripeSessionId: row.StripeSessionId,
    StripeEventId: row.StripeEventId,
    GrantedAt:
      typeof row.GrantedAt === "string"
        ? row.GrantedAt
        : row.GrantedAt.toISOString(),
    UpdatedAt:
      typeof row.UpdatedAt === "string"
        ? row.UpdatedAt
        : row.UpdatedAt.toISOString(),
  };
}

/**
 * Upsert active Builder entitlement from a paid Stripe checkout (M2.2).
 * Idempotent by email; refreshes session/event ids on repeat grants.
 */
export async function upsertPaidBuilderEntitlementDb(input: {
  email: string;
  sessionId: string;
  stripeEventId: string | null;
  paymentStatus: string | null;
}): Promise<
  | { granted: true; created: boolean; entitlement: PlanEntitlementRecord }
  | { granted: false; reason: string }
> {
  const decision = decidePaidBuilderGrant(input);
  if (!decision.ok) {
    return { granted: false, reason: decision.reason };
  }

  await ensureWaitlistTables();

  const email = decision.email;
  const now = new Date().toISOString();
  const existing = await queryOne<{
    EntitlementId: string;
    Email: string;
    Tier: string;
    Status: string;
    StripeSessionId: string | null;
    StripeEventId: string | null;
    GrantedAt: Date | string;
    UpdatedAt: Date | string;
  }>(
    `SELECT TOP 1 EntitlementId, Email, Tier, Status, StripeSessionId, StripeEventId, GrantedAt, UpdatedAt
     FROM PlanEntitlements WHERE Email = @email`,
    { email }
  );

  if (existing) {
    await execute(
      `UPDATE PlanEntitlements
       SET Tier = @tier,
           Status = @status,
           StripeSessionId = @sessionId,
           StripeEventId = @stripeEventId,
           UpdatedAt = @now
       WHERE Email = @email`,
      {
        email,
        tier: decision.tier,
        status: decision.status,
        sessionId: input.sessionId,
        stripeEventId: input.stripeEventId,
        now,
      }
    );
    return {
      granted: true,
      created: false,
      entitlement: mapPlanEntitlementRow({
        ...existing,
        Tier: decision.tier,
        Status: decision.status,
        StripeSessionId: input.sessionId,
        StripeEventId: input.stripeEventId,
        UpdatedAt: now,
      }),
    };
  }

  const entitlementId = `ent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await execute(
    `INSERT INTO PlanEntitlements
       (EntitlementId, Email, Tier, Status, StripeSessionId, StripeEventId, GrantedAt, UpdatedAt)
     VALUES
       (@entitlementId, @email, @tier, @status, @sessionId, @stripeEventId, @now, @now)`,
    {
      entitlementId,
      email,
      tier: decision.tier,
      status: decision.status,
      sessionId: input.sessionId,
      stripeEventId: input.stripeEventId,
      now,
    }
  );

  return {
    granted: true,
    created: true,
    entitlement: {
      EntitlementId: entitlementId,
      Email: email,
      Tier: decision.tier,
      Status: decision.status,
      StripeSessionId: input.sessionId,
      StripeEventId: input.stripeEventId,
      GrantedAt: now,
      UpdatedAt: now,
    },
  };
}

/**
 * Admin pilot grant (G7 bypass for ops/pilot while Stripe keys pending).
 * Uses synthetic admin_pilot: session ids — not Stripe.
 */
export async function upsertAdminPilotBuilderEntitlementDb(input: {
  email: string;
  note?: string | null;
}): Promise<
  | { granted: true; created: boolean; entitlement: PlanEntitlementRecord }
  | { granted: false; reason: string }
> {
  const decision = decideAdminPilotGrant(input.email, input.note);
  if (!decision.ok) {
    return { granted: false, reason: decision.reason };
  }

  await ensureWaitlistTables();

  const email = decision.email;
  const now = new Date().toISOString();
  const existing = await queryOne<{
    EntitlementId: string;
    Email: string;
    Tier: string;
    Status: string;
    StripeSessionId: string | null;
    StripeEventId: string | null;
    GrantedAt: Date | string;
    UpdatedAt: Date | string;
  }>(
    `SELECT TOP 1 EntitlementId, Email, Tier, Status, StripeSessionId, StripeEventId, GrantedAt, UpdatedAt
     FROM PlanEntitlements WHERE Email = @email`,
    { email }
  );

  if (existing) {
    const overwriteBlock = refusePilotOverwriteReason({
      Tier: existing.Tier as PlanEntitlement["Tier"],
      Status: existing.Status as PlanEntitlement["Status"],
      StripeSessionId: existing.StripeSessionId,
    });
    if (overwriteBlock) {
      return { granted: false, reason: overwriteBlock };
    }
    await execute(
      `UPDATE PlanEntitlements
       SET Tier = @tier,
           Status = @status,
           StripeSessionId = @sessionId,
           StripeEventId = NULL,
           UpdatedAt = @now
       WHERE Email = @email`,
      {
        email,
        tier: decision.tier,
        status: decision.status,
        sessionId: decision.sessionId,
        now,
      }
    );
    return {
      granted: true,
      created: false,
      entitlement: mapPlanEntitlementRow({
        ...existing,
        Tier: decision.tier,
        Status: decision.status,
        StripeSessionId: decision.sessionId,
        StripeEventId: null,
        UpdatedAt: now,
      }),
    };
  }

  const entitlementId = `ent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await execute(
    `INSERT INTO PlanEntitlements
       (EntitlementId, Email, Tier, Status, StripeSessionId, StripeEventId, GrantedAt, UpdatedAt)
     VALUES
       (@entitlementId, @email, @tier, @status, @sessionId, NULL, @now, @now)`,
    {
      entitlementId,
      email,
      tier: decision.tier,
      status: decision.status,
      sessionId: decision.sessionId,
      now,
    }
  );

  return {
    granted: true,
    created: true,
    entitlement: {
      EntitlementId: entitlementId,
      Email: email,
      Tier: decision.tier,
      Status: decision.status,
      StripeSessionId: decision.sessionId,
      StripeEventId: null,
      GrantedAt: now,
      UpdatedAt: now,
    },
  };
}

/**
 * Admin revoke: set Builder entitlement to canceled (keeps row for audit).
 * Paid (non-pilot) seats require confirm=REVOKE_PAID.
 */
export async function revokeBuilderEntitlementDb(input: {
  email: string;
  confirm?: string | null;
}): Promise<
  | { revoked: true; found: boolean; entitlement: PlanEntitlementRecord | null }
  | { revoked: false; reason: string }
> {
  const decision = decideAdminPilotRevoke(input.email);
  if (!decision.ok) {
    return { revoked: false, reason: decision.reason };
  }

  await ensureWaitlistTables();

  const email = decision.email;
  const now = new Date().toISOString();
  const existing = await queryOne<{
    EntitlementId: string;
    Email: string;
    Tier: string;
    Status: string;
    StripeSessionId: string | null;
    StripeEventId: string | null;
    GrantedAt: Date | string;
    UpdatedAt: Date | string;
  }>(
    `SELECT TOP 1 EntitlementId, Email, Tier, Status, StripeSessionId, StripeEventId, GrantedAt, UpdatedAt
     FROM PlanEntitlements WHERE Email = @email`,
    { email }
  );

  if (!existing) {
    return { revoked: true, found: false, entitlement: null };
  }

  const paidGuard = decidePaidSeatRevokeGuard({
    stripeSessionId: existing.StripeSessionId,
    status: existing.Status,
    confirm: input.confirm,
  });
  if (!paidGuard.ok) {
    return { revoked: false, reason: paidGuard.reason };
  }

  await execute(
    `UPDATE PlanEntitlements
     SET Status = @status, UpdatedAt = @now
     WHERE Email = @email`,
    { email, status: decision.status, now }
  );

  return {
    revoked: true,
    found: true,
    entitlement: mapPlanEntitlementRow({
      ...existing,
      Status: decision.status,
      UpdatedAt: now,
    }),
  };
}

/**
 * Bulk cancel every active Builder seat with synthetic admin_pilot: session.
 * Never touches paid Stripe sessions (cs_…). dryRun returns emails without UPDATE.
 */
export async function revokeAllActivePilotBuilderEntitlementsDb(input: {
  confirm?: string | null;
  dryRun?: boolean | null;
}): Promise<
  | {
      revoked: true;
      dryRun: boolean;
      count: number;
      emails: string[];
    }
  | { revoked: false; reason: string }
> {
  const decision = decideAdminPilotRevokeAll(input);
  if (!decision.ok) {
    return { revoked: false, reason: decision.reason };
  }

  await ensureWaitlistTables();

  const rows = await query<{ Email: string }>(
    `SELECT Email FROM PlanEntitlements
     WHERE Tier = N'builder' AND Status = N'active'
       AND StripeSessionId LIKE N'admin_pilot:%'
     ORDER BY UpdatedAt DESC`
  );
  const emails = rows.map((r) => r.Email);

  if (decision.dryRun || emails.length === 0) {
    return {
      revoked: true,
      dryRun: decision.dryRun,
      count: emails.length,
      emails,
    };
  }

  const now = new Date().toISOString();
  await execute(
    `UPDATE PlanEntitlements
     SET Status = N'canceled', UpdatedAt = @now
     WHERE Tier = N'builder' AND Status = N'active'
       AND StripeSessionId LIKE N'admin_pilot:%'`,
    { now }
  );

  return {
    revoked: true,
    dryRun: false,
    count: emails.length,
    emails,
  };
}

export async function getPlanEntitlementByEmailDb(
  email: string
): Promise<PlanEntitlementRecord | null> {
  await ensureWaitlistTables();
  const normalized = normalizeEntitlementEmail(email);
  if (!normalized) return null;

  const row = await queryOne<{
    EntitlementId: string;
    Email: string;
    Tier: string;
    Status: string;
    StripeSessionId: string | null;
    StripeEventId: string | null;
    GrantedAt: Date | string;
    UpdatedAt: Date | string;
  }>(
    `SELECT TOP 1 EntitlementId, Email, Tier, Status, StripeSessionId, StripeEventId, GrantedAt, UpdatedAt
     FROM PlanEntitlements WHERE Email = @email`,
    { email: normalized }
  );
  return row ? mapPlanEntitlementRow(row) : null;
}

export async function countActiveBuilderEntitlementsDb(): Promise<number> {
  await ensureWaitlistTables();
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM PlanEntitlements WHERE Tier = N'builder' AND Status = N'active'`
  );
  return row?.cnt ?? 0;
}

export async function countActivePilotBuilderEntitlementsDb(): Promise<number> {
  await ensureWaitlistTables();
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM PlanEntitlements
     WHERE Tier = N'builder' AND Status = N'active'
       AND StripeSessionId LIKE N'admin_pilot:%'`
  );
  return row?.cnt ?? 0;
}

/**
 * Active Builder seats for admin cohort list (newest first).
 * When pilotOnly=true, only synthetic admin_pilot: sessions.
 */
export async function listActiveBuilderEntitlementsDb(options?: {
  pilotOnly?: boolean;
  limit?: number;
}): Promise<PlanEntitlementRecord[]> {
  await ensureWaitlistTables();
  const pilotOnly = Boolean(options?.pilotOnly);
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);

  const rows = await query<{
    EntitlementId: string;
    Email: string;
    Tier: string;
    Status: string;
    StripeSessionId: string | null;
    StripeEventId: string | null;
    GrantedAt: Date | string;
    UpdatedAt: Date | string;
  }>(
    pilotOnly
      ? `SELECT TOP (${limit}) EntitlementId, Email, Tier, Status, StripeSessionId, StripeEventId, GrantedAt, UpdatedAt
         FROM PlanEntitlements
         WHERE Tier = N'builder' AND Status = N'active'
           AND StripeSessionId LIKE N'admin_pilot:%'
         ORDER BY UpdatedAt DESC`
      : `SELECT TOP (${limit}) EntitlementId, Email, Tier, Status, StripeSessionId, StripeEventId, GrantedAt, UpdatedAt
         FROM PlanEntitlements
         WHERE Tier = N'builder' AND Status = N'active'
         ORDER BY UpdatedAt DESC`
  );

  return rows.map(mapPlanEntitlementRow);
}

/** Narrow PlanEntitlementRecord → PlanEntitlement for access checks. */
export function toPlanEntitlement(
  record: PlanEntitlementRecord | null
): PlanEntitlement | null {
  if (!record) return null;
  if (record.Tier !== "builder" && record.Tier !== "explorer") return null;
  if (
    record.Status !== "active" &&
    record.Status !== "canceled" &&
    record.Status !== "past_due"
  ) {
    return null;
  }
  return {
    EntitlementId: record.EntitlementId,
    Email: record.Email,
    Tier: record.Tier,
    Status: record.Status,
    StripeSessionId: record.StripeSessionId,
    StripeEventId: record.StripeEventId,
    GrantedAt: record.GrantedAt,
    UpdatedAt: record.UpdatedAt,
  };
}
