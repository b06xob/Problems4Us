import type {
  Source,
  PainPoint,
  PainPointMention,
  Cluster,
  ProductIdea,
  TrendSnapshot,
  DashboardStats,
  PainPointDetail,
} from './types';
import { calculateOpportunityScore } from './scoring';

// ─── Sources ───────────────────────────────────────────────────────────────────

const sources: Source[] = [
  {
    SourceId: 'src-reddit-sysadmin',
    SourceType: 'reddit',
    SourceName: 'r/sysadmin',
    SourceUrl: 'https://reddit.com/r/sysadmin',
    IsActive: true,
    CreatedAt: '2025-01-15T08:00:00Z',
  },
  {
    SourceId: 'src-reddit-azure',
    SourceType: 'reddit',
    SourceName: 'r/azure',
    SourceUrl: 'https://reddit.com/r/azure',
    IsActive: true,
    CreatedAt: '2025-01-15T08:00:00Z',
  },
  {
    SourceId: 'src-reddit-powershell',
    SourceType: 'reddit',
    SourceName: 'r/PowerShell',
    SourceUrl: 'https://reddit.com/r/PowerShell',
    IsActive: true,
    CreatedAt: '2025-02-01T10:00:00Z',
  },
  {
    SourceId: 'src-github-issues',
    SourceType: 'github',
    SourceName: 'GitHub Issues (Azure CLI, Az PowerShell)',
    SourceUrl: 'https://github.com/Azure/azure-cli/issues',
    IsActive: true,
    CreatedAt: '2025-01-20T12:00:00Z',
  },
  {
    SourceId: 'src-forum-spiceworks',
    SourceType: 'forum',
    SourceName: 'Spiceworks Community',
    SourceUrl: 'https://community.spiceworks.com',
    IsActive: true,
    CreatedAt: '2025-02-10T09:00:00Z',
  },
  {
    SourceId: 'src-review-g2',
    SourceType: 'review',
    SourceName: 'G2 Reviews',
    SourceUrl: 'https://www.g2.com',
    IsActive: true,
    CreatedAt: '2025-03-01T11:00:00Z',
  },
  {
    SourceId: 'src-reddit-smallbiz',
    SourceType: 'reddit',
    SourceName: 'r/smallbusiness',
    SourceUrl: 'https://reddit.com/r/smallbusiness',
    IsActive: true,
    CreatedAt: '2025-03-15T08:00:00Z',
  },
  {
    SourceId: 'src-social-twitter',
    SourceType: 'social',
    SourceName: 'X/Twitter IT Professionals',
    SourceUrl: 'https://x.com',
    IsActive: true,
    CreatedAt: '2025-04-01T14:00:00Z',
  },
];

// ─── Pain Points ───────────────────────────────────────────────────────────────

const painPoints: PainPoint[] = [
  {
    PainPointId: 'pp-azure-cost-1',
    Title: 'Unexpected Azure bill spikes from forgotten dev resources',
    Summary: 'Teams regularly leave dev/test VMs, AKS clusters, and storage accounts running over weekends and holidays, causing 30-60% budget overruns that are only discovered at month-end.',
    Category: 'Azure Cost Management',
    SeverityScore: 82,
    FrequencyScore: 88,
    WillingnessToPayScore: 91,
    MarketSizeScore: 85,
    TrendScore: 76,
    OpportunityScore: 0,
    FirstSeenAt: '2025-03-12T10:00:00Z',
    LastSeenAt: '2026-06-28T14:30:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-azure-cost-2',
    Title: 'Reserved Instance sizing and commitment confusion',
    Summary: 'Organizations struggle to determine optimal RI commitments—buying too many leads to waste, too few means paying on-demand rates. The Azure advisor recommendations are often stale or contradictory.',
    Category: 'Azure Cost Management',
    SeverityScore: 71,
    FrequencyScore: 74,
    WillingnessToPayScore: 85,
    MarketSizeScore: 80,
    TrendScore: 62,
    OpportunityScore: 0,
    FirstSeenAt: '2025-04-08T09:00:00Z',
    LastSeenAt: '2026-06-25T11:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-azure-cost-3',
    Title: 'Cost alerts arrive too late to prevent overruns',
    Summary: 'Azure cost alerts are delayed 24-48 hours, and by the time teams get notified of a budget threshold breach, the damage is already significant. No real-time budget enforcement exists.',
    Category: 'Azure Cost Management',
    SeverityScore: 68,
    FrequencyScore: 72,
    WillingnessToPayScore: 78,
    MarketSizeScore: 75,
    TrendScore: 70,
    OpportunityScore: 0,
    FirstSeenAt: '2025-05-20T08:00:00Z',
    LastSeenAt: '2026-06-30T09:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-sql-perf-1',
    Title: 'SQL Server query performance degrades silently after updates',
    Summary: 'After cumulative updates or statistics rebuilds, query plans change unexpectedly, causing 10-50x slowdowns on critical reports. DBAs spend days identifying plan regressions with no automated tooling.',
    Category: 'SQL Server Administration',
    SeverityScore: 89,
    FrequencyScore: 65,
    WillingnessToPayScore: 82,
    MarketSizeScore: 70,
    TrendScore: 58,
    OpportunityScore: 0,
    FirstSeenAt: '2025-02-14T12:00:00Z',
    LastSeenAt: '2026-06-22T16:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-sql-backup-1',
    Title: 'SQL Server backup jobs fail silently over weekends',
    Summary: 'Maintenance plans and SQL Agent jobs fail with cryptic errors (disk full, network timeouts, VSS issues) but notifications are unreliable. Teams discover on Monday that no valid backups exist for 48+ hours.',
    Category: 'SQL Server Administration',
    SeverityScore: 92,
    FrequencyScore: 60,
    WillingnessToPayScore: 88,
    MarketSizeScore: 72,
    TrendScore: 45,
    OpportunityScore: 0,
    FirstSeenAt: '2025-01-22T11:00:00Z',
    LastSeenAt: '2026-06-15T08:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-sql-license-1',
    Title: 'SQL Server licensing audit anxiety and confusion',
    Summary: 'Organizations cannot confidently determine if they are compliant with SQL Server licensing—mixing cores, CALs, SA benefits, and Azure Hybrid Benefit. Fear of audits leads to over-purchasing.',
    Category: 'SQL Server Administration',
    SeverityScore: 55,
    FrequencyScore: 58,
    WillingnessToPayScore: 72,
    MarketSizeScore: 82,
    TrendScore: 40,
    OpportunityScore: 0,
    FirstSeenAt: '2025-06-10T09:00:00Z',
    LastSeenAt: '2026-05-18T10:00:00Z',
    Status: 'monitoring',
  },
  {
    PainPointId: 'pp-m365-compliance-1',
    Title: 'M365 compliance reports are incomplete and unreliable',
    Summary: 'Compliance Manager scores fluctuate without explanation, audit logs have gaps, and generating evidence for SOC 2 or ISO 27001 from M365 requires hours of manual correlation across multiple admin centers.',
    Category: 'Microsoft 365 Reporting',
    SeverityScore: 76,
    FrequencyScore: 70,
    WillingnessToPayScore: 84,
    MarketSizeScore: 78,
    TrendScore: 72,
    OpportunityScore: 0,
    FirstSeenAt: '2025-04-02T10:00:00Z',
    LastSeenAt: '2026-06-27T13:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-m365-license-1',
    Title: 'M365 license waste from departed employees and unused features',
    Summary: 'Organizations pay for E5 licenses where E3 or even Business Basic would suffice. No easy way to audit actual feature usage per user and right-size subscriptions.',
    Category: 'Microsoft 365 Reporting',
    SeverityScore: 62,
    FrequencyScore: 80,
    WillingnessToPayScore: 89,
    MarketSizeScore: 88,
    TrendScore: 68,
    OpportunityScore: 0,
    FirstSeenAt: '2025-03-18T14:00:00Z',
    LastSeenAt: '2026-06-29T09:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-ad-stale-1',
    Title: 'Active Directory filled with stale accounts and security risks',
    Summary: 'Enterprises have thousands of disabled-but-not-deleted accounts, orphaned service accounts with admin rights, and no automated lifecycle management. Security audits flag this repeatedly.',
    Category: 'Active Directory Cleanup',
    SeverityScore: 78,
    FrequencyScore: 85,
    WillingnessToPayScore: 75,
    MarketSizeScore: 82,
    TrendScore: 55,
    OpportunityScore: 0,
    FirstSeenAt: '2025-01-30T08:00:00Z',
    LastSeenAt: '2026-06-20T11:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-ad-gpo-1',
    Title: 'Group Policy chaos from years of accumulated GPOs',
    Summary: 'Organizations have 200+ GPOs with conflicting settings, no documentation, and nobody who understands the full inheritance chain. Changes cause unpredictable user experience issues.',
    Category: 'Active Directory Cleanup',
    SeverityScore: 70,
    FrequencyScore: 62,
    WillingnessToPayScore: 68,
    MarketSizeScore: 72,
    TrendScore: 42,
    OpportunityScore: 0,
    FirstSeenAt: '2025-05-05T09:00:00Z',
    LastSeenAt: '2026-05-30T14:00:00Z',
    Status: 'monitoring',
  },
  {
    PainPointId: 'pp-ad-hybrid-1',
    Title: 'Hybrid identity sync failures between on-prem AD and Entra ID',
    Summary: 'Azure AD Connect (Entra Connect) sync errors create ghost accounts, duplicate objects, and authentication failures. Troubleshooting requires deep expertise in both on-prem AD and cloud identity.',
    Category: 'Active Directory Cleanup',
    SeverityScore: 84,
    FrequencyScore: 68,
    WillingnessToPayScore: 80,
    MarketSizeScore: 76,
    TrendScore: 72,
    OpportunityScore: 0,
    FirstSeenAt: '2025-02-28T10:00:00Z',
    LastSeenAt: '2026-06-26T15:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-intune-enroll-1',
    Title: 'Intune device enrollment failures with no clear error messages',
    Summary: 'Windows Autopilot and iOS/Android enrollment fails with generic error codes. IT staff spend hours cross-referencing Microsoft docs, event logs, and Intune diagnostic logs to identify root causes.',
    Category: 'Intune Device Management',
    SeverityScore: 75,
    FrequencyScore: 78,
    WillingnessToPayScore: 72,
    MarketSizeScore: 74,
    TrendScore: 80,
    OpportunityScore: 0,
    FirstSeenAt: '2025-04-15T11:00:00Z',
    LastSeenAt: '2026-06-30T10:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-intune-policy-1',
    Title: 'Intune policy conflicts create unpredictable device behavior',
    Summary: 'Overlapping configuration profiles, compliance policies, and conditional access rules conflict silently. Devices end up in non-compliant states with no clear indication of which policy won.',
    Category: 'Intune Device Management',
    SeverityScore: 72,
    FrequencyScore: 70,
    WillingnessToPayScore: 74,
    MarketSizeScore: 70,
    TrendScore: 75,
    OpportunityScore: 0,
    FirstSeenAt: '2025-05-10T09:00:00Z',
    LastSeenAt: '2026-06-28T12:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-intune-app-1',
    Title: 'Win32 app deployment through Intune is unreliable',
    Summary: 'Complex Win32 app packaging with IntuneWinAppUtil fails intermittently. Detection rules give false positives, install commands timeout, and there is no real-time deployment status visibility.',
    Category: 'Intune Device Management',
    SeverityScore: 66,
    FrequencyScore: 72,
    WillingnessToPayScore: 65,
    MarketSizeScore: 68,
    TrendScore: 70,
    OpportunityScore: 0,
    FirstSeenAt: '2025-06-01T08:00:00Z',
    LastSeenAt: '2026-06-25T09:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-ps-modules-1',
    Title: 'PowerShell module version conflicts break automation',
    Summary: 'Az module updates break existing scripts, different module versions coexist causing import failures, and the PSModulePath confusion across PowerShell 5.1 vs 7.x causes silent script failures.',
    Category: 'PowerShell Automation',
    SeverityScore: 64,
    FrequencyScore: 76,
    WillingnessToPayScore: 60,
    MarketSizeScore: 65,
    TrendScore: 55,
    OpportunityScore: 0,
    FirstSeenAt: '2025-03-25T10:00:00Z',
    LastSeenAt: '2026-06-18T14:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-ps-creds-1',
    Title: 'Secure credential management in PowerShell scripts is painful',
    Summary: 'Teams store credentials in plain text, use ConvertTo-SecureString with hardcoded keys, or rely on fragile DPAPI encryption tied to specific service accounts. No easy cross-platform secret management.',
    Category: 'PowerShell Automation',
    SeverityScore: 80,
    FrequencyScore: 74,
    WillingnessToPayScore: 70,
    MarketSizeScore: 68,
    TrendScore: 62,
    OpportunityScore: 0,
    FirstSeenAt: '2025-02-10T09:00:00Z',
    LastSeenAt: '2026-06-22T11:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-smb-qb-1',
    Title: 'QuickBooks integration with other tools is brittle and limited',
    Summary: 'Small businesses need QuickBooks data in CRMs, project management, and inventory tools but integrations break constantly, sync is delayed, and the API rate limits are punishing.',
    Category: 'Small Business Software',
    SeverityScore: 68,
    FrequencyScore: 82,
    WillingnessToPayScore: 76,
    MarketSizeScore: 90,
    TrendScore: 65,
    OpportunityScore: 0,
    FirstSeenAt: '2025-04-20T08:00:00Z',
    LastSeenAt: '2026-06-29T16:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-smb-crm-1',
    Title: 'No affordable CRM fits service-based small businesses',
    Summary: 'Salesforce is too complex and expensive, HubSpot free tier is limiting, and niche CRMs lack integrations. Service businesses need simple job tracking + invoicing + follow-up in one place.',
    Category: 'Small Business Software',
    SeverityScore: 58,
    FrequencyScore: 85,
    WillingnessToPayScore: 80,
    MarketSizeScore: 92,
    TrendScore: 72,
    OpportunityScore: 0,
    FirstSeenAt: '2025-05-12T10:00:00Z',
    LastSeenAt: '2026-06-30T08:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-support-routing-1',
    Title: 'Support ticket routing and prioritization is manual guesswork',
    Summary: 'Support teams manually triage tickets, frequently misroute them, and have no data-driven priority scoring. VIP customers wait in the same queue as free-tier users, causing churn.',
    Category: 'Customer Support Workflows',
    SeverityScore: 72,
    FrequencyScore: 78,
    WillingnessToPayScore: 82,
    MarketSizeScore: 85,
    TrendScore: 78,
    OpportunityScore: 0,
    FirstSeenAt: '2025-03-08T09:00:00Z',
    LastSeenAt: '2026-06-28T10:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-support-sla-1',
    Title: 'SLA tracking across multiple support channels is impossible',
    Summary: 'With tickets coming from email, chat, phone, and social, teams cannot accurately track response times or identify SLA breaches until it is too late. Reporting is fragmented.',
    Category: 'Customer Support Workflows',
    SeverityScore: 70,
    FrequencyScore: 68,
    WillingnessToPayScore: 78,
    MarketSizeScore: 80,
    TrendScore: 65,
    OpportunityScore: 0,
    FirstSeenAt: '2025-04-25T11:00:00Z',
    LastSeenAt: '2026-06-24T14:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-support-kb-1',
    Title: 'Knowledge base articles are outdated and unsearchable',
    Summary: 'Internal KB content becomes stale within months, search returns irrelevant results, and agents waste time hunting for answers that exist somewhere in Confluence or SharePoint but cannot be found.',
    Category: 'Customer Support Workflows',
    SeverityScore: 65,
    FrequencyScore: 80,
    WillingnessToPayScore: 70,
    MarketSizeScore: 78,
    TrendScore: 72,
    OpportunityScore: 0,
    FirstSeenAt: '2025-05-30T08:00:00Z',
    LastSeenAt: '2026-06-27T09:00:00Z',
    Status: 'active',
  },
  {
    PainPointId: 'pp-smb-inventory-1',
    Title: 'Small business inventory management across multiple channels',
    Summary: 'Businesses selling on Shopify, Amazon, and in-store have no affordable way to sync inventory in real time. Overselling and stockouts are constant problems causing customer complaints.',
    Category: 'Small Business Software',
    SeverityScore: 74,
    FrequencyScore: 78,
    WillingnessToPayScore: 84,
    MarketSizeScore: 88,
    TrendScore: 75,
    OpportunityScore: 0,
    FirstSeenAt: '2025-03-05T10:00:00Z',
    LastSeenAt: '2026-06-30T11:00:00Z',
    Status: 'active',
  },
];

// Calculate opportunity scores
painPoints.forEach((pp) => {
  pp.OpportunityScore = calculateOpportunityScore({
    FrequencyScore: pp.FrequencyScore,
    SeverityScore: pp.SeverityScore,
    WillingnessToPayScore: pp.WillingnessToPayScore,
    TrendScore: pp.TrendScore,
    MarketSizeScore: pp.MarketSizeScore,
  });
});

// ─── Clusters ──────────────────────────────────────────────────────────────────

const clusters: Cluster[] = [
  {
    ClusterId: 'cl-azure-finops',
    ClusterName: 'Azure FinOps & Cost Governance',
    Description: 'Pain points related to unexpected Azure spending, reserved instance management, and budget enforcement gaps.',
    Category: 'Cloud Cost Management',
    CreatedAt: '2025-06-01T10:00:00Z',
    PainPointIds: ['pp-azure-cost-1', 'pp-azure-cost-2', 'pp-azure-cost-3'],
  },
  {
    ClusterId: 'cl-sql-ops',
    ClusterName: 'SQL Server Operational Reliability',
    Description: 'Challenges around SQL Server performance monitoring, backup reliability, and licensing complexity.',
    Category: 'Database Operations',
    CreatedAt: '2025-06-01T10:00:00Z',
    PainPointIds: ['pp-sql-perf-1', 'pp-sql-backup-1', 'pp-sql-license-1'],
  },
  {
    ClusterId: 'cl-m365-governance',
    ClusterName: 'M365 License & Compliance Governance',
    Description: 'Issues with Microsoft 365 compliance reporting, license optimization, and feature usage analytics.',
    Category: 'SaaS Management',
    CreatedAt: '2025-06-15T08:00:00Z',
    PainPointIds: ['pp-m365-compliance-1', 'pp-m365-license-1'],
  },
  {
    ClusterId: 'cl-identity-lifecycle',
    ClusterName: 'Identity Lifecycle & Hygiene',
    Description: 'Problems spanning Active Directory cleanup, hybrid identity sync, and Group Policy management.',
    Category: 'Identity & Access',
    CreatedAt: '2025-06-15T08:00:00Z',
    PainPointIds: ['pp-ad-stale-1', 'pp-ad-gpo-1', 'pp-ad-hybrid-1'],
  },
  {
    ClusterId: 'cl-endpoint-mgmt',
    ClusterName: 'Modern Endpoint Management Friction',
    Description: 'Enrollment failures, policy conflicts, and app deployment challenges across Intune-managed devices.',
    Category: 'Endpoint Management',
    CreatedAt: '2025-07-01T10:00:00Z',
    PainPointIds: ['pp-intune-enroll-1', 'pp-intune-policy-1', 'pp-intune-app-1'],
  },
  {
    ClusterId: 'cl-smb-operations',
    ClusterName: 'Small Business Operations Stack',
    Description: 'Gaps in affordable, integrated tools for invoicing, CRM, inventory, and financial management for SMBs.',
    Category: 'Small Business',
    CreatedAt: '2025-07-10T09:00:00Z',
    PainPointIds: ['pp-smb-qb-1', 'pp-smb-crm-1', 'pp-smb-inventory-1'],
  },
  {
    ClusterId: 'cl-support-efficiency',
    ClusterName: 'Support Team Efficiency & SLA Compliance',
    Description: 'Ticket routing, SLA tracking, and knowledge base findability challenges faced by customer support organizations.',
    Category: 'Customer Support',
    CreatedAt: '2025-07-15T11:00:00Z',
    PainPointIds: ['pp-support-routing-1', 'pp-support-sla-1', 'pp-support-kb-1'],
  },
  {
    ClusterId: 'cl-automation-reliability',
    ClusterName: 'IT Automation Reliability',
    Description: 'PowerShell module conflicts, credential management, and cross-platform scripting challenges that undermine automation efforts.',
    Category: 'Automation',
    CreatedAt: '2025-07-20T08:00:00Z',
    PainPointIds: ['pp-ps-modules-1', 'pp-ps-creds-1'],
  },
];

// ─── Product Ideas ─────────────────────────────────────────────────────────────

const productIdeas: ProductIdea[] = [
  {
    ProductIdeaId: 'idea-azure-watchdog',
    PainPointId: 'pp-azure-cost-1',
    Name: 'CloudWatchdog – Real-Time Azure Cost Enforcer',
    Description: 'An agent that continuously monitors Azure resource usage, automatically shuts down or deallocates dev/test resources after hours, and sends Slack/Teams alerts before budgets are breached.',
    TargetCustomer: 'Mid-size companies (50-500 employees) with Azure subscriptions spending $10K-$200K/month on cloud infrastructure.',
    MVPFeatures: 'Resource idle detection; Scheduled auto-shutdown rules; Budget threshold alerts via Teams/Slack; Simple dashboard showing potential savings; Tag-based resource grouping',
    DifficultyScore: 45,
    RevenuePotentialScore: 88,
    ExistingAlternatives: 'Azure Cost Management (limited automation), Spot.io (expensive, enterprise-focused), CloudHealth (complex setup), custom scripts (fragile)',
    RecommendedFirstFeature: 'Idle resource detection with Teams notification – delivers immediate value with minimal infrastructure',
    CreatedAt: '2025-08-01T10:00:00Z',
  },
  {
    ProductIdeaId: 'idea-ri-optimizer',
    PainPointId: 'pp-azure-cost-2',
    Name: 'ReserveRight – RI Portfolio Optimizer',
    Description: 'AI-driven tool that analyzes historical usage patterns, simulates different RI commitment scenarios, and provides clear buy/hold/sell recommendations with projected savings.',
    TargetCustomer: 'Cloud finance teams and FinOps practitioners at companies spending $50K+ monthly on Azure compute.',
    MVPFeatures: 'Usage pattern analysis from past 12 months; RI commitment simulator; Savings projections with confidence intervals; Monthly rebalancing recommendations; Integration with Azure billing API',
    DifficultyScore: 62,
    RevenuePotentialScore: 82,
    ExistingAlternatives: 'Azure Advisor (basic, often stale), ProsperOps (AWS-focused), Zesty (limited Azure support)',
    RecommendedFirstFeature: 'Read-only usage analysis with savings opportunity report – builds trust before recommending purchases',
    CreatedAt: '2025-08-10T09:00:00Z',
  },
  {
    ProductIdeaId: 'idea-sql-guardian',
    PainPointId: 'pp-sql-perf-1',
    Name: 'QueryGuardian – SQL Plan Regression Detector',
    Description: 'Monitors query plan changes after updates, alerts on regressions, and suggests plan guide fixes. Integrates with maintenance windows to catch issues before production impact.',
    TargetCustomer: 'DBAs and data platform teams managing 5+ SQL Server instances in production environments.',
    MVPFeatures: 'Automatic plan baseline capture; Post-update plan comparison; Regression severity scoring; Plan guide generation; Email/Teams alerting',
    DifficultyScore: 70,
    RevenuePotentialScore: 72,
    ExistingAlternatives: 'SentryOne/SolarWinds DPA (expensive), Query Store (manual), sp_BlitzCache (no automation)',
    RecommendedFirstFeature: 'Plan change detection with severity scoring – captures value of awareness without requiring action automation',
    CreatedAt: '2025-08-15T11:00:00Z',
  },
  {
    ProductIdeaId: 'idea-backup-sentinel',
    PainPointId: 'pp-sql-backup-1',
    Name: 'BackupSentinel – Cross-Instance Backup Monitor',
    Description: 'Unified monitoring for SQL Server backup jobs across all instances with intelligent alerting, gap detection, and automated recovery testing.',
    TargetCustomer: 'IT teams managing SQL Server infrastructure without dedicated DBA staff (common in companies with 100-1000 employees).',
    MVPFeatures: 'Multi-instance backup status dashboard; Backup gap detection and alerting; RPO/RTO compliance tracking; Weekend/holiday escalation rules; Restore test scheduling',
    DifficultyScore: 50,
    RevenuePotentialScore: 68,
    ExistingAlternatives: 'Ola Hallengren scripts (no dashboard), SSMS built-in (single instance), Redgate SQL Backup (expensive)',
    RecommendedFirstFeature: 'Backup gap detection with escalating alerts – solves the "silent weekend failure" problem immediately',
    CreatedAt: '2025-09-01T10:00:00Z',
  },
  {
    ProductIdeaId: 'idea-m365-rightsizer',
    PainPointId: 'pp-m365-license-1',
    Name: 'LicenseIQ – M365 License Right-Sizing Engine',
    Description: 'Analyzes per-user feature usage across M365 services and recommends license downgrades, removals, and reassignments with projected annual savings.',
    TargetCustomer: 'IT managers and procurement teams at organizations with 200+ M365 seats paying $30K+/year.',
    MVPFeatures: 'Per-user feature usage heatmap; License tier recommendation engine; Savings calculator with annual projections; Departed employee license reclaim alerts; Bulk change CSV export',
    DifficultyScore: 55,
    RevenuePotentialScore: 90,
    ExistingAlternatives: 'CoreView (enterprise pricing), Zylo (broad SaaS focus), manual Graph API queries',
    RecommendedFirstFeature: 'License usage audit with savings report – demonstrates ROI before asking for change authority',
    CreatedAt: '2025-09-10T08:00:00Z',
  },
  {
    ProductIdeaId: 'idea-ad-janitor',
    PainPointId: 'pp-ad-stale-1',
    Name: 'ADjanitor – Automated Directory Lifecycle Manager',
    Description: 'Continuously identifies stale accounts, orphaned groups, and excessive privileges, then automates cleanup workflows with approval gates and rollback capability.',
    TargetCustomer: 'IT security and operations teams at enterprises with 1000+ AD objects struggling with identity hygiene.',
    MVPFeatures: 'Stale account identification (configurable thresholds); Risk scoring for orphaned service accounts; Cleanup workflow with manager approval; Audit trail and rollback; Scheduled hygiene reports',
    DifficultyScore: 58,
    RevenuePotentialScore: 75,
    ExistingAlternatives: 'Cayosoft (expensive), native AD cleanup scripts (risky), Quest (complex licensing)',
    RecommendedFirstFeature: 'Read-only stale account report with risk scoring – builds confidence before automating any deletions',
    CreatedAt: '2025-09-15T10:00:00Z',
  },
  {
    ProductIdeaId: 'idea-intune-debugger',
    PainPointId: 'pp-intune-enroll-1',
    Name: 'EnrollFix – Intune Enrollment Troubleshooter',
    Description: 'AI-powered diagnostic tool that correlates Intune logs, Autopilot events, and device state to provide plain-English explanations of enrollment failures with step-by-step fix instructions.',
    TargetCustomer: 'IT helpdesk and endpoint management teams deploying devices via Intune/Autopilot.',
    MVPFeatures: 'Log correlation engine; Plain-English error explanations; Step-by-step remediation guides; Common failure pattern library; Bulk diagnostic for fleet-wide issues',
    DifficultyScore: 65,
    RevenuePotentialScore: 70,
    ExistingAlternatives: 'Microsoft troubleshooter (basic), manual log analysis, community forums',
    RecommendedFirstFeature: 'Error code lookup with enriched explanations from community knowledge – instant value for helpdesk staff',
    CreatedAt: '2025-10-01T09:00:00Z',
  },
  {
    ProductIdeaId: 'idea-smb-hub',
    PainPointId: 'pp-smb-qb-1',
    Name: 'BizBridge – QuickBooks Integration Hub for SMBs',
    Description: 'Reliable, affordable middleware that syncs QuickBooks with popular SMB tools (CRMs, project management, inventory) with conflict resolution and automatic retry logic.',
    TargetCustomer: 'Small businesses (5-50 employees) using QuickBooks Online alongside 3+ other business tools.',
    MVPFeatures: 'Pre-built connectors for top 10 SMB tools; Bi-directional sync with conflict resolution; Automatic retry on failures; Simple mapping UI; Sync history and error dashboard',
    DifficultyScore: 55,
    RevenuePotentialScore: 78,
    ExistingAlternatives: 'Zapier (expensive at scale, unreliable for accounting), native integrations (limited), custom development (costly)',
    RecommendedFirstFeature: 'QuickBooks → CRM contact and invoice sync – highest demand connector with clear value proposition',
    CreatedAt: '2025-10-15T10:00:00Z',
  },
  {
    ProductIdeaId: 'idea-ticket-ai',
    PainPointId: 'pp-support-routing-1',
    Name: 'RouteGenius – AI Ticket Triage & Priority Scoring',
    Description: 'ML-powered ticket classification that auto-routes to the right team, scores priority based on customer value and issue severity, and predicts resolution time.',
    TargetCustomer: 'Support teams with 5+ agents handling 100+ tickets/day across multiple product areas.',
    MVPFeatures: 'Auto-categorization from ticket text; Customer tier-aware priority scoring; Team routing rules engine; Resolution time prediction; Integration with Zendesk/Freshdesk/Intercom',
    DifficultyScore: 60,
    RevenuePotentialScore: 85,
    ExistingAlternatives: 'Zendesk AI (expensive add-on), manual triage rules, basic keyword routing',
    RecommendedFirstFeature: 'Priority scoring based on customer value + issue keywords – reduces response time for high-value customers immediately',
    CreatedAt: '2025-10-20T11:00:00Z',
  },
  {
    ProductIdeaId: 'idea-inventory-sync',
    PainPointId: 'pp-smb-inventory-1',
    Name: 'StockSync Pro – Multi-Channel Inventory Hub',
    Description: 'Real-time inventory synchronization across Shopify, Amazon, eBay, and POS systems with low-stock alerts, demand forecasting, and oversell prevention.',
    TargetCustomer: 'Small retailers and e-commerce businesses selling on 2+ channels with 100-10,000 SKUs.',
    MVPFeatures: 'Real-time sync across Shopify + Amazon; Low stock alerts; Oversell prevention locks; Simple demand forecasting; Channel-specific pricing rules',
    DifficultyScore: 58,
    RevenuePotentialScore: 82,
    ExistingAlternatives: 'Cin7 (complex), Sellbrite (limited), TradeGecko/QuickBooks Commerce (discontinued/absorbed)',
    RecommendedFirstFeature: 'Shopify + Amazon bi-directional quantity sync – prevents the most painful overselling scenarios',
    CreatedAt: '2025-11-01T08:00:00Z',
  },
  {
    ProductIdeaId: 'idea-ps-vault',
    PainPointId: 'pp-ps-creds-1',
    Name: 'ScriptVault – PowerShell Secrets Manager',
    Description: 'Drop-in credential management for PowerShell scripts that works cross-platform, integrates with Azure Key Vault and HashiCorp Vault, and requires zero code changes beyond a one-line import.',
    TargetCustomer: 'IT automation engineers and DevOps teams running PowerShell scripts in production pipelines.',
    MVPFeatures: 'One-line import credential injection; Azure Key Vault backend; Local encrypted fallback for dev; Credential rotation tracking; Audit log of secret access',
    DifficultyScore: 48,
    RevenuePotentialScore: 62,
    ExistingAlternatives: 'SecretManagement module (complex setup), Azure Key Vault direct (requires code changes), CyberArk (enterprise pricing)',
    RecommendedFirstFeature: 'Local encrypted store with simple Get-ScriptVaultSecret cmdlet – immediate value without cloud dependency',
    CreatedAt: '2025-11-10T09:00:00Z',
  },
  {
    ProductIdeaId: 'idea-kb-refresh',
    PainPointId: 'pp-support-kb-1',
    Name: 'KBkeeper – AI Knowledge Base Maintenance Engine',
    Description: 'Automatically identifies stale KB articles, suggests updates based on recent tickets, and provides semantic search that understands intent rather than just keywords.',
    TargetCustomer: 'Support team leads and knowledge managers maintaining 500+ articles across Confluence, SharePoint, or Zendesk Guide.',
    MVPFeatures: 'Staleness scoring based on age and ticket references; AI-suggested article updates from recent tickets; Semantic search API; Gap analysis (common questions with no article); Usage analytics',
    DifficultyScore: 55,
    RevenuePotentialScore: 72,
    ExistingAlternatives: 'Guru (expensive), Confluence search (poor), manual review cycles',
    RecommendedFirstFeature: 'Staleness report with ticket-correlation showing which articles need updates – creates urgency and demonstrates value',
    CreatedAt: '2025-11-15T10:00:00Z',
  },
];

// ─── Trend Snapshots ───────────────────────────────────────────────────────────

const trendSnapshots: TrendSnapshot[] = [
  // pp-azure-cost-1 trends (growing)
  { SnapshotId: 'ts-ac1-2025-12', PainPointId: 'pp-azure-cost-1', SnapshotDate: '2025-12-01', MentionCount: 34, AverageSeverity: 72, OpportunityScore: 74 },
  { SnapshotId: 'ts-ac1-2026-01', PainPointId: 'pp-azure-cost-1', SnapshotDate: '2026-01-01', MentionCount: 41, AverageSeverity: 75, OpportunityScore: 77 },
  { SnapshotId: 'ts-ac1-2026-02', PainPointId: 'pp-azure-cost-1', SnapshotDate: '2026-02-01', MentionCount: 48, AverageSeverity: 78, OpportunityScore: 80 },
  { SnapshotId: 'ts-ac1-2026-03', PainPointId: 'pp-azure-cost-1', SnapshotDate: '2026-03-01', MentionCount: 53, AverageSeverity: 80, OpportunityScore: 82 },
  { SnapshotId: 'ts-ac1-2026-04', PainPointId: 'pp-azure-cost-1', SnapshotDate: '2026-04-01', MentionCount: 58, AverageSeverity: 82, OpportunityScore: 85 },
  { SnapshotId: 'ts-ac1-2026-05', PainPointId: 'pp-azure-cost-1', SnapshotDate: '2026-05-01', MentionCount: 62, AverageSeverity: 82, OpportunityScore: 86 },
  { SnapshotId: 'ts-ac1-2026-06', PainPointId: 'pp-azure-cost-1', SnapshotDate: '2026-06-01', MentionCount: 67, AverageSeverity: 84, OpportunityScore: 87 },

  // pp-m365-license-1 trends (growing)
  { SnapshotId: 'ts-ml1-2025-12', PainPointId: 'pp-m365-license-1', SnapshotDate: '2025-12-01', MentionCount: 28, AverageSeverity: 58, OpportunityScore: 72 },
  { SnapshotId: 'ts-ml1-2026-01', PainPointId: 'pp-m365-license-1', SnapshotDate: '2026-01-01', MentionCount: 32, AverageSeverity: 60, OpportunityScore: 74 },
  { SnapshotId: 'ts-ml1-2026-02', PainPointId: 'pp-m365-license-1', SnapshotDate: '2026-02-01', MentionCount: 38, AverageSeverity: 61, OpportunityScore: 76 },
  { SnapshotId: 'ts-ml1-2026-03', PainPointId: 'pp-m365-license-1', SnapshotDate: '2026-03-01', MentionCount: 42, AverageSeverity: 62, OpportunityScore: 78 },
  { SnapshotId: 'ts-ml1-2026-04', PainPointId: 'pp-m365-license-1', SnapshotDate: '2026-04-01', MentionCount: 45, AverageSeverity: 62, OpportunityScore: 79 },
  { SnapshotId: 'ts-ml1-2026-05', PainPointId: 'pp-m365-license-1', SnapshotDate: '2026-05-01', MentionCount: 50, AverageSeverity: 63, OpportunityScore: 80 },
  { SnapshotId: 'ts-ml1-2026-06', PainPointId: 'pp-m365-license-1', SnapshotDate: '2026-06-01', MentionCount: 55, AverageSeverity: 64, OpportunityScore: 81 },

  // pp-intune-enroll-1 trends (growing fast)
  { SnapshotId: 'ts-ie1-2025-12', PainPointId: 'pp-intune-enroll-1', SnapshotDate: '2025-12-01', MentionCount: 18, AverageSeverity: 65, OpportunityScore: 68 },
  { SnapshotId: 'ts-ie1-2026-01', PainPointId: 'pp-intune-enroll-1', SnapshotDate: '2026-01-01', MentionCount: 24, AverageSeverity: 68, OpportunityScore: 70 },
  { SnapshotId: 'ts-ie1-2026-02', PainPointId: 'pp-intune-enroll-1', SnapshotDate: '2026-02-01', MentionCount: 31, AverageSeverity: 70, OpportunityScore: 72 },
  { SnapshotId: 'ts-ie1-2026-03', PainPointId: 'pp-intune-enroll-1', SnapshotDate: '2026-03-01', MentionCount: 38, AverageSeverity: 72, OpportunityScore: 74 },
  { SnapshotId: 'ts-ie1-2026-04', PainPointId: 'pp-intune-enroll-1', SnapshotDate: '2026-04-01', MentionCount: 44, AverageSeverity: 74, OpportunityScore: 75 },
  { SnapshotId: 'ts-ie1-2026-05', PainPointId: 'pp-intune-enroll-1', SnapshotDate: '2026-05-01', MentionCount: 50, AverageSeverity: 75, OpportunityScore: 76 },
  { SnapshotId: 'ts-ie1-2026-06', PainPointId: 'pp-intune-enroll-1', SnapshotDate: '2026-06-01', MentionCount: 55, AverageSeverity: 76, OpportunityScore: 77 },

  // pp-support-routing-1 trends (growing)
  { SnapshotId: 'ts-sr1-2025-12', PainPointId: 'pp-support-routing-1', SnapshotDate: '2025-12-01', MentionCount: 22, AverageSeverity: 66, OpportunityScore: 72 },
  { SnapshotId: 'ts-sr1-2026-01', PainPointId: 'pp-support-routing-1', SnapshotDate: '2026-01-01', MentionCount: 26, AverageSeverity: 68, OpportunityScore: 74 },
  { SnapshotId: 'ts-sr1-2026-02', PainPointId: 'pp-support-routing-1', SnapshotDate: '2026-02-01', MentionCount: 30, AverageSeverity: 70, OpportunityScore: 76 },
  { SnapshotId: 'ts-sr1-2026-03', PainPointId: 'pp-support-routing-1', SnapshotDate: '2026-03-01', MentionCount: 35, AverageSeverity: 71, OpportunityScore: 77 },
  { SnapshotId: 'ts-sr1-2026-04', PainPointId: 'pp-support-routing-1', SnapshotDate: '2026-04-01', MentionCount: 38, AverageSeverity: 72, OpportunityScore: 78 },
  { SnapshotId: 'ts-sr1-2026-05', PainPointId: 'pp-support-routing-1', SnapshotDate: '2026-05-01', MentionCount: 42, AverageSeverity: 72, OpportunityScore: 79 },
  { SnapshotId: 'ts-sr1-2026-06', PainPointId: 'pp-support-routing-1', SnapshotDate: '2026-06-01', MentionCount: 46, AverageSeverity: 73, OpportunityScore: 80 },

  // pp-sql-perf-1 trends (stable)
  { SnapshotId: 'ts-sp1-2025-12', PainPointId: 'pp-sql-perf-1', SnapshotDate: '2025-12-01', MentionCount: 20, AverageSeverity: 85, OpportunityScore: 74 },
  { SnapshotId: 'ts-sp1-2026-01', PainPointId: 'pp-sql-perf-1', SnapshotDate: '2026-01-01', MentionCount: 22, AverageSeverity: 86, OpportunityScore: 74 },
  { SnapshotId: 'ts-sp1-2026-02', PainPointId: 'pp-sql-perf-1', SnapshotDate: '2026-02-01', MentionCount: 19, AverageSeverity: 88, OpportunityScore: 75 },
  { SnapshotId: 'ts-sp1-2026-03', PainPointId: 'pp-sql-perf-1', SnapshotDate: '2026-03-01', MentionCount: 21, AverageSeverity: 87, OpportunityScore: 74 },
  { SnapshotId: 'ts-sp1-2026-04', PainPointId: 'pp-sql-perf-1', SnapshotDate: '2026-04-01', MentionCount: 23, AverageSeverity: 89, OpportunityScore: 75 },
  { SnapshotId: 'ts-sp1-2026-05', PainPointId: 'pp-sql-perf-1', SnapshotDate: '2026-05-01', MentionCount: 20, AverageSeverity: 88, OpportunityScore: 75 },
  { SnapshotId: 'ts-sp1-2026-06', PainPointId: 'pp-sql-perf-1', SnapshotDate: '2026-06-01', MentionCount: 22, AverageSeverity: 89, OpportunityScore: 75 },

  // pp-smb-inventory-1 trends (growing)
  { SnapshotId: 'ts-si1-2025-12', PainPointId: 'pp-smb-inventory-1', SnapshotDate: '2025-12-01', MentionCount: 30, AverageSeverity: 68, OpportunityScore: 74 },
  { SnapshotId: 'ts-si1-2026-01', PainPointId: 'pp-smb-inventory-1', SnapshotDate: '2026-01-01', MentionCount: 35, AverageSeverity: 70, OpportunityScore: 76 },
  { SnapshotId: 'ts-si1-2026-02', PainPointId: 'pp-smb-inventory-1', SnapshotDate: '2026-02-01', MentionCount: 38, AverageSeverity: 72, OpportunityScore: 78 },
  { SnapshotId: 'ts-si1-2026-03', PainPointId: 'pp-smb-inventory-1', SnapshotDate: '2026-03-01', MentionCount: 42, AverageSeverity: 73, OpportunityScore: 79 },
  { SnapshotId: 'ts-si1-2026-04', PainPointId: 'pp-smb-inventory-1', SnapshotDate: '2026-04-01', MentionCount: 45, AverageSeverity: 74, OpportunityScore: 80 },
  { SnapshotId: 'ts-si1-2026-05', PainPointId: 'pp-smb-inventory-1', SnapshotDate: '2026-05-01', MentionCount: 48, AverageSeverity: 74, OpportunityScore: 80 },
  { SnapshotId: 'ts-si1-2026-06', PainPointId: 'pp-smb-inventory-1', SnapshotDate: '2026-06-01', MentionCount: 52, AverageSeverity: 75, OpportunityScore: 81 },
];

// ─── Mentions ──────────────────────────────────────────────────────────────────

const mentions: PainPointMention[] = [
  { MentionId: 'mention-1', PainPointId: 'pp-azure-cost-1', RawPostId: 'raw-1', ExtractedText: 'We left a dev AKS cluster running over the 4th of July weekend. $4,200 bill for 3 days of zero traffic. Azure cost alerts didn\'t fire until Tuesday.', SentimentScore: -0.85, SeverityScore: 88, CreatedAt: '2026-06-28T10:00:00Z' },
  { MentionId: 'mention-2', PainPointId: 'pp-azure-cost-1', RawPostId: 'raw-2', ExtractedText: 'Our monthly Azure bill jumped from $18K to $31K because someone spun up GPU VMs for a POC and forgot about them. No automated cleanup.', SentimentScore: -0.92, SeverityScore: 90, CreatedAt: '2026-06-15T14:00:00Z' },
  { MentionId: 'mention-3', PainPointId: 'pp-azure-cost-1', RawPostId: 'raw-3', ExtractedText: 'I\'ve been burned three times this quarter by forgotten resources. Azure Budget alerts have a 24h delay which makes them useless for burst spending.', SentimentScore: -0.78, SeverityScore: 75, CreatedAt: '2026-05-20T09:00:00Z' },
  { MentionId: 'mention-4', PainPointId: 'pp-sql-perf-1', RawPostId: 'raw-4', ExtractedText: 'After CU14, our main reporting query went from 3 seconds to 2 minutes. Spent the entire day identifying that a parallel plan was now serial. No warning anywhere.', SentimentScore: -0.88, SeverityScore: 92, CreatedAt: '2026-06-10T16:00:00Z' },
  { MentionId: 'mention-5', PainPointId: 'pp-sql-perf-1', RawPostId: 'raw-5', ExtractedText: 'Statistics auto-update during business hours caused a plan change on our OLTP workload. Response times went from 50ms to 800ms for 20 minutes before anyone noticed.', SentimentScore: -0.82, SeverityScore: 85, CreatedAt: '2026-05-28T11:00:00Z' },
  { MentionId: 'mention-6', PainPointId: 'pp-sql-backup-1', RawPostId: 'raw-6', ExtractedText: 'Came in Monday to discover our SQL backup jobs silently failed Friday night. VSS writer timeout. No notification reached our on-call. 60 hours with no valid backup.', SentimentScore: -0.95, SeverityScore: 95, CreatedAt: '2026-06-02T08:00:00Z' },
  { MentionId: 'mention-7', PainPointId: 'pp-m365-license-1', RawPostId: 'raw-7', ExtractedText: 'Audited our M365 licenses last week. Found 140 E5 users who only use Outlook and Teams. That\'s $840K/year we could save by downgrading to E3.', SentimentScore: -0.65, SeverityScore: 60, CreatedAt: '2026-06-20T13:00:00Z' },
  { MentionId: 'mention-8', PainPointId: 'pp-m365-license-1', RawPostId: 'raw-8', ExtractedText: 'We have 200+ licenses assigned to mailboxes of people who left the company 6+ months ago. HR offboarding doesn\'t talk to IT licensing at all.', SentimentScore: -0.72, SeverityScore: 65, CreatedAt: '2026-06-12T10:00:00Z' },
  { MentionId: 'mention-9', PainPointId: 'pp-ad-stale-1', RawPostId: 'raw-9', ExtractedText: 'Security audit flagged 3,400 accounts that haven\'t logged in for 180+ days. 200 of those still have Domain Admin or equivalent privileges. Nobody owns the cleanup.', SentimentScore: -0.88, SeverityScore: 85, CreatedAt: '2026-05-15T09:00:00Z' },
  { MentionId: 'mention-10', PainPointId: 'pp-intune-enroll-1', RawPostId: 'raw-10', ExtractedText: 'Autopilot enrollment fails with 0x800705b4 for 30% of our new Dell laptops. Microsoft support says "reset and try again." Third time this month.', SentimentScore: -0.80, SeverityScore: 78, CreatedAt: '2026-06-25T11:00:00Z' },
  { MentionId: 'mention-11', PainPointId: 'pp-intune-enroll-1', RawPostId: 'raw-11', ExtractedText: 'iOS enrollment fails silently after MDM profile installation. Users see "Enrollment complete" but the device never appears in Intune. Only happens on iOS 18.2+.', SentimentScore: -0.75, SeverityScore: 72, CreatedAt: '2026-06-18T14:00:00Z' },
  { MentionId: 'mention-12', PainPointId: 'pp-support-routing-1', RawPostId: 'raw-12', ExtractedText: 'Our enterprise customer waited 6 hours for a P1 response because the ticket got routed to the wrong team. They\'re now evaluating competitors. Manual triage is killing us.', SentimentScore: -0.90, SeverityScore: 88, CreatedAt: '2026-06-22T15:00:00Z' },
  { MentionId: 'mention-13', PainPointId: 'pp-smb-inventory-1', RawPostId: 'raw-13', ExtractedText: 'Sold the same item on Amazon and Shopify simultaneously because inventory didn\'t sync for 45 minutes. Customer got a cancellation email. One star review incoming.', SentimentScore: -0.82, SeverityScore: 76, CreatedAt: '2026-06-28T09:00:00Z' },
  { MentionId: 'mention-14', PainPointId: 'pp-ps-creds-1', RawPostId: 'raw-14', ExtractedText: 'Found 14 production scripts with plaintext passwords in our automation repo. "We\'ll fix it later" from 2022. ConvertTo-SecureString with a shared key is barely better.', SentimentScore: -0.85, SeverityScore: 82, CreatedAt: '2026-06-05T10:00:00Z' },
  { MentionId: 'mention-15', PainPointId: 'pp-smb-crm-1', RawPostId: 'raw-15', ExtractedText: 'Tried HubSpot, Salesforce Essentials, Monday CRM, and Pipedrive. None of them handle our service-based workflow: estimate → job scheduling → time tracking → invoice. Always missing one piece.', SentimentScore: -0.70, SeverityScore: 62, CreatedAt: '2026-06-14T08:00:00Z' },
  { MentionId: 'mention-16', PainPointId: 'pp-ad-hybrid-1', RawPostId: 'raw-16', ExtractedText: 'Entra Connect sync failed silently for 3 days. Users couldn\'t reset passwords, new hires had no cloud accounts. Error was buried in event log ID 6941 with no actionable message.', SentimentScore: -0.88, SeverityScore: 86, CreatedAt: '2026-06-08T09:00:00Z' },
  { MentionId: 'mention-17', PainPointId: 'pp-intune-policy-1', RawPostId: 'raw-17', ExtractedText: 'Two compliance policies conflicting means devices show "Not compliant" but pass all individual checks. Conditional access blocks them anyway. Spent 4 hours on a single laptop.', SentimentScore: -0.78, SeverityScore: 70, CreatedAt: '2026-06-19T13:00:00Z' },
  { MentionId: 'mention-18', PainPointId: 'pp-support-kb-1', RawPostId: 'raw-18', ExtractedText: 'Our agents spend 8-12 minutes per ticket searching for answers that exist in Confluence. The search is so bad they\'ve resorted to a shared bookmarks spreadsheet.', SentimentScore: -0.72, SeverityScore: 68, CreatedAt: '2026-06-24T10:00:00Z' },
];

// ─── Pain Point Details ────────────────────────────────────────────────────────

const painPointDetails: Record<string, Omit<PainPointDetail, 'painPoint'>> = {
  'pp-azure-cost-1': {
    aiExplanation: 'This is one of the most financially impactful pain points in the Azure ecosystem. The root cause is a combination of Azure\'s pay-as-you-go model, the ease of provisioning resources, and the significant delay (24-48 hours) in cost reporting. Teams operating in fast-moving dev environments create resources for POCs, demos, and testing without established cleanup procedures. The problem is amplified during weekends, holidays, and sprint transitions when resources are forgotten. Organizations report 30-60% budget overruns attributed to this single issue.',
    sourceExamples: [
      'r/azure: "We left a dev AKS cluster running over the 4th of July weekend. $4,200 bill for 3 days of zero traffic."',
      'r/sysadmin: "Our monthly Azure bill jumped from $18K to $31K because someone spun up GPU VMs for a POC and forgot about them."',
      'GitHub Issue: "Azure Budget alerts have a 24h delay which makes them useless for burst spending scenarios."',
      'Spiceworks: "Third time this quarter a dev left expensive resources running. We need auto-shutdown but the native solution is too rigid."',
    ],
    similarComplaints: [
      'AWS users report similar issues with EC2 instances left running',
      'GCP users mention similar budget alert delays',
      'Organizations with shared subscriptions have the worst variance',
      'Startups in growth phase are most vulnerable due to lack of FinOps processes',
    ],
    suggestedProductIdeas: productIdeas.filter((i) => i.PainPointId === 'pp-azure-cost-1'),
    targetCustomers: [
      'Mid-size companies (50-500 employees) with Azure spend of $10K-$200K/month',
      'Startups with rapid cloud growth but no dedicated FinOps team',
      'Consulting firms managing multiple client Azure subscriptions',
      'Enterprise dev teams with autonomous subscription access',
    ],
    monetizationIdeas: [
      'SaaS subscription: $199-$999/month based on Azure spend under management',
      'Percentage-of-savings model: 10-20% of documented cost reduction',
      'Freemium: Free alerts for one subscription, paid for multi-sub and automation',
      'Channel: Partner with Azure MSPs for white-label offering',
    ],
    competitiveNotes: [
      'Azure Cost Management: Free but limited automation, alerts are delayed 24h+',
      'Spot.io by NetApp: Strong but enterprise-focused, expensive, poor UX for mid-market',
      'CloudHealth by VMware: Complex setup, designed for multi-cloud enterprise',
      'Custom scripts + Azure Automation: Fragile, no dashboard, hard to maintain',
    ],
    recommendedNextSteps: [
      'Validate with 10 Azure admins from r/sysadmin that real-time alerting is the #1 desired feature',
      'Build a proof-of-concept using Azure Resource Graph + Logic Apps for idle detection',
      'Design a simple Slack/Teams notification flow that shows resource name, cost rate, and one-click shutdown',
      'Price-test at $199/mo for single subscription to validate willingness to pay',
      'Partner with one MSP for pilot testing across their client base',
    ],
  },
  'pp-sql-perf-1': {
    aiExplanation: 'Query plan regressions after SQL Server cumulative updates represent a critical operational risk. When SQL Server updates statistics or applies a CU, the query optimizer may generate new execution plans that perform significantly worse than previous ones. DBAs often lack automated tools to detect these regressions before they impact users, and the manual process of identifying plan changes across hundreds of queries is time-prohibitive.',
    sourceExamples: [
      'r/SQLServer: "After CU14, our main reporting query went from 3 seconds to 2 minutes. Spent entire day identifying serial plan."',
      'r/sysadmin: "Statistics auto-update caused plan change on OLTP workload. 50ms to 800ms for 20 minutes."',
      'DBA StackExchange: "We now delay CU installations by 2 months because of plan regression fear. This is not a security best practice."',
    ],
    similarComplaints: [
      'Oracle users report similar plan instability after optimizer stats refresh',
      'PostgreSQL users face pg_stat_statements gaps after major version upgrades',
      'This is particularly acute in data warehouse / reporting workloads',
    ],
    suggestedProductIdeas: productIdeas.filter((i) => i.PainPointId === 'pp-sql-perf-1'),
    targetCustomers: [
      'DBAs managing 5+ SQL Server production instances',
      'Companies without dedicated DBA staff relying on sysadmins',
      'Healthcare, finance, and manufacturing with critical SQL workloads',
    ],
    monetizationIdeas: [
      'Per-instance pricing: $49-$149/month per monitored SQL Server instance',
      'Bundle with backup monitoring for a complete SQL operations platform',
      'Freemium: Free plan change alerts for 1 instance, paid for automation and multi-instance',
    ],
    competitiveNotes: [
      'SentryOne/SolarWinds DPA: Comprehensive but expensive ($2K+ per instance/year)',
      'Query Store: Built-in but requires manual monitoring and action',
      'sp_BlitzCache: Free but no automation or continuous monitoring',
    ],
    recommendedNextSteps: [
      'Interview 5 DBAs about their post-CU validation process',
      'Build baseline capture script using Query Store DMVs',
      'Design alerting threshold logic for plan regression severity',
      'Create a simple before/after comparison dashboard',
    ],
  },
  'pp-m365-license-1': {
    aiExplanation: 'Microsoft 365 license waste is a pervasive problem affecting nearly every organization with 100+ seats. The core issue is that M365 licensing is feature-bundled (E3, E5, Business Premium) but organizations lack visibility into which features each user actually consumes. Combined with poor offboarding processes that leave licenses assigned to departed employees, organizations routinely overspend 20-40% on M365 licensing.',
    sourceExamples: [
      'r/sysadmin: "Audited M365 licenses last week. Found 140 E5 users who only use Outlook and Teams. $840K/year savings potential."',
      'r/MSP: "We have 200+ licenses assigned to mailboxes of people who left 6+ months ago. HR offboarding doesn\'t talk to IT licensing."',
      'Spiceworks: "CFO asked me to justify our M365 spend. I have zero visibility into feature adoption per user tier."',
    ],
    similarComplaints: [
      'Google Workspace admins report similar issues with unused Enterprise licenses',
      'Slack Enterprise Grid customers struggle with seat utilization visibility',
      'Zoom license waste is a top complaint in SaaS management forums',
    ],
    suggestedProductIdeas: productIdeas.filter((i) => i.PainPointId === 'pp-m365-license-1'),
    targetCustomers: [
      'IT managers at organizations with 200+ M365 seats',
      'Procurement teams responsible for SaaS renewals',
      'MSPs managing M365 for multiple clients',
      'CFOs asking for SaaS spend optimization',
    ],
    monetizationIdeas: [
      'Percentage of savings: 15-25% of first year documented savings',
      'SaaS subscription: $3-$5 per managed user per month',
      'One-time audit + ongoing monitoring tiers',
      'MSP partner program with volume discounts',
    ],
    competitiveNotes: [
      'CoreView: Enterprise pricing ($5+ per user), good but overkill for mid-market',
      'Zylo: Broad SaaS management, not M365-deep, expensive',
      'Manual Graph API queries: Possible but requires significant PowerShell expertise',
      'Microsoft Admin Center: Shows assigned licenses but not feature-level usage',
    ],
    recommendedNextSteps: [
      'Build a Graph API integration that pulls per-service usage data',
      'Create a clear savings-per-user recommendation engine',
      'Design a CFO-friendly summary showing annual waste and fix cost',
      'Test pricing with 5 MSPs managing multi-tenant environments',
    ],
  },
};

// ─── Exported Functions ────────────────────────────────────────────────────────

export function getMockPainPoints(): PainPoint[] {
  return painPoints;
}

export function getMockSources(): Source[] {
  return sources;
}

export function getMockClusters(): Cluster[] {
  return clusters;
}

export function getMockProductIdeas(): ProductIdea[] {
  return productIdeas;
}

export function getMockTrendSnapshots(): TrendSnapshot[] {
  return trendSnapshots;
}

export function getMockDashboardStats(): DashboardStats {
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  const newThisWeek = painPoints.filter(
    (pp) => new Date(pp.FirstSeenAt) >= thisWeekStart
  ).length;

  const topTrending = [...painPoints]
    .sort((a, b) => b.TrendScore - a.TrendScore)[0]?.Title ?? '';

  const highestWTP = Math.max(...painPoints.map((pp) => pp.WillingnessToPayScore));

  return {
    TotalProblems: painPoints.length,
    NewThisWeek: newThisWeek || 3,
    TopTrending: topTrending,
    HighestWTP: highestWTP,
    ClusterCount: clusters.length,
    EmergingAlerts: 4,
  };
}

export function getMockPainPointById(id: string): PainPoint | undefined {
  return painPoints.find((pp) => pp.PainPointId === id);
}

export function getMockMentionsForPainPoint(id: string): PainPointMention[] {
  return mentions.filter((m) => m.PainPointId === id);
}

export function getMockIdeasForPainPoint(id: string): ProductIdea[] {
  return productIdeas.filter((i) => i.PainPointId === id);
}

export function getMockPainPointDetail(id: string): PainPointDetail | undefined {
  const painPoint = getMockPainPointById(id);
  if (!painPoint) return undefined;

  const detail = painPointDetails[id];
  if (detail) {
    return { painPoint, ...detail };
  }

  return {
    painPoint,
    aiExplanation: `${painPoint.Title} is a significant pain point affecting organizations in the ${painPoint.Category} space. With an opportunity score of ${painPoint.OpportunityScore}/100, this represents a strong product opportunity given the combination of frequency, severity, and willingness to pay observed across multiple community sources.`,
    sourceExamples: getMockMentionsForPainPoint(id).map((m) => m.ExtractedText),
    similarComplaints: [
      'Multiple forums report similar frustrations',
      'Related issues appear in vendor support channels',
      'Community workarounds are fragile and poorly maintained',
    ],
    suggestedProductIdeas: getMockIdeasForPainPoint(id),
    targetCustomers: [
      'IT teams at mid-size organizations (100-2000 employees)',
      'MSPs and consultants managing multiple client environments',
      'Teams without dedicated specialist staff for this domain',
    ],
    monetizationIdeas: [
      'SaaS subscription model ($99-$499/month depending on scale)',
      'Usage-based pricing aligned with value delivered',
      'Freemium tier to drive adoption and prove value',
    ],
    competitiveNotes: [
      'Existing solutions are either too expensive or too limited',
      'Most competitors target enterprise, leaving mid-market underserved',
      'Community scripts and manual processes are the primary alternative',
    ],
    recommendedNextSteps: [
      'Validate pain intensity with 5-10 target customer interviews',
      'Build minimal viable solution addressing the core workflow',
      'Test pricing with early adopters from community forums',
      'Document ROI clearly for buyer justification',
    ],
  };
}
