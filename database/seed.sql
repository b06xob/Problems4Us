-- Problems4Us Seed Data
-- Realistic mock data for MVP demo

-- ============================================================
-- SOURCES
-- ============================================================
INSERT INTO Sources (SourceId, SourceType, SourceName, SourceUrl, IsActive) VALUES
('src-reddit-sysadmin',   'reddit',  'r/sysadmin',             'https://reddit.com/r/sysadmin',                   1),
('src-reddit-azure',      'reddit',  'r/azure',                'https://reddit.com/r/azure',                      1),
('src-reddit-smb',        'reddit',  'r/smallbusiness',        'https://reddit.com/r/smallbusiness',               1),
('src-reddit-powershell', 'reddit',  'r/PowerShell',           'https://reddit.com/r/PowerShell',                  1),
('src-github-azure-cli',  'github',  'azure/azure-cli Issues', 'https://github.com/azure/azure-cli/issues',        1),
('src-github-docs',       'github',  'MicrosoftDocs Issues',   'https://github.com/MicrosoftDocs/azure-docs/issues',0),
('src-forum-spiceworks',  'forum',   'Spiceworks Community',   'https://community.spiceworks.com',                 1),
('src-forum-techcomm',    'forum',   'TechCommunity Forums',   'https://techcommunity.microsoft.com',              1);

-- ============================================================
-- PAIN POINTS
-- ============================================================
INSERT INTO PainPoints (PainPointId, Title, Summary, Category, SeverityScore, FrequencyScore, WillingnessToPayScore, MarketSizeScore, TrendScore, OpportunityScore, FirstSeenAt, LastSeenAt, Status) VALUES
('pp-1',  'Azure Reserved Instance Cost Surprises',       'Organizations purchasing Azure Reserved Instances are frequently surprised by unexpected charges when workloads change or instances are misconfigured, leading to wasted spend of 20-40% of cloud budgets.', 'Cloud Infrastructure', 85, 78, 92, 80, 82, 84, '2025-03-15', '2026-07-01', 'active'),
('pp-2',  'Azure Cost Alert Fatigue',                     'Teams receive hundreds of Azure cost alerts daily, most irrelevant, causing alert fatigue and missed genuine cost anomalies that can cost thousands.', 'Cloud Infrastructure', 72, 65, 78, 75, 70, 72, '2025-05-20', '2026-06-28', 'active'),
('pp-3',  'Multi-Subscription Azure Billing Confusion',   'Organizations with multiple Azure subscriptions struggle to attribute costs correctly across departments, making chargeback nearly impossible.', 'Cloud Infrastructure', 68, 58, 85, 70, 65, 71, '2025-06-10', '2026-06-25', 'active'),
('pp-4',  'SQL Server Query Performance Degradation',     'DBAs spend excessive time troubleshooting sudden query performance drops with inadequate built-in tools, leading to hours of downtime per incident.', 'Database Admin', 88, 82, 75, 65, 60, 78, '2025-01-20', '2026-07-02', 'active'),
('pp-5',  'SQL Server Backup Verification Failures',      'Backup jobs report success but restores fail during disaster recovery, discovered only during emergencies when it is too late.', 'Database Admin', 92, 55, 70, 60, 45, 68, '2025-04-08', '2026-06-15', 'active'),
('pp-6',  'SQL Server Licensing Cost Confusion',          'The SQL Server licensing model is so complex that organizations routinely overpay by 30-50% or run out of compliance unknowingly.', 'Database Admin', 65, 70, 82, 72, 55, 72, '2025-02-14', '2026-06-20', 'active'),
('pp-7',  'Microsoft 365 License Waste',                  'Companies are paying for unused M365 licenses with no easy way to identify and reclaim them, wasting an average of $15-25 per unused seat per month.', 'Identity & Access', 75, 85, 88, 85, 72, 82, '2025-01-05', '2026-07-01', 'active'),
('pp-8',  'M365 Compliance Reporting Gaps',               'Built-in M365 compliance reports miss critical audit requirements, forcing manual data compilation that takes days per report.', 'Identity & Access', 70, 60, 72, 68, 58, 67, '2025-07-22', '2026-06-18', 'monitoring'),
('pp-9',  'M365 Usage Analytics Inaccuracy',              'Microsoft 365 usage reports contain stale data and gaps, making it impossible to make informed decisions about license allocation.', 'Identity & Access', 58, 52, 65, 70, 48, 60, '2025-08-10', '2026-05-30', 'monitoring'),
('pp-10', 'Active Directory Stale Account Accumulation',  'Organizations accumulate thousands of stale AD accounts over years, creating security vulnerabilities and compliance risks that are tedious to clean manually.', 'Identity & Access', 78, 88, 70, 80, 62, 75, '2025-02-28', '2026-07-02', 'active'),
('pp-11', 'Group Policy Conflict Chaos',                  'Overlapping and conflicting Group Policies cause unpredictable behavior across endpoints, with no built-in tool to detect or resolve conflicts.', 'Identity & Access', 72, 65, 62, 60, 50, 63, '2025-04-15', '2026-06-22', 'active'),
('pp-12', 'Hybrid Identity Sync Failures',                'Azure AD Connect sync failures between on-prem AD and Entra ID cause authentication issues and are difficult to diagnose with existing tools.', 'Identity & Access', 80, 58, 75, 72, 68, 71, '2025-05-03', '2026-06-30', 'active'),
('pp-13', 'Intune Device Enrollment Failures',            'Mobile device enrollment in Intune fails silently or with cryptic errors, leaving IT helpdesks spending hours per device troubleshooting.', 'Endpoint Management', 75, 70, 68, 62, 72, 70, '2025-06-18', '2026-07-01', 'active'),
('pp-14', 'Intune Policy Conflict Detection',             'Multiple Intune configuration profiles conflict without warning, causing devices to behave unpredictably with no clear way to identify which policy wins.', 'Endpoint Management', 70, 62, 65, 58, 65, 65, '2025-08-22', '2026-06-28', 'active'),
('pp-15', 'PowerShell Module Version Conflicts',          'Different scripts require different module versions, causing failures and "DLL hell" scenarios that waste hours of developer time.', 'Automation', 62, 72, 55, 50, 58, 60, '2025-03-30', '2026-06-15', 'active'),
('pp-16', 'PowerShell Credential Management Insecurity',  'Scripts contain hardcoded credentials or use insecure storage methods because secure credential management in PowerShell is overly complex.', 'Automation', 82, 68, 60, 55, 62, 66, '2025-05-12', '2026-06-25', 'active'),
('pp-17', 'QuickBooks Integration Breaking Changes',      'QuickBooks API updates regularly break third-party integrations without warning, causing data sync failures for small businesses.', 'Business Software', 78, 72, 80, 75, 75, 77, '2025-04-05', '2026-07-02', 'active'),
('pp-18', 'Small Business CRM Data Quality',              'Small businesses struggle with CRM data quality because staff skip data entry or enter inconsistent information, making the CRM unreliable.', 'Business Software', 65, 80, 72, 82, 55, 72, '2025-01-18', '2026-06-20', 'active'),
('pp-19', 'Support Ticket Routing Inefficiency',          'Customer support tickets are frequently misrouted to wrong teams, adding 24-48 hours of delay and frustrating both agents and customers.', 'Support Operations', 72, 78, 85, 78, 68, 78, '2025-02-08', '2026-07-01', 'active'),
('pp-20', 'Knowledge Base Article Staleness',             'Support knowledge bases become outdated within months, causing agents to provide incorrect solutions and increasing ticket resolution times.', 'Support Operations', 60, 70, 65, 72, 52, 64, '2025-06-25', '2026-06-18', 'monitoring');

-- ============================================================
-- CLUSTERS
-- ============================================================
INSERT INTO Clusters (ClusterId, ClusterName, Description, Category) VALUES
('cl-cloud-cost',    'Cloud Cost Management',        'Pain points related to Azure and cloud cost visibility, optimization, and billing', 'Cloud Infrastructure'),
('cl-db-admin',      'Database Administration',       'SQL Server management, performance, backup, and licensing challenges',              'Database Admin'),
('cl-identity',      'Identity & License Management', 'Active Directory, Entra ID, and Microsoft 365 license management issues',          'Identity & Access'),
('cl-endpoint',      'Endpoint Management',           'Device enrollment, policy management, and Intune-related pain points',              'Endpoint Management'),
('cl-automation',    'IT Automation',                  'PowerShell, scripting, and automation challenges for IT teams',                     'Automation'),
('cl-smb-software',  'Small Business Software',        'Integration, data quality, and workflow pain points for small businesses',          'Business Software'),
('cl-support-ops',   'Support Operations',             'Customer support workflow, ticket routing, and knowledge management',               'Support Operations');

-- ============================================================
-- CLUSTER-PAINPOINT MAPPINGS
-- ============================================================
INSERT INTO ClusterPainPoints (ClusterId, PainPointId) VALUES
('cl-cloud-cost', 'pp-1'), ('cl-cloud-cost', 'pp-2'), ('cl-cloud-cost', 'pp-3'),
('cl-db-admin', 'pp-4'), ('cl-db-admin', 'pp-5'), ('cl-db-admin', 'pp-6'),
('cl-identity', 'pp-7'), ('cl-identity', 'pp-8'), ('cl-identity', 'pp-9'),
('cl-identity', 'pp-10'), ('cl-identity', 'pp-11'), ('cl-identity', 'pp-12'),
('cl-endpoint', 'pp-13'), ('cl-endpoint', 'pp-14'),
('cl-automation', 'pp-15'), ('cl-automation', 'pp-16'),
('cl-smb-software', 'pp-17'), ('cl-smb-software', 'pp-18'),
('cl-support-ops', 'pp-19'), ('cl-support-ops', 'pp-20');

-- ============================================================
-- PRODUCT IDEAS
-- ============================================================
INSERT INTO ProductIdeas (ProductIdeaId, PainPointId, Name, Description, TargetCustomer, MVPFeatures, DifficultyScore, RevenuePotentialScore, ExistingAlternatives, RecommendedFirstFeature) VALUES
('idea-1',  'pp-1',  'CloudCost Guardian',      'Real-time Azure cost anomaly detection with smart alerting that learns your spending patterns and only alerts on genuine anomalies, not noise.', 'Cloud architects, IT managers, CFOs at mid-market companies', 'Cost anomaly detection engine, Smart alert rules, Daily spend dashboard, Reserved Instance utilization tracker, Savings recommendations', 45, 85, 'Azure Cost Management (basic), CloudHealth (enterprise-priced), Spot.io (focused on compute)', 'Daily cost anomaly email digest with one-click investigation'),
('idea-2',  'pp-10', 'ADClean Pro',             'Automated Active Directory hygiene tool that identifies stale accounts, unused groups, and orphaned objects with one-click cleanup workflows.', 'IT administrators, security teams, compliance officers', 'Stale account detection, Risk scoring, Automated cleanup workflows, Compliance reporting, Audit trail', 35, 70, 'ManageEngine ADManager (complex), Quest ActiveRoles (expensive), Custom PowerShell scripts (fragile)', 'Stale account scanner with risk-scored cleanup recommendations'),
('idea-3',  'pp-4',  'SQLPulse',                'Intelligent SQL Server performance monitoring that automatically identifies query regressions, suggests index improvements, and predicts capacity issues.', 'Database administrators, DevOps teams, application developers', 'Query performance tracking, Automatic regression detection, Index advisor, Wait stats analysis, Capacity forecasting', 55, 78, 'SolarWinds DPA (expensive), SentryOne (complex), built-in DMVs (manual)', 'Automatic query regression detection with root cause analysis'),
('idea-4',  'pp-7',  'M365 License Optimizer',  'Dashboard that identifies unused and underutilized Microsoft 365 licenses, recommends downgrades, and automates license reclamation workflows.', 'IT managers, procurement teams, MSPs managing client tenants', 'License usage analysis, Waste identification, Downgrade recommendations, Automated reclamation, Cost savings reporting', 40, 82, 'CoreView (enterprise), Zylo (SaaS management), Manual Excel tracking (most common)', 'License waste scanner with monthly savings estimate'),
('idea-5',  'pp-13', 'IntuneSync',              'Enrollment troubleshooting assistant for Intune that guides users through common failures with step-by-step resolution and automatic log analysis.', 'IT helpdesk, endpoint management teams, MSPs', 'Enrollment error decoder, Step-by-step fix guides, Log analyzer, Bulk enrollment monitor, Self-service portal', 50, 65, 'Microsoft support docs (incomplete), Intune built-in troubleshooter (limited), Community forums', 'Enrollment error lookup with automated fix suggestions'),
('idea-6',  'pp-15', 'PowerShell Hub',          'Cross-platform PowerShell module manager with version pinning, virtual environments, and dependency conflict resolution.', 'IT administrators, DevOps engineers, automation specialists', 'Module version manager, Virtual environments, Dependency resolver, Module search and install, Profile management', 60, 55, 'PSDepend (basic), PowerShellGet (limited), Manual version management', 'Module version conflict detector with resolution suggestions'),
('idea-7',  'pp-17', 'QuickSync Bridge',        'Middleware platform that maintains stable QuickBooks integrations despite API changes with automatic adaptation and data validation.', 'Small business owners, accountants, app developers', 'API change detection, Automatic adapter updates, Data validation, Sync monitoring, Error recovery', 65, 72, 'Zapier/Make (generic), Custom integrations (fragile), QuickBooks built-in sync (limited)', 'API change monitor with automatic field mapping updates'),
('idea-8',  'pp-19', 'TicketFlow AI',           'AI-powered ticket routing engine that learns from historical patterns to automatically categorize and route support tickets to the right team.', 'Support managers, customer success teams, IT service desks', 'AI ticket classification, Smart routing rules, SLA tracker, Escalation automation, Performance analytics', 70, 88, 'Zendesk AI (expensive add-on), Freshdesk Freddy (limited), ServiceNow (enterprise)', 'AI ticket classifier trained on historical routing data'),
('idea-9',  'pp-11', 'PolicyPilot',             'Group Policy conflict detector and optimizer that visualizes policy precedence, identifies conflicts, and recommends consolidation.', 'Windows administrators, IT security teams, MSPs', 'Policy conflict detection, Precedence visualization, Impact analysis, Consolidation recommendations, Change tracking', 45, 62, 'GPMC (manual), PolicyPak (policy management), Custom scripts', 'GPO conflict scanner with visual precedence map'),
('idea-10', 'pp-8',  'ComplianceBot',           'Automated Microsoft 365 compliance reporting that generates audit-ready reports for SOC 2, HIPAA, and GDPR requirements.', 'Compliance officers, IT managers, MSPs', 'Automated report generation, Multi-framework support, Gap analysis, Evidence collection, Remediation tracking', 55, 75, 'Vanta (expensive), Drata (SaaS focused), Manual compliance tracking', 'SOC 2 compliance report generator for M365 tenant'),
('idea-11', 'pp-5',  'BackupSentry',            'SQL Server backup monitoring with automated restore testing that verifies backups actually work before you need them.', 'Database administrators, IT managers, MSPs', 'Backup job monitoring, Automated restore testing, RPO/RTO tracking, Alert management, Compliance reporting', 30, 68, 'Idera SQL Safe (complex), Ola Hallengren scripts (manual), Built-in monitoring (insufficient)', 'Automated weekly backup restore verification with pass/fail reporting'),
('idea-12', 'pp-1',  'CostMap',                 'Multi-cloud cost visualization platform with interactive drill-down, team attribution, and budget forecasting across Azure, AWS, and GCP.', 'Finance teams, cloud architects, engineering managers', 'Multi-cloud cost aggregation, Interactive drill-down, Team attribution, Budget forecasting, Optimization recommendations', 75, 90, 'CloudHealth (VMware), Cloudability (Apptio), Azure Cost Management (single cloud)', 'Interactive cost drill-down dashboard with team attribution');

-- ============================================================
-- TREND SNAPSHOTS (6 months for key pain points)
-- ============================================================
INSERT INTO TrendSnapshots (SnapshotId, PainPointId, SnapshotDate, MentionCount, AverageSeverity, OpportunityScore) VALUES
-- Azure RI Cost Surprises (rising)
('ts-1-01', 'pp-1', '2026-01-01', 45, 72.5, 68),
('ts-1-02', 'pp-1', '2026-02-01', 52, 75.0, 72),
('ts-1-03', 'pp-1', '2026-03-01', 58, 78.2, 76),
('ts-1-04', 'pp-1', '2026-04-01', 63, 80.1, 79),
('ts-1-05', 'pp-1', '2026-05-01', 71, 82.5, 82),
('ts-1-06', 'pp-1', '2026-06-01', 78, 85.0, 84),
-- M365 License Waste (rising)
('ts-7-01', 'pp-7', '2026-01-01', 55, 68.0, 72),
('ts-7-02', 'pp-7', '2026-02-01', 60, 70.5, 74),
('ts-7-03', 'pp-7', '2026-03-01', 68, 72.0, 77),
('ts-7-04', 'pp-7', '2026-04-01', 72, 73.5, 79),
('ts-7-05', 'pp-7', '2026-05-01', 78, 75.0, 81),
('ts-7-06', 'pp-7', '2026-06-01', 85, 75.0, 82),
-- SQL Performance (stable)
('ts-4-01', 'pp-4', '2026-01-01', 42, 85.0, 76),
('ts-4-02', 'pp-4', '2026-02-01', 44, 86.5, 77),
('ts-4-03', 'pp-4', '2026-03-01', 40, 84.0, 76),
('ts-4-04', 'pp-4', '2026-04-01', 45, 88.0, 78),
('ts-4-05', 'pp-4', '2026-05-01', 43, 87.0, 77),
('ts-4-06', 'pp-4', '2026-06-01', 44, 86.0, 78),
-- AD Stale Accounts (stable/slight rise)
('ts-10-01', 'pp-10', '2026-01-01', 38, 75.0, 70),
('ts-10-02', 'pp-10', '2026-02-01', 40, 76.0, 71),
('ts-10-03', 'pp-10', '2026-03-01', 42, 77.5, 73),
('ts-10-04', 'pp-10', '2026-04-01', 41, 76.0, 72),
('ts-10-05', 'pp-10', '2026-05-01', 44, 78.0, 74),
('ts-10-06', 'pp-10', '2026-06-01', 46, 78.0, 75),
-- QuickBooks Integration (rising)
('ts-17-01', 'pp-17', '2026-01-01', 30, 70.0, 65),
('ts-17-02', 'pp-17', '2026-02-01', 35, 72.0, 68),
('ts-17-03', 'pp-17', '2026-03-01', 38, 74.5, 71),
('ts-17-04', 'pp-17', '2026-04-01', 42, 76.0, 74),
('ts-17-05', 'pp-17', '2026-05-01', 48, 78.0, 76),
('ts-17-06', 'pp-17', '2026-06-01', 52, 78.0, 77),
-- Support Ticket Routing (rising)
('ts-19-01', 'pp-19', '2026-01-01', 35, 68.0, 70),
('ts-19-02', 'pp-19', '2026-02-01', 38, 70.0, 72),
('ts-19-03', 'pp-19', '2026-03-01', 42, 71.5, 74),
('ts-19-04', 'pp-19', '2026-04-01', 45, 72.0, 75),
('ts-19-05', 'pp-19', '2026-05-01', 50, 72.0, 77),
('ts-19-06', 'pp-19', '2026-06-01', 55, 72.0, 78);

-- ============================================================
-- RAW POSTS (sample)
-- ============================================================
INSERT INTO RawPosts (RawPostId, SourceId, ExternalId, Title, Body, Author, Url, PublishedAt) VALUES
('rp-1',  'src-reddit-azure', 'abc123', 'Azure RI charges are insane this month', 'We bought RIs for our dev/test environments and just got hit with a $12K surprise charge because workloads shifted to different VM sizes. The RI flexibility is supposed to handle this but clearly does not.', 'cloudadmin42', 'https://reddit.com/r/azure/comments/abc123', '2026-06-15'),
('rp-2',  'src-reddit-sysadmin', 'def456', 'How do you deal with 500+ Azure cost alerts per day?', 'Serious question. Our team gets bombarded with cost alerts for every tiny spike. We turned most of them off and then missed a $5K anomaly last week. How do you filter the noise?', 'sysadmin_tired', 'https://reddit.com/r/sysadmin/comments/def456', '2026-06-20'),
('rp-3',  'src-reddit-sysadmin', 'ghi789', 'AD cleanup project from hell - 15000 stale accounts', 'Inherited an AD environment with 15K accounts, half of which belong to people who left years ago. No automation, no documentation. Where do I even start?', 'newguy_IT', 'https://reddit.com/r/sysadmin/comments/ghi789', '2026-06-22'),
('rp-4',  'src-github-azure-cli', 'issue-4521', 'az cost query returns inconsistent results across subscriptions', 'When running az cost query across multiple subscriptions, the totals do not match the billing portal. This makes any automation for cost reporting unreliable.', 'devops_engineer', 'https://github.com/azure/azure-cli/issues/4521', '2026-06-18'),
('rp-5',  'src-forum-spiceworks', 'thread-8832', 'SQL Server suddenly slow after Windows update', 'Applied the latest cumulative update and now our main ERP database queries are taking 10x longer. Anyone else experiencing this? We are on SQL 2019.', 'DBA_Mike', 'https://community.spiceworks.com/t/thread-8832', '2026-06-25'),
('rp-6',  'src-reddit-smb', 'jkl012', 'QuickBooks Online broke our Shopify integration AGAIN', 'Third time this quarter that a QB update has broken our Shopify sync. Orders are not flowing into QB and our bookkeeper is manually entering everything. This is 2026!', 'shopowner_jane', 'https://reddit.com/r/smallbusiness/comments/jkl012', '2026-06-28'),
('rp-7',  'src-forum-techcomm', 'thread-12045', 'M365 license usage report shows users active who left months ago', 'The M365 admin center usage reports are clearly wrong. Showing active usage for accounts that have been disabled for 3+ months. How can I trust any of this data?', 'M365Admin_Pro', 'https://techcommunity.microsoft.com/t/thread-12045', '2026-06-19'),
('rp-8',  'src-reddit-sysadmin', 'mno345', 'Intune enrollment fails with 0x801c03ed - no useful docs', 'Half our new laptops fail enrollment with this error. Microsoft docs say to check prerequisites but everything looks correct. Spent 3 days on this with no resolution.', 'helpdesk_hero', 'https://reddit.com/r/sysadmin/comments/mno345', '2026-06-30');

-- ============================================================
-- PAIN POINT MENTIONS
-- ============================================================
INSERT INTO PainPointMentions (MentionId, PainPointId, RawPostId, ExtractedText, SentimentScore, SeverityScore) VALUES
('m-1', 'pp-1',  'rp-1', 'Got hit with a $12K surprise charge because workloads shifted to different VM sizes', -0.8, 85),
('m-2', 'pp-2',  'rp-2', 'Gets bombarded with cost alerts for every tiny spike, missed a $5K anomaly', -0.7, 75),
('m-3', 'pp-10', 'rp-3', 'Inherited AD with 15K accounts, half belong to people who left years ago', -0.6, 80),
('m-4', 'pp-3',  'rp-4', 'Cost query across multiple subscriptions totals do not match billing portal', -0.5, 65),
('m-5', 'pp-4',  'rp-5', 'Main ERP database queries taking 10x longer after update', -0.9, 90),
('m-6', 'pp-17', 'rp-6', 'Third time this quarter QB update broke Shopify sync, manually entering everything', -0.85, 80),
('m-7', 'pp-9',  'rp-7', 'M365 usage reports clearly wrong, showing active usage for disabled accounts', -0.6, 60),
('m-8', 'pp-13', 'rp-8', 'Half our new laptops fail enrollment, spent 3 days with no resolution', -0.75, 78);

-- ============================================================
-- USER SUBMISSIONS (community-submitted problems)
-- ============================================================
INSERT INTO UserSubmissions (SubmissionId, Title, Description, Category, Urgency, SubmitterName, SubmitterEmail, Status, CreatedAt, UpdatedAt) VALUES
('sub-seed-1', 'Need a tool to track software licenses across vendors',
 'Our IT team manages licenses for Microsoft, Adobe, Slack, Zoom, and dozens of other vendors in spreadsheets. Renewals slip through, we over-buy seats, and audits are a nightmare. Looking for a centralized license tracker that integrates with our procurement workflow.',
 'IT Operations', 'high', 'Jordan M.', NULL, 'pending', '2026-06-28T10:30:00', '2026-06-28T10:30:00'),
('sub-seed-2', 'Automated onboarding checklist for new employees',
 'Every new hire requires 15+ manual steps across HR, IT, and facilities — AD account, email, laptop, badge, training access. Steps get missed and new hires sit idle on day one. Need a workflow tool that orchestrates onboarding across departments.',
 'HR & People Ops', 'medium', 'Alex R.', NULL, 'reviewing', '2026-06-25T14:00:00', '2026-06-30T09:15:00'),
('sub-seed-3', 'Simple invoice reconciliation for small accounting firms',
 'We reconcile client bank statements against QuickBooks entries manually. Takes 4-6 hours per client per month. Need something that matches transactions automatically and flags discrepancies for review.',
 'Accounting Software', 'critical', 'Sam K.', NULL, 'pending', '2026-07-01T08:45:00', '2026-07-01T08:45:00');
