import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Bulk sync JMO REIT Knowledge Base to QubeBase Core Hub
 * This edge function uploads all REIT KB cards to the kb.docs table
 * with proper tenant scoping (tenant_id = 'aigent-jmo')
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use Core Hub credentials
    const coreUrl = Deno.env.get('CORE_SUPABASE_URL')!;
    const coreServiceKey = Deno.env.get('CORE_SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(coreUrl, coreServiceKey);

    const { force_update = false } = await req.json();
    
    console.log(`🚀 Starting JMO REIT KB sync to QubeBase (force_update: ${force_update})`);

    // Get the root corpus ID
    const { data: corpus, error: corpusError } = await supabase
      .from('kb.corpora')
      .select('id')
      .eq('app', 'nakamoto')
      .eq('name', 'Root')
      .single();

    if (corpusError || !corpus) {
      throw new Error(`Root corpus not found: ${corpusError?.message || 'Unknown error'}`);
    }

    console.log(`✅ Found root corpus: ${corpus.id}`);

    // REIT Knowledge Base Data - 18 cards
    const reitKBData = [
      {
        title: 'REITs: The First Decentralized Asset',
        content_text: `REITs (Real Estate Investment Trusts) represent the first decentralized asset class that Satoshi Nakamoto understood when architecting the Bitcoin protocol. The structural requirements of REITs provide a blueprint for decentralized governance and value distribution:

**Mandatory Distribution Requirements:**
- REITs must distribute 90% of their net income annually to shareholders, ensuring value flows to token holders
- This distribution mechanism inspired Bitcoin's predictable emission schedule and fair value distribution

**Decentralization Requirements:**
- REITs must have a minimum of 100 shareholders, preventing centralization of control
- 5 or fewer shareholders cannot own more than 50% of the REIT (cannot be closely held)
- These requirements parallel Bitcoin's distributed mining model and resistance to centralization

**Asset-Backing Requirements:**
- 75% of REIT assets and income must be derived from real estate
- This establishes a clear link between the investment vehicle and underlying real-world value
- Similar to how Bitcoin's value is backed by computational work and energy investment

**Regulatory Compliance:**
- REITs operate within established regulatory frameworks (SEC, FINRA, IRS)
- This provides a template for how decentralized assets can achieve regulatory compliance while maintaining their core principles

The REIT structure demonstrates that decentralization, fair distribution, and regulatory compliance are not mutually exclusive—a lesson central to the Quartz/iQube strategy for bringing real-world assets to DeFi.`,
        tags: ['reit', 'decentralization', 'bitcoin', 'compliance', 'iqubes'],
        category: 'reit-structure'
      },
      {
        title: 'REITQubes: Operator iQubes Architecture',
        content_text: `Operator iQubes form the foundation of the Quartz/iQube RWA integrity layer, containing all sensitive REIT operational data in secure, encrypted vaults that enable verifiable data feeds without compromising privacy.

**Rent Roll Data:** Tenant information, lease agreements, payment history, vacancy rates
**Property Information:** Legal descriptions, title reports, appraisals, maintenance records
**Cap Table & Shareholder Registry:** Complete shareholder list, ownership percentages, distribution records
**Financial Information:** Revenue streams, operating expenses, tax liabilities, treasury management
**Regulatory Filings:** SEC reports (10-K, 10-Q), FINRA compliance, IRS filings (Form 1120-REIT)

All data is encrypted using blakQube subdivision, with metadata exposed through metaQubes and access controlled via tokenQubes.`,
        tags: ['reit', 'operator', 'iqubes', 'dvn-oracle', 'data-vault'],
        category: 'operator-iqubes'
      },
      {
        title: 'REITQubes: Shareholder iQubes Architecture',
        content_text: `Shareholder iQubes serve as the Accreditation Pass, containing encrypted personal financial data that generates Zero-Knowledge Proofs (ZKPs) of accredited investor status.

**Personal Details:** Identity management with encrypted storage
**Financial Information:** Bank statements, investment accounts, income documentation for accreditation verification
**Web3 Integration:** Wallet addresses and transaction history
**REIT Investment Records:** Share ownership, dividend history, tax documents
**Zero-Knowledge Proof Generation:** Attests "Accredited Investor: True" without revealing income/net worth

These VCs enable shareholders to access private capital DeFi pools while maintaining complete privacy.`,
        tags: ['reit', 'shareholder', 'iqubes', 'zkp', 'accreditation', 'privacy'],
        category: 'shareholder-iqubes'
      },
      {
        title: 'REITQubes: Lender iQubes Architecture',
        content_text: `Lender iQubes contain comprehensive information about capital providers in the Quartz DeFi lending ecosystem.

**Lender Identity:** Legal entity details, regulatory licenses, credit ratings
**Capital Information:** Total available capital, loan volume, default rates, collection statistics
**Loan Product Details:** Types of loans, terms, collateral requirements, LTV ratios
**Web3 & Banking Integration:** Traditional banking and stablecoin wallet addresses
**Regulatory Compliance:** Lending licenses, AML/KYC procedures
**Risk Management:** Underwriting criteria, portfolio limits, stress testing

Enables transparent risk assessment and capital allocation while protecting proprietary strategies.`,
        tags: ['reit', 'lender', 'iqubes', 'defi-lending', 'risk-management'],
        category: 'lender-iqubes'
      },
      {
        title: 'Quartz: The Integrity Layer for Real-World Assets',
        content_text: `Quartz is the crypto-native data standard that solves the RWA industry's two biggest problems: privacy and verifiable, real-time data for DeFi integration.

**The Core Problem:** DeFi needs institutional-grade data but REITs cannot provide it without breaking privacy, regulations, or competitive advantage.

**The Quartz Solution:**
- iQubes: Secure encrypted data vaults with public metadata and dynamic access control
- Verifiable Income-Backed Tokens (REIT COYN): Tokenize cash flow, not equity shares
- DVN Oracles: Real-time financial metrics without exposing underlying data

**Key Innovation:** Data verification without equity tokenization - keeps REIT shares as traditional securities while verifying their data cryptographically.

Positions Quartz as essential infrastructure enabling REITs to participate in DeFi with regulatory compliance.`,
        tags: ['reit', 'quartz', 'iqubes', 'rwa', 'defi', 'integrity-layer'],
        category: 'quartz-architecture'
      },
      {
        title: 'REIT COYN: Verifiable Income-Backed Token',
        content_text: `REIT COYN enables REIT operators to unlock DeFi liquidity by tokenizing verifiable rental cash flow.

**Mechanism:** Segregated Vaulted Rent Cash Flow account monitored by Aigent JMO
**Minting:** $0.70 REIT COYN per $1.00 of verified unencumbered rent flow
**Utility:** Liquid collateral for borrowing stablecoins from DeFi pools
**Legal Structure:** NOT a security - claim on cash flow, not equity

Allows REITs to tap DeFi capital markets without tokenizing equity shares.`,
        tags: ['reit', 'coyn', 'token', 'cash-flow', 'defi-liquidity'],
        category: 'token-economics'
      },
      {
        title: 'DVN Oracle: Decentralized Valuation Network',
        content_text: `The Valuation iQube (DVN Oracle) publishes real-time REIT financial metrics to blockchain for DeFi integration.

**Published Metrics:**
- Net Asset Value (NAV): Total property value minus liabilities
- Funds From Operations (FFO) per Share: Industry-standard profitability metric
- Verifiable Dividend Yield (VDY): Annual distribution percentage
- Debt Service Coverage Ratio (DSCR): Ability to service debt
- Occupancy and Vacancy Rates: Property utilization metrics

All metrics cryptographically signed and blockchain-anchored for tamper-proof verification.`,
        tags: ['reit', 'dvn-oracle', 'iqubes', 'nav', 'ffo', 'valuation'],
        category: 'defi-integration'
      },
      {
        title: 'DeFi Collateralized Lending: Primary Revenue Model',
        content_text: `High-throughput, secure borrowing facility generating recurring SaaS revenue.

**Process:** Pledge REIT COYN → Oracle validates financials → Automated underwriting → Stablecoin disbursement

**SaaS Revenue:**
- Annual Data Integrity Fee for iQube maintenance
- Transaction Fee (0.5-1% of loan amount)
- Ongoing Monitoring Fee for oracle updates
- Per-Query Fee for DeFi protocol data access

Creates high-margin recurring revenue while providing REITs with global DeFi capital access.`,
        tags: ['reit', 'defi', 'lending', 'coyn', 'saas-revenue'],
        category: 'collateral-lending'
      },
      {
        title: 'Shareholder Private Capital Access: B2B2C Model',
        content_text: `Privacy-preserving access to private capital DeFi pools using Shareholder iQubes.

**Process:**
1. Upload financial docs to encrypted Shareholder iQube
2. Generate Zero-Knowledge Proof: "Accredited: True"
3. Present VC to DeFi pool smart contract
4. Access unlocked without revealing sensitive data

**Revenue:** Investor fees per VC generation, platform licensing, enterprise integration, subscriptions.

Solves major pain point in private capital markets with scalable privacy-first model.`,
        tags: ['reit', 'shareholder', 'iqubes', 'zkp', 'b2b2c', 'accreditation'],
        category: 'shareholder-iqubes'
      },
      {
        title: 'Quantum-Proof Default Recovery Waterfall',
        content_text: `Comprehensive recovery mechanism transitioning from on-chain automation to legal enforcement.

**Stage 1:** Automated covenant breach detection via smart contract
**Stage 2:** Automatic REIT COYN liquidation on DEXs
**Stage 3:** ZKP key transfer to Legal Enforcement Agent for iQube access
**Stage 4:** Cash redemption from Vaulted account, foreclosure if needed

All cryptographic proofs use post-quantum algorithms ensuring quantum-resistant security.`,
        tags: ['reit', 'recovery', 'default', 'iqubes', 'coyn', 'quantum-proof'],
        category: 'recovery-waterfall'
      },
      {
        title: 'Quartz Synergistic Framework: JMO KNYT Integration',
        content_text: `Full realization of JMO KNYT vision integrating multiple blockchain innovations.

**Components:**
- SatoshiKNYT#2 (Aigent JMO): Continuous monitoring and attestation
- iQube Protocol: Secure data vaults for all stakeholders
- QryptoCENT: Micro-stable coin for precise pricing
- REIT COYN: Income-backed tokenization
- Quartz Integrity Layer: Unified protocol for RWA verification

Demonstrates that Integrity, Knowledge, and Emerging Technology can coexist with regulatory compliance.`,
        tags: ['reit', 'quartz', 'iqubes', 'coyn', 'jmo-knyt', 'integration'],
        category: 'quartz-architecture'
      },
      {
        title: 'REIT Regulatory Compliance Framework',
        content_text: `Comprehensive compliance across all jurisdictions.

**SEC Compliance:** REITs remain registered securities, REIT COYN structured as commodity (not security)
**FINRA Compliance:** No unlicensed securities trading
**IRS Tax Compliance:** 90% distribution maintained, interest deductible
**Data Privacy:** GDPR/CCPA compliant with encryption and consent management

Ensures Quartz enhances regulatory protections rather than circumventing them.`,
        tags: ['reit', 'compliance', 'sec', 'finra', 'irs', 'regulatory'],
        category: 'compliance'
      },
      {
        title: 'REIT DeFi Integration: Practical Use Cases',
        content_text: `Real-world applications demonstrating operational value.

**Use Cases:**
1. Acquisition Financing: Fast property purchases with DeFi loans
2. Capital Improvement Funding: Renovation financing without equity dilution
3. Dividend Smoothing: Short-term liquidity for consistent distributions
4. Tax-Loss Harvesting: Refinancing instead of selling underperforming properties
5. Investor Liquidity: Personal loans against REIT shares
6. Cross-Border Investment: Global capital access without FX spreads
7. ESG Compliance: Automated sustainability reporting

Solves real operational challenges REITs face daily.`,
        tags: ['reit', 'defi', 'use-cases', 'coyn', 'practical'],
        category: 'defi-integration'
      },
      {
        title: 'Quartz Competitive Advantages in RWA Market',
        content_text: `Unique differentiators in the RWA tokenization space.

**Key Advantages:**
1. Data verification vs asset tokenization (avoids securities regulations)
2. Privacy-first architecture with ZKPs
3. Cash flow tokenization, not equity
4. Multi-stakeholder iQube system
5. Native DVN Oracle network
6. Legal enforceability framework
7. Quantum-resistant cryptography

**Market Position:** Not a competitor to REITs or DeFi—an enabling infrastructure layer.

**TAM:** $4T+ US REITs, $30T global commercial real estate, $50B+ DeFi lending.`,
        tags: ['reit', 'quartz', 'competitive', 'rwa', 'market'],
        category: 'quartz-architecture'
      },
      {
        title: 'Aigent JMO: The REIT Intelligence Layer',
        content_text: `AI-powered automation ensuring continuous data integrity and proactive risk management.

**Core Functions:**
- Vaulted Cash Flow Monitoring (24/7 attestation)
- Rent Roll Validation (payment verification)
- DVN Oracle Updates (metric calculations)
- Risk Assessment & Early Warning (trend analysis)
- Regulatory Compliance Automation (SEC/IRS filings)
- Liquidation Optimization (Aigent MoneyPenny)
- Shareholder Communication (automated updates)

**AI Capabilities:** NLP for document extraction, ML for predictions, anomaly detection for fraud prevention.

Transforms REITs into real-time, data-driven operations with 99.9% uptime.`,
        tags: ['reit', 'aigent-jmo', 'iqubes', 'ai', 'automation', 'monitoring'],
        category: 'quartz-architecture'
      },
      {
        title: 'Quartz Development Roadmap & Milestones',
        content_text: `Phased approach from pilot to industry standard.

**Phase 1 (Months 1-6):** Foundation - core infrastructure, legal framework, pilot REIT onboarded
**Phase 2 (Months 7-12):** Pilot Launch - first REIT live, DeFi loans originated, case study published
**Phase 3 (Year 2):** Expansion - 5-10 REITs, shareholder marketplace, 3-5 DeFi integrations
**Phase 4 (Year 3):** Institutionalization - 25+ REITs, SEC engagement, insurance products, international expansion
**Phase 5 (Year 4+):** Asset Class Expansion - equipment leases, receivables, royalties, infrastructure

**Long-term Vision:** Standard integrity layer for all RWA in DeFi with trillions in verified data.`,
        tags: ['reit', 'quartz', 'roadmap', 'milestones', 'strategy'],
        category: 'quartz-architecture'
      }
    ];

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Process each KB card
    for (const card of reitKBData) {
      try {
        // Check if doc already exists
        const { data: existing } = await supabase
          .from('kb.docs')
          .select('id, version')
          .eq('corpus_id', corpus.id)
          .eq('scope', 'tenant')
          .eq('tenant_id', 'aigent-jmo')
          .eq('title', card.title)
          .single();

        if (existing && !force_update) {
          console.log(`⏭️  Skipping existing doc: "${card.title}"`);
          results.skipped++;
          continue;
        }

        if (existing && force_update) {
          // Update existing doc
          const { error: updateError } = await supabase
            .from('kb.docs')
            .update({
              content_text: card.content_text,
              tags: card.tags,
              metadata: { category: card.category },
              version: existing.version + 1
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          
          // Enqueue for reindexing
          await supabase
            .from('kb.reindex_queue')
            .insert({
              doc_id: existing.id,
              action: 'upsert'
            });

          console.log(`✏️  Updated doc: "${card.title}" (v${existing.version + 1})`);
          results.updated++;
        } else {
          // Insert new doc
          const { data: inserted, error: insertError } = await supabase
            .from('kb.docs')
            .insert({
              corpus_id: corpus.id,
              scope: 'tenant',
              tenant_id: 'aigent-jmo',
              title: card.title,
              content_text: card.content_text,
              source_uri: 'JMO REIT Strategy Document v1.0',
              lang: 'en',
              tags: card.tags,
              metadata: { category: card.category },
              is_active: true,
              version: 1
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Enqueue for reindexing
          await supabase
            .from('kb.reindex_queue')
            .insert({
              doc_id: inserted.id,
              action: 'upsert'
            });

          console.log(`➕ Created doc: "${card.title}"`);
          results.created++;
        }
      } catch (error: any) {
        console.error(`❌ Error processing "${card.title}":`, error.message);
        results.errors.push(`${card.title}: ${error.message}`);
      }
    }

    console.log(`✅ Sync complete - Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `JMO REIT KB sync complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Sync function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
