export type SourceType = 'reddit' | 'github' | 'forum' | 'review' | 'social' | 'community';

export type PainPointStatus = 'active' | 'resolved' | 'monitoring';

export type TrendDirection = 'up' | 'down' | 'stable';

export interface Source {
  SourceId: string;
  SourceType: SourceType;
  SourceName: string;
  SourceUrl: string;
  IsActive: boolean;
  CreatedAt: string;
}

export interface RawPost {
  RawPostId: string;
  SourceId: string;
  ExternalId: string;
  Title: string;
  Body: string;
  Author: string;
  Url: string;
  PublishedAt: string;
  CollectedAt: string;
}

export interface PainPoint {
  PainPointId: string;
  Title: string;
  Summary: string;
  Category: string;
  SeverityScore: number;
  FrequencyScore: number;
  WillingnessToPayScore: number;
  MarketSizeScore: number;
  TrendScore: number;
  OpportunityScore: number;
  FirstSeenAt: string;
  LastSeenAt: string;
  Status: PainPointStatus;
}

export interface PainPointMention {
  MentionId: string;
  PainPointId: string;
  RawPostId: string;
  ExtractedText: string;
  SentimentScore: number;
  SeverityScore: number;
  CreatedAt: string;
}

export interface Cluster {
  ClusterId: string;
  ClusterName: string;
  Description: string;
  Category: string;
  CreatedAt: string;
  PainPointIds: string[];
}

export interface ProductIdea {
  ProductIdeaId: string;
  PainPointId: string;
  Name: string;
  Description: string;
  TargetCustomer: string;
  MVPFeatures: string;
  DifficultyScore: number;
  RevenuePotentialScore: number;
  ExistingAlternatives: string;
  RecommendedFirstFeature: string;
  CreatedAt: string;
}

export interface TrendSnapshot {
  SnapshotId: string;
  PainPointId: string;
  SnapshotDate: string;
  MentionCount: number;
  AverageSeverity: number;
  OpportunityScore: number;
}

export interface DashboardStats {
  TotalProblems: number;
  NewThisWeek: number;
  TopTrending: string;
  HighestWTP: number;
  ClusterCount: number;
  EmergingAlerts: number;
}

export interface ProblemFilters {
  source?: string;
  category?: string;
  minScore?: number;
  maxScore?: number;
  trend?: TrendDirection;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PainPointDetail {
  painPoint: PainPoint;
  aiExplanation: string;
  sourceExamples: string[];
  similarComplaints: string[];
  suggestedProductIdeas: ProductIdea[];
  targetCustomers: string[];
  monetizationIdeas: string[];
  competitiveNotes: string[];
  recommendedNextSteps: string[];
}

export type SubmissionStatus = 'pending' | 'reviewing' | 'accepted' | 'declined';

export type SubmissionUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface UserProblemSubmission {
  SubmissionId: string;
  Title: string;
  Description: string;
  Category: string;
  Urgency: SubmissionUrgency;
  SubmitterName: string;
  SubmitterEmail: string;
  Status: SubmissionStatus;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreateSubmissionInput {
  title: string;
  description: string;
  category: string;
  urgency: SubmissionUrgency;
  submitterName?: string;
  submitterEmail?: string;
}

export interface WaitlistEntry {
  WaitlistId: string;
  Email: string;
  Source: string;
  CreatedAt: string;
}

export interface ConversionEventRecord {
  EventId: string;
  EventName: string;
  Path: string;
  PropsJson: string;
  CreatedAt: string;
}
