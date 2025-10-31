import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🚀 naka-reit-kb-bootstrap function loaded');

// Hardcoded seed data to bootstrap QubeBase Core Hub
const SEED_DATA = [
  {
    id: 'reit-fundamentals-overview',
    title: 'REITs: Real Estate Investment Trust Fundamentals',
    section: 'Introduction',
    category: 'reit-basics',
    content: `Real Estate Investment Trusts (REITs) are companies that own, operate, or finance income-producing real estate. They allow investors to earn income from real estate without having to buy or manage properties directly.`,
    keywords: ['REIT', 'Real Estate', 'Investment Trust', 'Fundamentals'],
    connections: [],
    cross_tags: ['basics', 'overview']
  },
  {
    id: 'reit-structure-legal',
    title: 'REIT Structure & Legal Framework',
    section: 'Structure',
    category: 'reit-structure',
    content: `REITs must comply with specific IRS regulations to maintain their tax-advantaged status. Key requirements include distributing at least 90% of taxable income as dividends and investing primarily in real estate assets.`,
    keywords: ['REIT Structure', 'Legal Framework', 'IRS', 'Compliance'],
    connections: ['reit-fundamentals-overview'],
    cross_tags: ['structure', 'legal']
  },
  {
    id: 'operator-iqubes-overview',
    title: 'Operator iQubes: Property Management Framework',
    section: 'Operators',
    category: 'operator-iqubes',
    content: `Operator iQubes represent the operational layer of REIT management, handling day-to-day property operations, tenant relations, and maintenance. They bridge the gap between property ownership and practical management.`,
    keywords: ['Operators', 'iQubes', 'Property Management', 'Operations'],
    connections: ['reit-structure-legal'],
    cross_tags: ['iqubes', 'operators', 'management']
  },
  {
    id: 'shareholder-iqubes-overview',
    title: 'Shareholder iQubes: Investment Framework',
    section: 'Shareholders',
    category: 'shareholder-iqubes',
    content: `Shareholder iQubes define the investment structure and equity distribution within the REIT. They manage ownership rights, dividend distributions, and shareholder governance mechanisms.`,
    keywords: ['Shareholders', 'iQubes', 'Investment', 'Equity'],
    connections: ['reit-structure-legal', 'operator-iqubes-overview'],
    cross_tags: ['iqubes', 'shareholders', 'investment']
  },
  {
    id: 'lender-iqubes-overview',
    title: 'Lender iQubes: Financing Framework',
    section: 'Lenders',
    category: 'lender-iqubes',
    content: `Lender iQubes manage the debt financing aspects of REITs, including loan structures, interest rates, and collateral management. They provide the financial infrastructure for REIT operations.`,
    keywords: ['Lenders', 'iQubes', 'Financing', 'Debt'],
    connections: ['reit-structure-legal', 'shareholder-iqubes-overview'],
    cross_tags: ['iqubes', 'lenders', 'financing']
  },
  {
    id: 'quartz-architecture-overview',
    title: 'Quartz Architecture: Technical Infrastructure',
    section: 'Technology',
    category: 'quartz-architecture',
    content: `Quartz Architecture provides the technical foundation for managing REITs on blockchain. It enables transparent tracking of ownership, automated dividend distributions, and secure transaction processing.`,
    keywords: ['Quartz', 'Architecture', 'Blockchain', 'Infrastructure'],
    connections: ['operator-iqubes-overview', 'shareholder-iqubes-overview', 'lender-iqubes-overview'],
    cross_tags: ['technology', 'blockchain', 'quartz']
  },
  {
    id: 'defi-integration-overview',
    title: 'DeFi Integration: Decentralized Finance Features',
    section: 'DeFi',
    category: 'defi-integration',
    content: `DeFi integration enables REITs to leverage decentralized finance protocols for liquidity provision, yield farming, and automated market making. This creates new opportunities for token holders.`,
    keywords: ['DeFi', 'Decentralized Finance', 'Liquidity', 'Yield'],
    connections: ['quartz-architecture-overview'],
    cross_tags: ['defi', 'finance', 'coyn']
  },
  {
    id: 'collateral-lending-framework',
    title: 'Collateral Lending: Asset-Backed Loans',
    section: 'Lending',
    category: 'collateral-lending',
    content: `Collateral lending allows REIT token holders to use their tokens as collateral for loans without selling their positions. This provides liquidity while maintaining exposure to real estate assets.`,
    keywords: ['Collateral', 'Lending', 'Loans', 'Liquidity'],
    connections: ['lender-iqubes-overview', 'defi-integration-overview'],
    cross_tags: ['lending', 'collateral', 'coyn']
  },
  {
    id: 'recovery-waterfall-mechanism',
    title: 'Recovery Waterfall: Asset Distribution Priority',
    section: 'Recovery',
    category: 'recovery-waterfall',
    content: `The recovery waterfall defines the priority order for distributing assets in case of liquidation or default. It protects different stakeholder classes and ensures fair distribution based on seniority.`,
    keywords: ['Recovery', 'Waterfall', 'Liquidation', 'Priority'],
    connections: ['lender-iqubes-overview', 'shareholder-iqubes-overview'],
    cross_tags: ['recovery', 'protection', 'iqubes']
  },
  {
    id: 'token-economics-overview',
    title: 'Token Economics: REIT Tokenization Model',
    section: 'Tokenomics',
    category: 'token-economics',
    content: `Token economics govern the creation, distribution, and management of REIT tokens. This includes supply mechanisms, dividend distribution formulas, and token utility features.`,
    keywords: ['Tokenomics', 'Token Economics', 'Supply', 'Distribution'],
    connections: ['shareholder-iqubes-overview', 'quartz-architecture-overview'],
    cross_tags: ['tokens', 'economics', 'coyn']
  },
  {
    id: 'compliance-regulatory-framework',
    title: 'Compliance & Regulatory Framework',
    section: 'Compliance',
    category: 'compliance',
    content: `Compliance framework ensures REITs meet all regulatory requirements including SEC regulations, tax compliance, and investor protection laws. It covers KYC/AML procedures and reporting obligations.`,
    keywords: ['Compliance', 'Regulatory', 'SEC', 'Legal'],
    connections: ['reit-structure-legal', 'shareholder-iqubes-overview'],
    cross_tags: ['compliance', 'legal', 'regulation']
  },
  {
    id: 'dividend-distribution-mechanism',
    title: 'Dividend Distribution: Automated Payment System',
    section: 'Dividends',
    category: 'shareholder-iqubes',
    content: `Automated dividend distribution leverages smart contracts to distribute rental income to token holders proportionally. Payments occur on predetermined schedules without manual intervention.`,
    keywords: ['Dividends', 'Distribution', 'Automation', 'Income'],
    connections: ['shareholder-iqubes-overview', 'quartz-architecture-overview'],
    cross_tags: ['dividends', 'income', 'shareholders']
  },
  {
    id: 'property-valuation-methods',
    title: 'Property Valuation: Appraisal & Assessment',
    section: 'Valuation',
    category: 'reit-basics',
    content: `Property valuation methods include income capitalization, comparable sales analysis, and cost approach. Regular valuations ensure accurate token pricing and NAV calculations.`,
    keywords: ['Valuation', 'Appraisal', 'NAV', 'Pricing'],
    connections: ['reit-fundamentals-overview', 'token-economics-overview'],
    cross_tags: ['valuation', 'pricing']
  },
  {
    id: 'liquidity-pools-management',
    title: 'Liquidity Pools: Market Making Infrastructure',
    section: 'Liquidity',
    category: 'defi-integration',
    content: `Liquidity pools enable continuous trading of REIT tokens by providing automated market making. Token holders can provide liquidity and earn fees from trading activity.`,
    keywords: ['Liquidity Pools', 'AMM', 'Market Making', 'Trading'],
    connections: ['defi-integration-overview', 'token-economics-overview'],
    cross_tags: ['liquidity', 'defi', 'coyn']
  },
  {
    id: 'governance-voting-system',
    title: 'Governance & Voting: Shareholder Rights',
    section: 'Governance',
    category: 'shareholder-iqubes',
    content: `Token-based governance allows shareholders to vote on key decisions including property acquisitions, major renovations, and operational changes. Voting power is proportional to token holdings.`,
    keywords: ['Governance', 'Voting', 'Decisions', 'Rights'],
    connections: ['shareholder-iqubes-overview', 'quartz-architecture-overview'],
    cross_tags: ['governance', 'voting', 'shareholders']
  },
  {
    id: 'insurance-risk-management',
    title: 'Insurance & Risk Management',
    section: 'Risk',
    category: 'operator-iqubes',
    content: `Comprehensive insurance coverage protects properties against damages, liability claims, and operational risks. Risk management strategies include diversification and hedging mechanisms.`,
    keywords: ['Insurance', 'Risk Management', 'Protection', 'Coverage'],
    connections: ['operator-iqubes-overview', 'recovery-waterfall-mechanism'],
    cross_tags: ['insurance', 'risk', 'protection']
  },
  {
    id: 'tenant-management-system',
    title: 'Tenant Management: Lease & Relations',
    section: 'Tenants',
    category: 'operator-iqubes',
    content: `Tenant management systems handle lease agreements, rent collection, maintenance requests, and tenant communications. Efficient management ensures stable occupancy and cash flow.`,
    keywords: ['Tenants', 'Leases', 'Management', 'Occupancy'],
    connections: ['operator-iqubes-overview', 'dividend-distribution-mechanism'],
    cross_tags: ['tenants', 'operations', 'management']
  },
  {
    id: 'tax-optimization-strategies',
    title: 'Tax Optimization: REIT Tax Benefits',
    section: 'Tax',
    category: 'compliance',
    content: `REITs enjoy pass-through taxation status, avoiding corporate income tax by distributing 90% of taxable income. Shareholders pay taxes on dividends at their individual rates.`,
    keywords: ['Tax', 'Optimization', 'Benefits', 'Pass-through'],
    connections: ['compliance-regulatory-framework', 'dividend-distribution-mechanism'],
    cross_tags: ['tax', 'compliance', 'benefits']
  }
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { force_bootstrap } = await req.json();

    console.log('🌱 Starting QubeBase Core Hub bootstrap process...');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize local Supabase client to check user role
    const localSupabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const localSupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const localSupabase = createClient(localSupabaseUrl, localSupabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await localSupabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user is uber_admin
    const { data: roleData, error: roleError } = await localSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'uber_admin')
      .single();

    if (roleError || !roleData) {
      throw new Error('Only uber admins can bootstrap QubeBase');
    }

    console.log(`👤 Uber admin ${user.id} initiating bootstrap`);

    // Initialize QubeBase Core Hub client
    const coreSupabaseUrl = Deno.env.get('CORE_SUPABASE_URL')!;
    const coreSupabaseKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY')!;
    const coreSupabase = createClient(coreSupabaseUrl, coreSupabaseKey);

    console.log('🔗 Connected to QubeBase Core Hub');

    // Check if QubeBase already has REIT docs/items (with fallback)
    let existingCount = 0;
    // Try legacy 'docs' table first
    const { error: checkErrorDocs, count: countDocs } = await coreSupabase
      .from('docs')
      .select('id', { count: 'exact', head: true })
      .eq('scope', 'tenant')
      .eq('tenant_id', 'aigent-jmo');

    if (checkErrorDocs) {
      console.error('❌ Error checking existing docs:', checkErrorDocs);
      if (
        checkErrorDocs.code === 'PGRST205' ||
        (checkErrorDocs.message || '').includes('Could not find the table')
      ) {
        console.log('↩️ Falling back to Core Hub table: reit_knowledge_items for existence check');
        const { error: checkErrorItems, count: countItems } = await coreSupabase
          .from('reit_knowledge_items')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true);
        if (checkErrorItems) {
          console.error('❌ Error checking existing items:', checkErrorItems);
          throw new Error(`Failed to check existing items: ${checkErrorItems.message}`);
        }
        existingCount = countItems || 0;
      } else {
        throw new Error(`Failed to check existing docs: ${checkErrorDocs.message}`);
      }
    } else {
      existingCount = countDocs || 0;
    }

    if (existingCount > 0 && !force_bootstrap) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'QubeBase already contains REIT KB documents. Use force_bootstrap=true to override.',
          existing_count: existingCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Bootstrapping ${SEED_DATA.length} seed documents to QubeBase...`);

    // Transform seed data to ingest format expected by Core Hub
    const transformedItems = SEED_DATA.map(item => ({
      title: item.title,
      content: item.content,
      metadata: {
        reit_id: item.id,
        section: item.section,
        category: item.category,
        keywords: item.keywords,
        connections: item.connections,
        cross_tags: item.cross_tags,
        source: 'Bootstrap Seed Data'
      }
    }));

    // Get Core Hub URL and sync token
    const coreHubUrl = Deno.env.get('CORE_SUPABASE_URL');
    const syncToken = Deno.env.get('SYNC_SECRET_TOKEN');

    if (!coreHubUrl) {
      throw new Error('CORE_SUPABASE_URL environment variable not set');
    }
    if (!syncToken) {
      throw new Error('SYNC_SECRET_TOKEN environment variable not set');
    }

    // Insert seed data via Core Hub ingest endpoint
    const ingestUrl = `${coreHubUrl}/functions/v1/naka-reit-kb-ingest`;
    console.log(`🚀 Sending seed data to Core Hub ingest: ${ingestUrl}`);

    const ingestResponse = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${syncToken}`,
      },
      body: JSON.stringify({
        items: transformedItems,
        force_update: !!force_bootstrap
      })
    });

    if (!ingestResponse.ok) {
      const errorText = await ingestResponse.text();
      console.error('❌ Ingest failed:', errorText);
      throw new Error(`Failed to insert seed data via ingest: ${ingestResponse.status} ${errorText}`);
    }

    const ingestResult = await ingestResponse.json();
    const insertedCount = ingestResult?.inserted ?? ingestResult?.upserted ?? SEED_DATA.length;

    console.log(`✅ Successfully bootstrapped ${insertedCount} documents to QubeBase via ingest`);

    // Background task: Automatically pull the seeded data to local database
    const pullToLocal = async () => {
      try {
        console.log('🔄 Auto-pulling seeded data to local database...');

        // Fetch from Core Hub with fallback (docs -> reit_knowledge_items)
        let coreDocs: any[] | null = null;

        const { data: docsData, error: docsError } = await coreSupabase
          .from('docs')
          .select('*')
          .eq('scope', 'tenant')
          .eq('tenant_id', 'aigent-jmo')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (docsError) {
          console.error('❌ Error fetching for auto-pull (docs):', docsError);
          if (
            docsError.code === 'PGRST205' ||
            (docsError.message || '').includes('Could not find the table')
          ) {
            console.log('↩️ Falling back to Core Hub table: reit_knowledge_items (auto-pull)');
            const { data: itemsData, error: itemsError } = await coreSupabase
              .from('reit_knowledge_items')
              .select('*')
              .eq('is_active', true)
              .order('created_at', { ascending: true });

            if (itemsError) {
              console.error('❌ Error fetching items for auto-pull:', itemsError);
              return;
            }
            coreDocs = itemsData || [];
          } else {
            return;
          }
        } else {
          coreDocs = docsData || [];
        }

        const transformedDocs = coreDocs.map((doc: any) => {
          const isDocsFormat = typeof doc?.metadata === 'object' && doc.metadata !== null;
          const title = isDocsFormat ? (doc.metadata?.title ?? doc.id) : (doc.title ?? doc.id);
          const section = isDocsFormat ? (doc.metadata?.section ?? 'General') : (doc.section ?? 'General');
          const category = isDocsFormat ? (doc.metadata?.category ?? 'reit-basics') : (doc.category ?? 'reit-basics');
          const keywords = (isDocsFormat ? doc.metadata?.keywords : doc.keywords) ?? [];
          const connections = (isDocsFormat ? doc.metadata?.connections : doc.connections) ?? [];
          const cross_tags = (isDocsFormat ? doc.metadata?.cross_tags : doc.cross_tags) ?? [];
          const source = (isDocsFormat ? doc.metadata?.source : doc.source) ?? 'QubeBase Core Hub';

          return {
            reit_id: doc.reit_id ?? doc.id,
            qubebase_doc_id: doc.qubebase_doc_id ?? doc.id,
            title,
            content: doc.content ?? '',
            section,
            category,
            keywords,
            connections,
            cross_tags,
            source,
            timestamp: doc.created_at ?? new Date().toISOString(),
            is_active: true,
            is_seed_record: doc.is_seed_record ?? true,
            approval_status: doc.approval_status ?? 'approved',
            last_synced_at: new Date().toISOString(),
            created_by: doc.created_by ?? null,
            updated_by: doc.updated_by ?? null,
          };
        });

        const { error: upsertError } = await localSupabase
          .from('reit_knowledge_items')
          .upsert(transformedDocs, {
            onConflict: 'qubebase_doc_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('❌ Error in auto-pull to local:', upsertError);
        } else {
          console.log(`✅ Auto-pulled ${transformedDocs.length} documents to local database`);
        }
      } catch (error) {
        console.error('❌ Error in pullToLocal background task:', error);
      }
    };

    // Start background pull without blocking response
    pullToLocal().catch(err => {
      console.error('❌ Error in background pull task:', err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bootstrapped ${insertedCount} seed documents to QubeBase`,
        bootstrapped: insertedCount,
        ingest_result: ingestResult,
        auto_pull_initiated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in naka-reit-kb-bootstrap:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
