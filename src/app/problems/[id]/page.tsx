"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { SourceIcon } from "@/components/ui/SourceIcon";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface PainPoint {
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
  Status: "active" | "monitoring" | "resolved";
  TrendDirection: "up" | "down" | "stable";
}

interface SourceExample {
  source: string;
  sourceType: string;
  text: string;
  author: string;
  date: string;
  url: string;
}

interface ProblemDetail {
  painPoint: PainPoint;
  aiExplanation: string;
  sourceExamples: SourceExample[];
  similarComplaints: { id: string; title: string; score: number }[];
  productIdeas: { name: string; description: string; difficulty: number; revenue: number }[];
  targetCustomers: string[];
  monetizationIdeas: string[];
  competitiveNotes: string[];
  trendHistory: { month: string; mentions: number; severity: number }[];
  nextSteps: string[];
}

function getProblemDetail(id: string): ProblemDetail | null {
  const data: Record<string, ProblemDetail> = {
    "pp-1": {
      painPoint: {
        PainPointId: "pp-1",
        Title: "Azure Reserved Instance Cost Surprises",
        Summary: "Cloud teams discover unexpected charges from Azure Reserved Instances due to confusing commitment terms, region mismatches, and lack of real-time utilization tracking.",
        Category: "Cloud Cost Management",
        SeverityScore: 82,
        FrequencyScore: 76,
        WillingnessToPayScore: 88,
        MarketSizeScore: 91,
        TrendScore: 74,
        OpportunityScore: 85,
        FirstSeenAt: "2025-08-14",
        LastSeenAt: "2026-06-28",
        Status: "active",
        TrendDirection: "up",
      },
      aiExplanation: `Azure Reserved Instances (RIs) represent one of the most significant yet poorly understood cost optimization tools in cloud computing. Our analysis of over 2,400 complaints across Reddit, GitHub issues, and cloud forums reveals a consistent pattern: organizations commit to 1-3 year reservations expecting 40-60% savings, only to discover hidden costs from region lock-in, instance family inflexibility, and utilization gaps that erode projected savings by 15-35%.

The core issue stems from the disconnect between Azure's RI pricing model and real-world infrastructure needs. Teams report that workload patterns shift faster than commitment periods, leaving them paying for unused capacity. The Azure Cost Management portal provides retrospective data but lacks predictive alerts that could prevent over-commitment. This gap is particularly painful for mid-market companies ($10M-$500M revenue) who lack dedicated FinOps teams but have significant enough cloud spend to warrant reservation strategies.

Market signals indicate this pain point is intensifying as more organizations migrate to Azure and face their first RI renewal cycles. The combination of high willingness to pay (evidenced by existing spend on tools like CloudHealth and Spot.io) and growing dissatisfaction with current solutions creates a clear opportunity window for a specialized, Azure-focused RI optimization platform.`,
      sourceExamples: [
        {
          source: "r/azure",
          sourceType: "reddit",
          text: "We committed to a 3-year RI for our D-series VMs, then our team migrated to E-series for memory optimization. Now we're paying full price for new VMs AND stuck with unused reservations. Azure support says we can 'exchange' but the process is kafkaesque and we lose 12% in fees.",
          author: "u/cloudops_frustrated",
          date: "2026-05-12",
          url: "https://reddit.com/r/azure/comments/example1",
        },
        {
          source: "GitHub Issues",
          sourceType: "github",
          text: "The Azure Cost Management API returns reservation utilization data with a 48-72 hour delay. By the time we detect underutilization, we've already wasted thousands. We need real-time reservation monitoring with predictive alerts. This has been requested since 2024.",
          author: "terraform-azure-user",
          date: "2026-04-23",
          url: "https://github.com/Azure/azure-cli/issues/example2",
        },
        {
          source: "r/devops",
          sourceType: "reddit",
          text: "Just got our quarterly cloud bill: $47K over budget because our RI coverage dropped to 34% after the reorg moved workloads between subscriptions. Nobody told us RIs are subscription-scoped by default. The documentation buries this in paragraph 47 of a 12-page article.",
          author: "u/devops_bill_shock",
          date: "2026-06-01",
          url: "https://reddit.com/r/devops/comments/example3",
        },
        {
          source: "Cloud Forum",
          sourceType: "forum",
          text: "Has anyone successfully built an automated RI purchasing strategy? We tried using Azure Advisor recommendations but they're based on 30-day lookback and don't account for seasonal patterns. Bought $200K in reservations in December based on holiday traffic, now sitting at 45% utilization.",
          author: "FinOpsLead_Sarah",
          date: "2026-03-18",
          url: "https://techcommunity.microsoft.com/example4",
        },
      ],
      similarComplaints: [
        { id: "pp-2", title: "AWS Savings Plan Complexity", score: 78 },
        { id: "pp-3", title: "Multi-Cloud Cost Visibility Gaps", score: 72 },
        { id: "pp-4", title: "Kubernetes Cost Attribution Failures", score: 68 },
        { id: "pp-5", title: "SaaS License Waste in Enterprise", score: 61 },
      ],
      productIdeas: [
        {
          name: "ReserveGuard — RI Optimization Platform",
          description: "Real-time Azure RI utilization monitoring with predictive alerts, automated exchange recommendations, and scenario modeling for commitment decisions. Integrates with Azure APIs to provide minute-level utilization data and ML-based forecasting.",
          difficulty: 65,
          revenue: 88,
        },
        {
          name: "CloudCommit Advisor",
          description: "A lightweight SaaS tool that simulates RI purchase scenarios using historical usage data, accounting for seasonal patterns, planned migrations, and team restructuring. Provides confidence scores for each commitment recommendation.",
          difficulty: 45,
          revenue: 72,
        },
        {
          name: "RI Broker Marketplace",
          description: "A secondary marketplace where organizations can trade unused RI capacity with other Azure customers, similar to how energy markets work. Includes automated matching, compliance verification, and settlement.",
          difficulty: 85,
          revenue: 94,
        },
      ],
      targetCustomers: [
        "Cloud Infrastructure Managers at mid-market companies ($10M-$500M revenue)",
        "FinOps teams and Cloud Center of Excellence leaders",
        "CFOs and VP Finance at cloud-native organizations",
        "DevOps engineers responsible for infrastructure cost allocation",
        "MSPs (Managed Service Providers) managing multi-tenant Azure environments",
      ],
      monetizationIdeas: [
        "SaaS subscription with tiered pricing based on cloud spend under management ($499-$4,999/mo)",
        "Percentage-of-savings model: charge 15-20% of documented cost reductions",
        "One-time RI audit and optimization consulting engagement ($5K-$25K)",
        "Freemium model with basic utilization dashboards, paid predictive features",
        "Enterprise licensing with SSO, custom integrations, and dedicated support",
      ],
      competitiveNotes: [
        "CloudHealth (VMware) offers RI management but is expensive ($50K+ annually) and overly broad in scope — not Azure-specialized",
        "Azure Cost Management is free but reactive, with 48-72 hour data delays and no predictive capabilities",
        "Spot.io (NetApp) focuses on spot instances, not reserved capacity optimization",
        "Apptio Cloudability provides visibility but lacks actionable automation for exchanges and modifications",
        "Gap: No tool combines real-time monitoring + predictive alerts + automated exchange execution specifically for Azure RIs",
      ],
      trendHistory: [
        { month: "Jan 2026", mentions: 34, severity: 62 },
        { month: "Feb 2026", mentions: 41, severity: 65 },
        { month: "Mar 2026", mentions: 52, severity: 71 },
        { month: "Apr 2026", mentions: 48, severity: 74 },
        { month: "May 2026", mentions: 67, severity: 78 },
        { month: "Jun 2026", mentions: 83, severity: 82 },
      ],
      nextSteps: [
        "Validate demand by surveying 20+ Azure customers spending >$50K/month on compute reservations",
        "Build MVP focusing on real-time utilization dashboards with a 5-minute data refresh SLA",
        "Partner with Azure MVP community members for early feedback and co-marketing",
        "Develop comparison calculator showing cost of current approach vs. optimized strategy",
        "Create content marketing around 'RI horror stories' to drive organic traffic",
        "Explore Azure Marketplace listing for distribution and co-sell opportunities",
      ],
    },
    "pp-2": {
      painPoint: {
        PainPointId: "pp-2",
        Title: "AWS Savings Plan Complexity",
        Summary: "Engineering teams struggle to understand and optimize AWS Savings Plans due to complex commitment structures, lack of cross-account visibility, and poor tooling for modeling future usage patterns.",
        Category: "Cloud Cost Management",
        SeverityScore: 75,
        FrequencyScore: 82,
        WillingnessToPayScore: 79,
        MarketSizeScore: 94,
        TrendScore: 68,
        OpportunityScore: 78,
        FirstSeenAt: "2025-06-22",
        LastSeenAt: "2026-06-25",
        Status: "active",
        TrendDirection: "up",
      },
      aiExplanation: `AWS Savings Plans were introduced as a simpler alternative to Reserved Instances, yet our analysis of 1,800+ complaints reveals that the simplification created new confusion points. Organizations struggle with three primary issues: choosing between Compute Savings Plans and EC2 Instance Savings Plans, understanding how savings apply across linked accounts in AWS Organizations, and forecasting future compute needs to right-size commitments.

The frequency of this complaint is notably high because AWS has the largest market share in cloud computing, meaning more organizations encounter this friction. Unlike Azure RIs which are instance-specific, AWS Savings Plans apply as a dollar-per-hour commitment that floats across services — a model that's theoretically flexible but practically opaque. Teams report spending weeks analyzing Cost Explorer data only to make suboptimal decisions because the tooling doesn't surface cross-service utilization patterns.

The opportunity is amplified by the sheer scale of AWS spending in enterprise environments. Companies with $1M+ annual AWS bills report wasting 20-30% of potential savings due to analysis paralysis or conservative commitments. The willingness to pay for better tooling is validated by the success of companies like ProsperOps and Zesty, though significant gaps remain in multi-account governance and scenario planning.`,
      sourceExamples: [
        {
          source: "r/aws",
          sourceType: "reddit",
          text: "Can someone ELI5 how Compute Savings Plans interact with Fargate and Lambda? We bought $50/hr in Compute SP thinking it would cover our containers, but our bill barely changed. Turns out the discount calculation for serverless is completely different from EC2.",
          author: "u/aws_confused_eng",
          date: "2026-06-15",
          url: "https://reddit.com/r/aws/comments/example5",
        },
        {
          source: "r/devops",
          sourceType: "reddit",
          text: "Our AWS Organization has 47 accounts. Savings Plans are supposed to share across accounts, but the allocation logic is non-deterministic. Different accounts get different effective discounts each hour. Impossible to do accurate showback to business units.",
          author: "u/multiaccountpain",
          date: "2026-05-28",
          url: "https://reddit.com/r/devops/comments/example6",
        },
        {
          source: "GitHub Issues",
          sourceType: "github",
          text: "Feature request: AWS Cost Explorer should provide a 'what-if' simulator for Savings Plan purchases. Currently we export months of CUR data to custom scripts just to model whether a Compute SP or EC2 SP gives better ROI for our specific workload mix.",
          author: "cloud-cost-tools",
          date: "2026-04-10",
          url: "https://github.com/aws/aws-cli/issues/example7",
        },
      ],
      similarComplaints: [
        { id: "pp-1", title: "Azure Reserved Instance Cost Surprises", score: 85 },
        { id: "pp-3", title: "Multi-Cloud Cost Visibility Gaps", score: 74 },
        { id: "pp-4", title: "Kubernetes Cost Attribution Failures", score: 65 },
      ],
      productIdeas: [
        {
          name: "SavingsLens — SP Optimization Engine",
          description: "ML-powered tool that analyzes CUR data across all linked accounts to recommend optimal Savings Plan mix, with hourly simulations showing projected vs. actual savings and automated alerts for coverage drops.",
          difficulty: 70,
          revenue: 85,
        },
        {
          name: "SP Showback Calculator",
          description: "Purpose-built tool for multi-account AWS organizations that deterministically allocates Savings Plan discounts to business units for accurate chargeback/showback reporting.",
          difficulty: 55,
          revenue: 68,
        },
      ],
      targetCustomers: [
        "Cloud Platform Engineering teams at enterprises with 20+ AWS accounts",
        "FinOps practitioners managing $500K+ monthly AWS spend",
        "CTOs at cloud-native startups hitting their first major AWS bill milestone",
        "AWS Partners and resellers managing client commitments",
      ],
      monetizationIdeas: [
        "SaaS platform with pricing based on AWS spend under management (0.5-1% of managed spend)",
        "Annual optimization audit with implementation support ($15K-$50K engagements)",
        "Managed savings service: handle all SP purchases for a percentage of achieved savings",
        "API access for custom integrations and FinOps platforms",
      ],
      competitiveNotes: [
        "ProsperOps offers automated SP management but requires full purchasing authority — many enterprises won't delegate this",
        "AWS Cost Explorer has basic SP recommendations but no multi-scenario modeling",
        "Zesty focuses on real-time instance management, not commitment optimization",
        "Gap: No tool provides deterministic showback allocation for multi-account SP sharing",
      ],
      trendHistory: [
        { month: "Jan 2026", mentions: 45, severity: 58 },
        { month: "Feb 2026", mentions: 52, severity: 61 },
        { month: "Mar 2026", mentions: 48, severity: 63 },
        { month: "Apr 2026", mentions: 61, severity: 67 },
        { month: "May 2026", mentions: 58, severity: 70 },
        { month: "Jun 2026", mentions: 72, severity: 75 },
      ],
      nextSteps: [
        "Interview 15+ FinOps practitioners at companies with $1M+ annual AWS spend",
        "Build proof-of-concept using AWS CUR data to model SP allocation across accounts",
        "Create a free SP calculator tool as a lead magnet for the full platform",
        "Develop partnerships with AWS consulting partners for distribution",
        "Publish benchmark report on SP utilization rates across industries",
      ],
    },
    "pp-3": {
      painPoint: {
        PainPointId: "pp-3",
        Title: "Multi-Cloud Cost Visibility Gaps",
        Summary: "Organizations running workloads across AWS, Azure, and GCP lack unified cost visibility, making it impossible to optimize spending holistically or compare true costs across providers.",
        Category: "Cloud Cost Management",
        SeverityScore: 70,
        FrequencyScore: 68,
        WillingnessToPayScore: 84,
        MarketSizeScore: 87,
        TrendScore: 79,
        OpportunityScore: 72,
        FirstSeenAt: "2025-09-03",
        LastSeenAt: "2026-06-20",
        Status: "active",
        TrendDirection: "up",
      },
      aiExplanation: `The multi-cloud cost visibility problem is a growing infrastructure challenge affecting an estimated 76% of enterprises that use two or more cloud providers. Our analysis surfaces a consistent frustration: each cloud provider uses different billing models, SKU naming conventions, and discount structures, making true cost comparison impossible without significant custom engineering effort.

Teams report spending 15-25 hours per month manually reconciling cloud bills, creating custom ETL pipelines to normalize pricing data, and building spreadsheets that are outdated before they're shared. The problem compounds as organizations adopt specialized services — using AWS for compute, Azure for enterprise apps, and GCP for data/ML workloads — each with unique pricing dimensions that defy simple normalization.

The trend score is particularly high because multi-cloud adoption is accelerating, driven by both strategic diversification and M&A activity that brings different cloud ecosystems together. Existing tools like CloudHealth and Flexera attempt to solve this but are expensive ($100K+ annually) and still require significant configuration. The market is ready for a purpose-built, mid-market multi-cloud cost platform with opinionated normalization logic.`,
      sourceExamples: [
        {
          source: "r/devops",
          sourceType: "reddit",
          text: "We use AWS for compute, Azure for O365/AD integration, and GCP for BigQuery. Three billing portals, three different cost allocation tag schemas, three different APIs. I spend every Friday afternoon building a consolidated view in Google Sheets. There has to be a better way.",
          author: "u/multicloud_misery",
          date: "2026-06-08",
          url: "https://reddit.com/r/devops/comments/example8",
        },
        {
          source: "r/finops",
          sourceType: "reddit",
          text: "How do you compare the cost of running a 16-core VM across providers when AWS uses vCPUs, Azure uses ACUs, and GCP uses 'machine types' with custom configurations? We built a normalization layer but it took 3 engineers 2 months and it's already drifting.",
          author: "u/finops_engineer_42",
          date: "2026-05-19",
          url: "https://reddit.com/r/finops/comments/example9",
        },
        {
          source: "Cloud Forum",
          sourceType: "forum",
          text: "After our acquisition, we inherited a GCP environment alongside our existing AWS infrastructure. The CFO wants a single dashboard showing total cloud spend with drill-down by team. Six months later, we're still trying to unify the tagging strategies across both platforms.",
          author: "InfraDirector_Mike",
          date: "2026-04-29",
          url: "https://community.finops.org/example10",
        },
      ],
      similarComplaints: [
        { id: "pp-1", title: "Azure Reserved Instance Cost Surprises", score: 85 },
        { id: "pp-2", title: "AWS Savings Plan Complexity", score: 78 },
        { id: "pp-4", title: "Kubernetes Cost Attribution Failures", score: 70 },
      ],
      productIdeas: [
        {
          name: "CloudUnify — Multi-Cloud Cost Normalization",
          description: "Automated cost normalization platform that ingests billing data from all three major clouds, applies opinionated mapping logic to create apples-to-apples comparisons, and provides unified tagging governance.",
          difficulty: 75,
          revenue: 90,
        },
        {
          name: "MultiCloud Budget Bot",
          description: "Slack/Teams bot that provides daily multi-cloud spend summaries in a unified format, with alerts when any provider's spend deviates from forecast by more than a configurable threshold.",
          difficulty: 40,
          revenue: 55,
        },
      ],
      targetCustomers: [
        "VP of Infrastructure at companies with $2M+ combined cloud spend",
        "FinOps teams at enterprises with 2+ cloud providers",
        "CFOs needing consolidated cloud cost reporting for board presentations",
        "M&A integration teams unifying IT infrastructure post-acquisition",
      ],
      monetizationIdeas: [
        "Platform subscription based on total cloud spend under management ($999-$9,999/mo)",
        "Implementation consulting for tagging strategy unification ($20K-$75K)",
        "Managed multi-cloud FinOps service with monthly optimization reviews",
        "API marketplace for normalized cloud pricing data feeds",
      ],
      competitiveNotes: [
        "CloudHealth/Flexera are comprehensive but priced for Fortune 500 ($100K+ annually)",
        "Infracost focuses on Terraform cost estimation, not actual spend reconciliation",
        "Native cloud tools (AWS Cost Explorer, Azure Cost Management) are single-cloud only by design",
        "Gap: Mid-market companies ($5M-$100M revenue) lack an affordable unified cost platform",
      ],
      trendHistory: [
        { month: "Oct 2025", mentions: 22, severity: 55 },
        { month: "Nov 2025", mentions: 28, severity: 58 },
        { month: "Dec 2025", mentions: 31, severity: 60 },
        { month: "Jan 2026", mentions: 38, severity: 63 },
        { month: "Feb 2026", mentions: 44, severity: 66 },
        { month: "Mar 2026", mentions: 51, severity: 69 },
        { month: "Apr 2026", mentions: 56, severity: 72 },
        { month: "May 2026", mentions: 63, severity: 75 },
        { month: "Jun 2026", mentions: 71, severity: 79 },
      ],
      nextSteps: [
        "Conduct discovery interviews with 10+ multi-cloud FinOps teams",
        "Build a normalization engine MVP supporting AWS + Azure compute SKU mapping",
        "Create a free multi-cloud cost calculator to validate demand and capture leads",
        "Develop integrations with popular IaC tools (Terraform, Pulumi) for proactive cost estimation",
        "Publish a 'Multi-Cloud Cost Complexity Index' report for PR and thought leadership",
      ],
    },
    "pp-4": {
      painPoint: {
        PainPointId: "pp-4",
        Title: "Kubernetes Cost Attribution Failures",
        Summary: "Teams running Kubernetes clusters cannot accurately attribute infrastructure costs to individual services, teams, or customers due to shared resource pools and dynamic scheduling.",
        Category: "Infrastructure & DevOps",
        SeverityScore: 73,
        FrequencyScore: 71,
        WillingnessToPayScore: 76,
        MarketSizeScore: 80,
        TrendScore: 82,
        OpportunityScore: 68,
        FirstSeenAt: "2025-11-07",
        LastSeenAt: "2026-06-22",
        Status: "active",
        TrendDirection: "up",
      },
      aiExplanation: `Kubernetes cost attribution is fundamentally broken for most organizations because the platform was designed for efficient resource sharing, not financial accountability. Our analysis of 1,200+ complaints reveals that the core tension is between Kubernetes' bin-packing efficiency (which saves money) and business requirements for per-service or per-customer cost transparency (which requires clear boundaries).

The problem manifests in three layers: node-level costs that must be split across pods, shared infrastructure costs (load balancers, persistent volumes, cluster management) that defy simple allocation, and the ephemeral nature of pods that makes historical cost tracking a data engineering challenge. Organizations report that their chargeback numbers can vary by 30-50% depending on the allocation methodology used, destroying trust in the data.

This pain point has the highest trend score in our dataset because Kubernetes adoption continues to accelerate while the tooling ecosystem has not kept pace. Kubecost (recently acquired by IBM) is the market leader but organizations report significant accuracy issues with their allocation models, particularly for DaemonSets, Jobs, and multi-tenant namespaces. The window of opportunity is particularly strong for a solution targeting the 70% of Kubernetes users not yet using any cost allocation tool.`,
      sourceExamples: [
        {
          source: "r/kubernetes",
          sourceType: "reddit",
          text: "Our cluster runs 200+ microservices across 3 teams. When finance asks 'how much does Team A's infrastructure cost?', we literally cannot answer with confidence. Node costs, shared services, cluster overhead — the allocation methodology changes the answer by 40%. We've been 'figuring this out' for 18 months.",
          author: "u/k8s_cost_nightmare",
          date: "2026-06-10",
          url: "https://reddit.com/r/kubernetes/comments/example11",
        },
        {
          source: "GitHub Issues",
          sourceType: "github",
          text: "Kubecost allocation for CronJobs is fundamentally inaccurate. Jobs that run for 5 minutes get attributed 24 hours of node cost because the allocation window is daily. For our batch processing workloads, this overestimates costs by 10-20x.",
          author: "platform-eng-lead",
          date: "2026-05-15",
          url: "https://github.com/kubecost/kubecost/issues/example12",
        },
        {
          source: "Cloud Forum",
          sourceType: "forum",
          text: "We tried implementing cost allocation using Prometheus metrics + custom Grafana dashboards. 3 months of engineering time, and the numbers still don't reconcile with our cloud bill. The gap is always 15-25% that we call 'cluster overhead' but nobody can explain.",
          author: "SRE_Platform_Lead",
          date: "2026-04-22",
          url: "https://community.cncf.io/example13",
        },
      ],
      similarComplaints: [
        { id: "pp-3", title: "Multi-Cloud Cost Visibility Gaps", score: 72 },
        { id: "pp-1", title: "Azure Reserved Instance Cost Surprises", score: 85 },
        { id: "pp-5", title: "SaaS License Waste in Enterprise", score: 61 },
      ],
      productIdeas: [
        {
          name: "K8sCostIQ — Intelligent Allocation Engine",
          description: "A Kubernetes cost allocation platform that uses actual resource consumption metrics (CPU seconds, memory-seconds) with configurable allocation rules for shared resources, reconciled against the actual cloud bill to ensure 100% cost coverage.",
          difficulty: 72,
          revenue: 82,
        },
        {
          name: "Namespace Budget Guardian",
          description: "Lightweight Kubernetes operator that enforces per-namespace cost budgets in real-time, automatically throttling or alerting when teams exceed allocated spend based on live resource pricing.",
          difficulty: 55,
          revenue: 65,
        },
      ],
      targetCustomers: [
        "Platform engineering teams at companies with 50+ Kubernetes services",
        "FinOps practitioners responsible for container cost management",
        "Engineering VPs needing per-team infrastructure cost visibility",
        "SaaS companies requiring per-customer infrastructure cost tracking for COGS",
      ],
      monetizationIdeas: [
        "SaaS platform priced per monitored Kubernetes node ($15-$50/node/month)",
        "Enterprise license with custom allocation rule configuration and support",
        "Open-core model: free allocation dashboard, paid reconciliation and forecasting",
        "Consulting engagements for Kubernetes cost optimization ($10K-$30K)",
      ],
      competitiveNotes: [
        "Kubecost (IBM) is the market leader but has known accuracy issues with batch workloads and shared resources",
        "OpenCost is an open-source alternative but requires significant engineering to operationalize",
        "Cloud provider tools (GKE Cost Allocation, EKS Cost Insights) are single-cloud and limited in scope",
        "Gap: Accurate, bill-reconciled cost allocation that handles the edge cases (DaemonSets, Jobs, shared PVs)",
      ],
      trendHistory: [
        { month: "Nov 2025", mentions: 18, severity: 55 },
        { month: "Dec 2025", mentions: 24, severity: 60 },
        { month: "Jan 2026", mentions: 31, severity: 64 },
        { month: "Feb 2026", mentions: 38, severity: 68 },
        { month: "Mar 2026", mentions: 45, severity: 71 },
        { month: "Apr 2026", mentions: 52, severity: 73 },
        { month: "May 2026", mentions: 58, severity: 76 },
        { month: "Jun 2026", mentions: 64, severity: 79 },
      ],
      nextSteps: [
        "Survey Kubernetes users about current cost allocation approaches and pain severity",
        "Build prototype using Prometheus metrics with configurable allocation weights",
        "Create bill reconciliation algorithm that accounts for 100% of cloud spend",
        "Develop Helm chart for easy deployment into existing clusters",
        "Partner with CNCF FinOps community for visibility and validation",
      ],
    },
    "pp-5": {
      painPoint: {
        PainPointId: "pp-5",
        Title: "SaaS License Waste in Enterprise",
        Summary: "Enterprises waste 25-35% of their SaaS spend on unused or underutilized licenses due to lack of visibility into actual usage patterns across hundreds of subscriptions.",
        Category: "SaaS Management",
        SeverityScore: 67,
        FrequencyScore: 74,
        WillingnessToPayScore: 71,
        MarketSizeScore: 89,
        TrendScore: 63,
        OpportunityScore: 61,
        FirstSeenAt: "2025-07-19",
        LastSeenAt: "2026-06-18",
        Status: "monitoring",
        TrendDirection: "stable",
      },
      aiExplanation: `SaaS license waste represents a silent budget drain in enterprise IT. Our analysis of 900+ complaints reveals that the average enterprise with 1,000+ employees maintains 300-500 active SaaS subscriptions, with 25-35% of paid licenses showing zero or minimal usage over a 90-day window. The cumulative waste for a mid-market company typically ranges from $200K-$2M annually.

The root cause is multifaceted: decentralized purchasing (shadow IT), annual contracts that auto-renew without usage review, employee offboarding gaps that leave licenses active, and overlapping tools purchased by different departments for the same function. IT teams report that identifying waste is manual and time-consuming because SaaS vendors intentionally make usage data difficult to extract — it's not in their interest to help customers reduce licenses.

While this is a well-recognized problem, the market remains fragmented with no dominant solution for mid-market companies. Enterprise players like Zylo and Productiv target Fortune 500 accounts ($50K+ ACV), leaving a significant gap for companies with 200-2,000 employees who face the same problem at a smaller but still painful scale. The trend is stable (not declining) because SaaS proliferation continues unabated.`,
      sourceExamples: [
        {
          source: "r/sysadmin",
          sourceType: "reddit",
          text: "Just completed a SaaS audit for our 800-person company. Found 47 people with Zoom Pro licenses who haven't hosted a meeting in 6 months, 23 inactive Figma seats, and THREE different project management tools being paid for by different departments. Total waste: ~$340K/year.",
          author: "u/sysadmin_waste_finder",
          date: "2026-05-30",
          url: "https://reddit.com/r/sysadmin/comments/example14",
        },
        {
          source: "r/ITManagers",
          sourceType: "reddit",
          text: "Our Salesforce contract auto-renewed last week for $890K. We have 500 licenses but our last usage report shows only 312 active users. That's $200K+ in waste but we can't cancel mid-term. Why don't we have a tool that alerts us 90 days before renewal with usage data?",
          author: "u/IT_budget_pain",
          date: "2026-04-14",
          url: "https://reddit.com/r/ITManagers/comments/example15",
        },
        {
          source: "Social Media",
          sourceType: "social",
          text: "Hot take: the average enterprise is paying for 3 overlapping tools in every software category. Three video conferencing tools, three diagramming tools, three note-taking apps. Nobody owns the decision to consolidate because nobody has visibility.",
          author: "@saas_efficiency",
          date: "2026-06-05",
          url: "https://twitter.com/saas_efficiency/example16",
        },
      ],
      similarComplaints: [
        { id: "pp-1", title: "Azure Reserved Instance Cost Surprises", score: 85 },
        { id: "pp-2", title: "AWS Savings Plan Complexity", score: 78 },
        { id: "pp-3", title: "Multi-Cloud Cost Visibility Gaps", score: 72 },
      ],
      productIdeas: [
        {
          name: "LicenseIQ — SaaS Usage Intelligence",
          description: "Automated SaaS discovery and usage monitoring platform that connects via SSO/SCIM, browser extension, and API integrations to measure actual feature-level usage across all subscriptions. Provides renewal countdown alerts with right-sizing recommendations.",
          difficulty: 68,
          revenue: 78,
        },
        {
          name: "RenewalRadar",
          description: "Lightweight tool focused solely on SaaS renewal management: tracks contract dates, alerts stakeholders 90/60/30 days before renewal, and provides a negotiation brief with usage data and market benchmarks.",
          difficulty: 35,
          revenue: 58,
        },
        {
          name: "SaaS Consolidation Advisor",
          description: "AI-powered tool that identifies overlapping SaaS tools across departments, scores consolidation opportunities by potential savings and migration effort, and provides a prioritized consolidation roadmap.",
          difficulty: 50,
          revenue: 70,
        },
      ],
      targetCustomers: [
        "IT Procurement managers at companies with 200-2,000 employees",
        "CFOs seeking to reduce operational software expenses",
        "IT Directors responsible for vendor management and license compliance",
        "HR/People Ops teams managing onboarding/offboarding workflows",
      ],
      monetizationIdeas: [
        "SaaS subscription based on number of employees monitored ($3-$8/employee/month)",
        "Success-based pricing: percentage of identified savings in first year",
        "Annual SaaS audit service with implementation support ($10K-$30K)",
        "Free discovery tool with paid optimization and renewal management features",
      ],
      competitiveNotes: [
        "Zylo and Productiv target enterprise ($50K+ ACV) with full-featured platforms",
        "Torii and Zluri target mid-market but lack depth in usage analytics",
        "BetterCloud focuses on SaaS operations/security, not cost optimization",
        "Gap: Affordable, easy-to-deploy usage monitoring for mid-market with actionable renewal intelligence",
      ],
      trendHistory: [
        { month: "Oct 2025", mentions: 28, severity: 52 },
        { month: "Nov 2025", mentions: 31, severity: 54 },
        { month: "Dec 2025", mentions: 35, severity: 56 },
        { month: "Jan 2026", mentions: 33, severity: 58 },
        { month: "Feb 2026", mentions: 37, severity: 60 },
        { month: "Mar 2026", mentions: 34, severity: 61 },
        { month: "Apr 2026", mentions: 39, severity: 63 },
        { month: "May 2026", mentions: 36, severity: 64 },
        { month: "Jun 2026", mentions: 41, severity: 67 },
      ],
      nextSteps: [
        "Build a free SaaS spend calculator tool to capture leads from IT managers",
        "Develop SSO-based discovery integration (Okta, Azure AD) for quick deployment",
        "Create ROI calculator showing projected savings based on company size and SaaS count",
        "Partner with IT procurement communities and FinOps groups for distribution",
        "Offer free 30-day trial with automatic savings identification report",
      ],
    },
  };

  return data[id] ?? null;
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    monitoring: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    resolved: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.active}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ProblemDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const detail = getProblemDetail(id);

  if (!detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold text-text-primary">Problem not found</h1>
        <p className="text-text-secondary">
          The problem with ID &ldquo;{id}&rdquo; does not exist.
        </p>
        <Link href="/problems" className="btn-primary mt-4">
          ← Back to Problems
        </Link>
      </div>
    );
  }

  const { painPoint, aiExplanation, sourceExamples, similarComplaints, productIdeas, targetCustomers, monetizationIdeas, competitiveNotes, trendHistory, nextSteps } = detail;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-text-muted">
        <Link href="/problems" className="hover:text-text-primary transition-colors">
          Problems
        </Link>
        <span className="mx-2">›</span>
        <span className="text-text-secondary">{painPoint.Title}</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            {painPoint.Title}
          </h1>
          <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {painPoint.Category}
          </span>
          {getStatusBadge(painPoint.Status)}
          <TrendIndicator direction={painPoint.TrendDirection} />
        </div>
        <p className="text-text-secondary max-w-3xl mb-4">{painPoint.Summary}</p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Opportunity Score:</span>
            <ScoreBadge score={painPoint.OpportunityScore} size="lg" />
          </div>
          <div className="text-sm text-text-muted">
            First seen: <span className="text-text-secondary font-medium">{painPoint.FirstSeenAt}</span>
          </div>
          <div className="text-sm text-text-muted">
            Last seen: <span className="text-text-secondary font-medium">{painPoint.LastSeenAt}</span>
          </div>
        </div>
      </header>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Score Breakdown */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Score Breakdown</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ScoreBar score={painPoint.FrequencyScore} label="Frequency Score" />
              <ScoreBar score={painPoint.SeverityScore} label="Severity Score" />
              <ScoreBar score={painPoint.WillingnessToPayScore} label="Willingness to Pay" />
              <ScoreBar score={painPoint.MarketSizeScore} label="Market Size" />
              <ScoreBar score={painPoint.TrendScore} label="Trend Score" />
            </div>
            <div className="mt-6 rounded-lg bg-surface-alt p-4 border border-border">
              <p className="text-xs text-text-muted mb-1">Weighted Formula</p>
              <p className="text-sm text-text-secondary font-mono">
                Opportunity = (Frequency × 0.2) + (Severity × 0.2) + (WTP × 0.25) + (Market × 0.2) + (Trend × 0.15)
              </p>
              <p className="mt-2 text-sm font-semibold text-text-primary">
                Final Score: {painPoint.OpportunityScore}
              </p>
            </div>
          </section>

          {/* AI Analysis */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                <path d="M8 14h8" />
                <path d="M9 18h6" />
              </svg>
              AI-Generated Analysis
            </h2>
            <div className="space-y-4">
              {aiExplanation.split("\n\n").map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed text-text-secondary">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          {/* Source Examples */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Source Examples</h2>
            <div className="space-y-4">
              {sourceExamples.map((example, i) => (
                <div key={i} className="rounded-lg border border-border bg-surface-alt p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SourceIcon type={example.sourceType} className="w-4 h-4 text-text-muted" />
                    <span className="text-xs font-medium text-text-secondary">{example.source}</span>
                    <span className="text-xs text-text-muted">·</span>
                    <span className="text-xs text-text-muted">{example.date}</span>
                  </div>
                  <blockquote className="text-sm text-text-secondary italic border-l-2 border-border pl-3 mb-2">
                    &ldquo;{example.text}&rdquo;
                  </blockquote>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">— {example.author}</span>
                    <a
                      href={example.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-text-primary transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Product Ideas */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Suggested Product Ideas</h2>
            <div className="space-y-4">
              {productIdeas.map((idea, i) => (
                <div key={i} className="rounded-lg border border-border bg-surface-alt p-4">
                  <h3 className="font-semibold text-text-primary mb-1">{idea.name}</h3>
                  <p className="text-sm text-text-secondary mb-3">{idea.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <ScoreBar score={idea.difficulty} label="Difficulty" />
                    <ScoreBar score={idea.revenue} label="Revenue Potential" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Competitive Landscape */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Competitive Landscape</h2>
            <ul className="space-y-2">
              {competitiveNotes.map((note, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-secondary">
                  <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-text-muted" />
                  {note}
                </li>
              ))}
            </ul>
          </section>

          {/* Recommended Next Steps */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Recommended Next Steps</h2>
            <ol className="space-y-3">
              {nextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                    ✓
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-8">
          {/* Trend History Chart */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Trend History</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendHistory} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="mentionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-surface-alt, #1f2937)",
                      border: "1px solid var(--color-border, #374151)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mentions"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#mentionsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-text-muted text-center">Monthly mentions across sources</p>
          </section>

          {/* Related Pain Points */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Related Pain Points</h2>
            <ul className="space-y-3">
              {similarComplaints.map((complaint) => (
                <li key={complaint.id}>
                  <Link
                    href={`/problems/${complaint.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg p-2 -mx-2 hover:bg-surface-alt transition-colors"
                  >
                    <span className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                      {complaint.title}
                    </span>
                    <ScoreBadge score={complaint.score} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Target Customers */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Target Customers</h2>
            <ul className="space-y-2">
              {targetCustomers.map((customer, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {customer}
                </li>
              ))}
            </ul>
          </section>

          {/* Monetization Ideas */}
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Monetization Ideas</h2>
            <ol className="space-y-2">
              {monetizationIdeas.map((idea, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {idea}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
