"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";

interface ProductIdea {
  ProductIdeaId: string;
  PainPointId: string;
  PainPointTitle: string;
  Name: string;
  Description: string;
  TargetCustomer: string;
  MVPFeatures: string;
  DifficultyScore: number;
  RevenuePotentialScore: number;
  ExistingAlternatives: string;
  RecommendedFirstFeature: string;
  CreatedAt: string;
  Category: string;
}

const productIdeas: ProductIdea[] = [
  {
    ProductIdeaId: "idea-001",
    PainPointId: "prob-001",
    PainPointTitle: "Azure Reserved Instance Cost Surprises",
    Name: "CloudCost Guardian",
    Description:
      "An Azure cost anomaly detection SaaS that monitors reserved instance utilization, identifies unexpected billing spikes, and provides actionable recommendations to optimize cloud spend across subscriptions.",
    TargetCustomer:
      "Mid-market companies (50-500 employees) running significant Azure workloads with $10K-$500K monthly cloud spend",
    MVPFeatures:
      "Real-time cost anomaly detection using statistical baselines across Azure subscriptions. Automated daily digest emails highlighting cost spikes exceeding configurable thresholds. Reserved Instance utilization tracker with recommendations for right-sizing or exchanging underused reservations. Budget alert integration with Teams and Slack notifications. Historical trend dashboard showing cost-per-service breakdown over 30/60/90 day windows.",
    DifficultyScore: 45,
    RevenuePotentialScore: 85,
    ExistingAlternatives:
      "Azure Cost Management (built-in but limited alerting), CloudHealth by VMware, Spot.io, Kubecost for containers",
    RecommendedFirstFeature:
      "Daily anomaly digest email with top 3 cost spikes and one-click deep-dive links",
    CreatedAt: "2026-06-15T10:30:00Z",
    Category: "Cloud Infrastructure",
  },
  {
    ProductIdeaId: "idea-002",
    PainPointId: "prob-010",
    PainPointTitle: "Active Directory Stale Account Sprawl",
    Name: "ADClean Pro",
    Description:
      "Automated Active Directory stale account cleanup tool that identifies inactive users, disabled computers, and orphaned service accounts, then safely archives or removes them with full audit trails.",
    TargetCustomer:
      "IT administrators and security teams at organizations with 500+ AD accounts managing on-premises or hybrid Active Directory environments",
    MVPFeatures:
      "Automated discovery of accounts inactive for configurable periods (30/60/90 days) with last-logon correlation across domain controllers. Safe cleanup workflow with staging, manager approval notifications, and reversible archival before permanent deletion. Compliance reporting showing account hygiene metrics aligned with SOX and HIPAA requirements. Scheduled scans with delta reports highlighting newly stale accounts since last review. Integration with ServiceNow and Jira for change management ticket generation.",
    DifficultyScore: 35,
    RevenuePotentialScore: 70,
    ExistingAlternatives:
      "ManageEngine ADManager Plus, Netwrix Auditor, custom PowerShell scripts, Quest Active Roles",
    RecommendedFirstFeature:
      "One-click scan generating a prioritized list of stale accounts with recommended actions",
    CreatedAt: "2026-06-14T14:20:00Z",
    Category: "Identity & Access",
  },
  {
    ProductIdeaId: "idea-003",
    PainPointId: "prob-003",
    PainPointTitle: "SQL Server Performance Degradation Blind Spots",
    Name: "SQLPulse",
    Description:
      "A SQL Server performance monitoring dashboard that surfaces slow queries, index fragmentation, and resource bottlenecks in real-time with AI-powered tuning recommendations.",
    TargetCustomer:
      "Database administrators and DevOps teams managing 5-50 SQL Server instances in production environments",
    MVPFeatures:
      "Real-time query performance monitor with automatic identification of top resource-consuming queries and execution plan analysis. Index health dashboard showing fragmentation levels, missing index recommendations, and unused index candidates for removal. Wait statistics visualization correlating CPU, I/O, and memory pressure with specific workload patterns. Automated weekly health report with trending metrics and proactive alerts before performance thresholds are breached. Query store integration providing historical regression detection when execution plans change.",
    DifficultyScore: 55,
    RevenuePotentialScore: 78,
    ExistingAlternatives:
      "SolarWinds DPA, Redgate SQL Monitor, SentryOne, Idera SQL Diagnostic Manager, built-in Query Store",
    RecommendedFirstFeature:
      "Top 10 slowest queries dashboard with one-click index recommendation generation",
    CreatedAt: "2026-06-12T09:15:00Z",
    Category: "Database Admin",
  },
  {
    ProductIdeaId: "idea-004",
    PainPointId: "prob-011",
    PainPointTitle: "Microsoft 365 License Waste and Over-provisioning",
    Name: "M365 License Optimizer",
    Description:
      "A Microsoft 365 license waste reduction tool that analyzes actual feature usage per user, identifies downgrade opportunities, and automates license reassignment to eliminate overspend.",
    TargetCustomer:
      "IT procurement managers and M365 administrators at organizations with 200+ licensed users spending $50K+ annually on Microsoft 365",
    MVPFeatures:
      "Per-user license utilization scoring based on actual usage of premium features like Power BI, advanced eDiscovery, and Defender capabilities. Automated downgrade recommendations showing potential savings when users only use basic email and OneDrive. License pool visualization showing allocated vs. active vs. unassigned licenses across all SKUs. Savings calculator projecting annual cost reduction from implementing optimization recommendations. Automated reassignment workflows with manager approval gates and user notification emails.",
    DifficultyScore: 40,
    RevenuePotentialScore: 82,
    ExistingAlternatives:
      "CoreView, Zylo, Productiv, Microsoft 365 Admin Center usage reports (limited), Octopus Cloud",
    RecommendedFirstFeature:
      "License waste report showing users with E5 licenses who only use E3 features",
    CreatedAt: "2026-06-10T16:45:00Z",
    Category: "Cloud Infrastructure",
  },
  {
    ProductIdeaId: "idea-005",
    PainPointId: "prob-012",
    PainPointTitle: "Intune Device Enrollment Failures",
    Name: "IntuneSync",
    Description:
      "An Intune device enrollment troubleshooter that diagnoses enrollment failures, identifies policy conflicts, and provides step-by-step remediation guidance for common MDM issues.",
    TargetCustomer:
      "Endpoint management teams and helpdesk technicians supporting BYOD and corporate device enrollment across Windows, iOS, and Android",
    MVPFeatures:
      "Enrollment failure diagnostic engine parsing device logs and Intune service health to pinpoint root causes. Policy conflict detector identifying contradictory configuration profiles and compliance policies applied to the same device groups. Guided remediation workflows with platform-specific steps for the top 20 enrollment failure codes. Enrollment success rate dashboard with drill-down by platform, enrollment type, and failure category. Bulk re-enrollment trigger with pre-flight checks ensuring prerequisites are met before retry.",
    DifficultyScore: 50,
    RevenuePotentialScore: 65,
    ExistingAlternatives:
      "Intune Troubleshooting blade (basic), Intune Training Wheels (community), custom diagnostic scripts",
    RecommendedFirstFeature:
      "Paste-an-error-code tool that instantly returns the top 3 fixes with success rate percentages",
    CreatedAt: "2026-06-08T11:00:00Z",
    Category: "Identity & Access",
  },
  {
    ProductIdeaId: "idea-006",
    PainPointId: "prob-013",
    PainPointTitle: "PowerShell Module Version Conflicts",
    Name: "PowerShell Hub",
    Description:
      "A cross-platform PowerShell module manager that handles version pinning, dependency resolution, and environment isolation for teams sharing automation scripts.",
    TargetCustomer:
      "DevOps engineers and system administrators maintaining shared PowerShell automation repositories with 10+ custom modules",
    MVPFeatures:
      "Module version pinning with lock-file support similar to npm/yarn for reproducible automation environments. Dependency tree visualization showing transitive module dependencies and potential version conflicts before installation. Environment isolation using per-project module paths preventing global module pollution across different automation workloads. Team module registry allowing organizations to publish, version, and share internal modules with access controls. Automated compatibility testing running module imports against PowerShell 5.1, 7.x, and cross-platform (Linux/macOS) targets.",
    DifficultyScore: 60,
    RevenuePotentialScore: 55,
    ExistingAlternatives:
      "PSDepend, PowerShellGet v3, PSResourceGet, private NuGet feeds, manual module management",
    RecommendedFirstFeature:
      "Module lock-file generator that scans a project and pins all current module versions",
    CreatedAt: "2026-06-06T08:30:00Z",
    Category: "Dev Tooling",
  },
  {
    ProductIdeaId: "idea-007",
    PainPointId: "prob-014",
    PainPointTitle: "QuickBooks Data Sync Failures with External Systems",
    Name: "QuickSync Bridge",
    Description:
      "A QuickBooks integration middleware that provides reliable bi-directional sync between QuickBooks Online/Desktop and CRM, e-commerce, and inventory systems with conflict resolution.",
    TargetCustomer:
      "Small to mid-size businesses (10-200 employees) running QuickBooks alongside 2-5 other business applications needing financial data sync",
    MVPFeatures:
      "Pre-built connectors for top 10 integrations including Shopify, WooCommerce, Salesforce, HubSpot, and Square with zero-code mapping configuration. Conflict resolution engine handling duplicate invoices, mismatched customer records, and currency conversion discrepancies. Real-time sync status dashboard with per-record success/failure tracking and automatic retry with exponential backoff. Field mapping designer with transformation rules for normalizing data formats between systems. Historical sync log with full audit trail showing every record created, updated, or skipped with timestamps and reason codes.",
    DifficultyScore: 65,
    RevenuePotentialScore: 72,
    ExistingAlternatives:
      "Zapier (limited depth), Workato, Celigo, OneSaas, custom middleware, QuickBooks App Store connectors",
    RecommendedFirstFeature:
      "Shopify-to-QuickBooks order sync with automatic invoice creation and payment matching",
    CreatedAt: "2026-06-04T13:20:00Z",
    Category: "Business Software",
  },
  {
    ProductIdeaId: "idea-008",
    PainPointId: "prob-007",
    PainPointTitle: "Helpdesk Ticket Routing Misclassification",
    Name: "TicketFlow AI",
    Description:
      "An AI-powered ticket routing and SLA tracker that automatically categorizes, prioritizes, and routes support tickets to the right team while predicting SLA breach risks.",
    TargetCustomer:
      "IT service desk managers and support operations leads handling 500+ tickets/month across multiple support tiers and teams",
    MVPFeatures:
      "NLP-powered ticket classification trained on historical routing data to automatically assign category, priority, and team with confidence scores. SLA breach predictor analyzing current queue depth, agent availability, and ticket complexity to flag at-risk tickets before they breach. Smart escalation rules triggering automatic re-routing when response times approach thresholds or customer sentiment indicates frustration. Performance analytics dashboard showing MTTR, first-contact resolution rates, and routing accuracy by category and team. Integration with ServiceNow, Zendesk, Jira Service Management, and Freshdesk via API connectors.",
    DifficultyScore: 70,
    RevenuePotentialScore: 88,
    ExistingAlternatives:
      "Built-in routing in Zendesk/ServiceNow, Moveworks, Espressive Barista, Aisera, manual triage by dispatchers",
    RecommendedFirstFeature:
      "Auto-categorization plugin for Zendesk that classifies incoming tickets with 85%+ accuracy",
    CreatedAt: "2026-06-02T15:40:00Z",
    Category: "Support Operations",
  },
  {
    ProductIdeaId: "idea-009",
    PainPointId: "prob-015",
    PainPointTitle: "Group Policy Conflicts Causing Unexpected Behavior",
    Name: "PolicyPilot",
    Description:
      "A Group Policy conflict detector that visualizes GPO inheritance, identifies contradictory settings, and simulates policy application results before deployment.",
    TargetCustomer:
      "Windows infrastructure administrators managing 20+ Group Policy Objects across complex OU structures with multiple sites",
    MVPFeatures:
      "GPO conflict detection engine comparing all policies in scope for a given OU path and highlighting contradictory or overridden settings. Visual inheritance tree showing effective policy for any user/computer with clear indication of which GPO wins at each precedence level. Pre-deployment simulation running RSOP analysis against test accounts to predict behavior changes before linking new GPOs. Drift detection alerting when GPO settings change unexpectedly or when new GPOs are linked without change management approval. Documentation generator creating human-readable policy summaries exportable as PDF for compliance auditors.",
    DifficultyScore: 45,
    RevenuePotentialScore: 62,
    ExistingAlternatives:
      "GPMC/RSOP (built-in but complex), SDM Software GPO tools, PolicyPak, ManageEngine ADManager",
    RecommendedFirstFeature:
      "Conflict scanner that identifies the top 5 most-overridden settings in your environment",
    CreatedAt: "2026-05-30T10:00:00Z",
    Category: "Identity & Access",
  },
  {
    ProductIdeaId: "idea-010",
    PainPointId: "prob-016",
    PainPointTitle: "Microsoft 365 Compliance Gap Visibility",
    Name: "ComplianceBot",
    Description:
      "Automated Microsoft 365 compliance reporting that continuously monitors DLP policies, retention labels, sensitivity labels, and audit logs to generate board-ready compliance dashboards.",
    TargetCustomer:
      "Compliance officers and IT security managers at regulated organizations (financial services, healthcare, legal) with 500+ M365 users",
    MVPFeatures:
      "Continuous compliance posture scoring across DLP, retention, sensitivity labels, and conditional access policies with gap identification. Automated report generation for SOC2, HIPAA, and GDPR frameworks mapping M365 controls to specific compliance requirements. Audit log anomaly detection flagging unusual admin activities, mass file downloads, or permission changes outside business hours. Policy coverage analyzer identifying unprotected content, users without sensitivity labels, or mailboxes missing retention policies. Executive dashboard with compliance trend tracking, risk scoring, and exportable board-presentation PDF reports.",
    DifficultyScore: 55,
    RevenuePotentialScore: 75,
    ExistingAlternatives:
      "Microsoft Purview Compliance Manager, Netwrix, Varonis, CoreView compliance module, manual audit processes",
    RecommendedFirstFeature:
      "One-click compliance gap report showing which users and content lack required protection policies",
    CreatedAt: "2026-05-28T09:30:00Z",
    Category: "Cloud Infrastructure",
  },
  {
    ProductIdeaId: "idea-011",
    PainPointId: "prob-017",
    PainPointTitle: "SQL Server Backup Failures Going Unnoticed",
    Name: "BackupSentry",
    Description:
      "SQL Server backup monitoring and alerting service that tracks backup success/failure across all instances, verifies backup integrity, and alerts on missed backup windows.",
    TargetCustomer:
      "Database administrators and managed service providers responsible for backup compliance across 10-100 SQL Server instances",
    MVPFeatures:
      "Centralized backup status dashboard aggregating success/failure data from all registered SQL Server instances via lightweight agent or WMI. Missed backup window detection with configurable schedules per database and immediate alerting via email, SMS, or PagerDuty. Backup integrity verification running automated RESTORE VERIFYONLY on latest backups with weekly full-restore test scheduling. Retention policy compliance tracker ensuring backups exist for required time periods and alerting before oldest backups age out. Recovery time estimator calculating expected RTO based on backup sizes, network bandwidth, and restore history benchmarks.",
    DifficultyScore: 30,
    RevenuePotentialScore: 68,
    ExistingAlternatives:
      "SQL Server Maintenance Plans, Ola Hallengren scripts, DBATools, Redgate SQL Backup, Idera SQL Safe",
    RecommendedFirstFeature:
      "Multi-instance backup status dashboard with red/yellow/green indicators and one-click alert setup",
    CreatedAt: "2026-05-25T14:15:00Z",
    Category: "Database Admin",
  },
  {
    ProductIdeaId: "idea-012",
    PainPointId: "prob-018",
    PainPointTitle: "Multi-Cloud Cost Visibility Fragmentation",
    Name: "CostMap",
    Description:
      "A multi-cloud cost visualization tool that unifies billing data from AWS, Azure, and GCP into a single interactive map showing spend allocation, waste, and optimization opportunities.",
    TargetCustomer:
      "FinOps teams and cloud architects at enterprises running workloads across 2+ cloud providers with combined spend exceeding $100K/month",
    MVPFeatures:
      "Unified cost ingestion from AWS Cost Explorer, Azure Cost Management, and GCP Billing APIs normalized into a common taxonomy. Interactive cost map visualization showing hierarchical spend allocation by provider, service, team, environment, and tag dimensions. Waste identification engine detecting idle resources, oversized instances, and unattached storage across all three clouds. Cross-cloud price comparison for equivalent services helping inform placement decisions for new workloads. Chargeback report generator allocating shared infrastructure costs to business units based on configurable allocation models.",
    DifficultyScore: 75,
    RevenuePotentialScore: 90,
    ExistingAlternatives:
      "CloudHealth by VMware, Apptio Cloudability, Spot.io, Kubecost, native cloud billing consoles",
    RecommendedFirstFeature:
      "AWS + Azure cost unification dashboard with tag-based grouping and month-over-month comparison",
    CreatedAt: "2026-05-22T11:45:00Z",
    Category: "Cloud Infrastructure",
  },
];

const categories = [
  "All",
  ...Array.from(new Set(productIdeas.map((idea) => idea.Category))),
];

type SortOption = "revenue" | "difficulty-asc" | "difficulty-desc" | "newest";
type ViewMode = "grid" | "list";

function getDifficultyColor(score: number): string {
  if (score <= 30) return "text-green-600";
  if (score <= 50) return "text-yellow-600";
  if (score <= 70) return "text-orange-500";
  return "text-red-500";
}

function getDifficultyBarColor(score: number): string {
  if (score <= 30) return "bg-green-500";
  if (score <= 50) return "bg-yellow-500";
  if (score <= 70) return "bg-orange-500";
  return "bg-red-500";
}

function getRevenueBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-green-500";
  if (score >= 40) return "bg-lime-500";
  return "bg-gray-400";
}

function isQuickWin(idea: ProductIdea): boolean {
  return idea.DifficultyScore < 40 && idea.RevenuePotentialScore > 70;
}

export default function ProductIdeasPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("revenue");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredAndSorted = useMemo(() => {
    const results = productIdeas.filter((idea) => {
      const matchesSearch =
        searchQuery === "" ||
        idea.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.Description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.TargetCustomer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || idea.Category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    results.sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.RevenuePotentialScore - a.RevenuePotentialScore;
        case "difficulty-asc":
          return a.DifficultyScore - b.DifficultyScore;
        case "difficulty-desc":
          return b.DifficultyScore - a.DifficultyScore;
        case "newest":
          return (
            new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
          );
        default:
          return 0;
      }
    });

    return results;
  }, [searchQuery, selectedCategory, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Product Ideas</h1>
        <p className="mt-1 text-text-secondary">
          AI-generated product and service ideas derived from discovered pain
          points
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {filteredAndSorted.length} ideas generated
        </p>
      </div>

      {/* Filter/Sort Bar */}
      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="select"
            >
              <option value="revenue">Revenue Potential</option>
              <option value="difficulty-asc">Difficulty (Low to High)</option>
              <option value="difficulty-desc">Difficulty (High to Low)</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-brand-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-brand-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((idea) => (
            <div
              key={idea.ProductIdeaId}
              className={`card card-hover cursor-pointer transition-all duration-300 ${
                expandedId === idea.ProductIdeaId
                  ? "md:col-span-2 lg:col-span-3"
                  : ""
              }`}
              onClick={() =>
                setExpandedId(
                  expandedId === idea.ProductIdeaId
                    ? null
                    : idea.ProductIdeaId
                )
              }
            >
              {/* Card Header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-bold text-text-primary">
                      {idea.Name}
                    </h3>
                    {isQuickWin(idea) && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Quick Win
                      </span>
                    )}
                  </div>
                  <span className="mt-1 inline-block rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {idea.Category}
                  </span>
                </div>
                <svg
                  className={`h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 ${
                    expandedId === idea.ProductIdeaId ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Description */}
              <p
                className={`text-sm text-text-secondary ${
                  expandedId === idea.ProductIdeaId
                    ? ""
                    : "line-clamp-2"
                }`}
              >
                {idea.Description}
              </p>

              {/* Pain Point Link */}
              <div className="mt-2">
                <Link
                  href={`/problems/${idea.PainPointId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-brand-primary hover:underline"
                >
                  Pain Point: {idea.PainPointTitle}
                </Link>
              </div>

              {/* Score Bars */}
              <div className="mt-4 space-y-2">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-text-secondary">
                      Revenue Potential
                    </span>
                    <span className="text-xs font-medium text-text-primary">
                      {idea.RevenuePotentialScore}
                    </span>
                  </div>
                  <div className="score-bar">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getRevenueBarColor(idea.RevenuePotentialScore)}`}
                      style={{ width: `${idea.RevenuePotentialScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-text-secondary">
                      Difficulty
                    </span>
                    <span
                      className={`text-xs font-medium ${getDifficultyColor(idea.DifficultyScore)}`}
                    >
                      {idea.DifficultyScore}
                    </span>
                  </div>
                  <div className="score-bar">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getDifficultyBarColor(idea.DifficultyScore)}`}
                      style={{ width: `${idea.DifficultyScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Target Customer */}
              <p className="mt-3 text-xs text-text-muted">
                <span className="font-medium">Target:</span>{" "}
                {expandedId === idea.ProductIdeaId
                  ? idea.TargetCustomer
                  : idea.TargetCustomer.slice(0, 80) + "..."}
              </p>

              {/* Expanded Content */}
              {expandedId === idea.ProductIdeaId && (
                <div className="mt-5 space-y-4 border-t border-border pt-5">
                  {/* MVP Features */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-text-primary">
                      MVP Features
                    </h4>
                    <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
                      {idea.MVPFeatures.split(". ")
                        .filter((f) => f.trim())
                        .map((feature, i) => (
                          <li key={i}>{feature.replace(/\.$/, "")}</li>
                        ))}
                    </ul>
                  </div>

                  {/* Existing Alternatives */}
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-text-primary">
                      Existing Alternatives
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {idea.ExistingAlternatives}
                    </p>
                  </div>

                  {/* Recommended First Feature */}
                  <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
                    <h4 className="mb-1 text-sm font-semibold text-brand-primary">
                      Recommended First Feature
                    </h4>
                    <p className="text-sm text-text-primary">
                      {idea.RecommendedFirstFeature}
                    </p>
                  </div>

                  {/* Link to Pain Point */}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/problems/${idea.PainPointId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn-primary inline-flex items-center gap-1.5 text-sm"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      View Source Pain Point
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(null);
                      }}
                      className="btn-secondary text-sm"
                    >
                      Collapse
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Name
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Category
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Problem Solved
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Difficulty
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Revenue
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Target Customer
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((idea) => (
                  <tr
                    key={idea.ProductIdeaId}
                    className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-alt"
                    onClick={() =>
                      setExpandedId(
                        expandedId === idea.ProductIdeaId
                          ? null
                          : idea.ProductIdeaId
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {idea.Name}
                        </span>
                        {isQuickWin(idea) && (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Quick Win
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-secondary">
                        {idea.Category}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <Link
                        href={`/problems/${idea.PainPointId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-xs text-brand-primary hover:underline"
                      >
                        {idea.PainPointTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${getDifficultyColor(idea.DifficultyScore)}`}
                      >
                        {idea.DifficultyScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge
                        score={idea.RevenuePotentialScore}
                        size="sm"
                        showLabel={false}
                      />
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <span className="truncate text-xs text-text-muted">
                        {idea.TargetCustomer.slice(0, 60)}...
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded Detail in List View */}
          {expandedId && (
            <div className="border-t border-border bg-surface p-6">
              {(() => {
                const idea = productIdeas.find(
                  (i) => i.ProductIdeaId === expandedId
                );
                if (!idea) return null;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-text-primary">
                        {idea.Name}
                      </h3>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="btn-secondary text-sm"
                      >
                        Close
                      </button>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {idea.Description}
                    </p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-text-primary">
                          MVP Features
                        </h4>
                        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
                          {idea.MVPFeatures.split(". ")
                            .filter((f) => f.trim())
                            .map((feature, i) => (
                              <li key={i}>{feature.replace(/\.$/, "")}</li>
                            ))}
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h4 className="mb-1 text-sm font-semibold text-text-primary">
                            Existing Alternatives
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {idea.ExistingAlternatives}
                          </p>
                        </div>
                        <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
                          <h4 className="mb-1 text-sm font-semibold text-brand-primary">
                            Recommended First Feature
                          </h4>
                          <p className="text-sm text-text-primary">
                            {idea.RecommendedFirstFeature}
                          </p>
                        </div>
                        <ScoreBar
                          score={idea.RevenuePotentialScore}
                          label="Revenue Potential"
                        />
                        <ScoreBar
                          score={idea.DifficultyScore}
                          label="Difficulty"
                        />
                      </div>
                    </div>

                    <Link
                      href={`/problems/${idea.PainPointId}`}
                      className="btn-primary inline-flex items-center gap-1.5 text-sm"
                    >
                      View Source Pain Point
                    </Link>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredAndSorted.length === 0 && (
        <div className="card py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-text-primary">
            No ideas found
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
