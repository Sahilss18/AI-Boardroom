import { Claim, Conflict, AgentProposal, EvidenceStatus } from '@reflection-ai/shared';

export const SOURCE_PRIORITY: Record<string, number> = {
  'PDF': 10,
  'PRESENTATION': 10,
  'DOCX': 10,
  'SYSTEM_CONTEXT': 8,
  'USER_SPEECH': 6,
  'AGENT_OBSERVATION': 4
};

export class ConsistencyEngine {
  /**
   * Calculates a relevance score [0.0, 1.0] between a proposal and a claim.
   */
  public static calculateRelevance(proposal: AgentProposal, claim: Claim): number {
    let score = 0;
    const propContentLower = proposal.content.toLowerCase();
    const claimSubjLower = claim.subject.toLowerCase();
    const claimPredLower = claim.predicate.toLowerCase();
    const claimObjLower = claim.object.toLowerCase();

    // 1. Entity Overlap (0.4)
    const relatedEntities: string[] = Array.isArray(proposal.relatedEntities) 
      ? proposal.relatedEntities 
      : [];
    
    const hasEntityOverlap = relatedEntities.some(ent => {
      const entLower = String(ent).toLowerCase();
      return claimObjLower.includes(entLower) || 
             claimSubjLower.includes(entLower) || 
             propContentLower.includes(entLower);
    });

    if (hasEntityOverlap) {
      score += 0.4;
    }

    // 2. Substring Match on Subject/Object (0.3)
    if (propContentLower.includes(claimObjLower) || propContentLower.includes(claimSubjLower)) {
      score += 0.3;
    }

    // 3. Intent/Keyword Overlap (0.3)
    const semanticIntent = (proposal.semanticIntent || '').toLowerCase();
    const keywords = [claimSubjLower, claimPredLower, claimObjLower];
    const hasKeywordOverlap = keywords.some(kw => 
      kw.length > 2 && (semanticIntent.includes(kw) || kw.includes(semanticIntent))
    );
    if (hasKeywordOverlap && semanticIntent.length > 0) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Propagates contradiction status to agent proposals based on semantic relevance.
   */
  public static evaluateProposals(
    proposals: AgentProposal[],
    conflicts: Conflict[],
    claims: Claim[]
  ): AgentProposal[] {
    return proposals.map(prop => {
      // Find any conflicts related to this proposal
      const relatedConflicts = conflicts.filter(conflict => {
        const claimA = claims.find(c => c.id === conflict.claimAId);
        const claimB = claims.find(c => c.id === conflict.claimBId);
        
        const isAContradicted = claimA?.evidenceStatus === 'CONTRADICTED';
        const isBContradicted = claimB?.evidenceStatus === 'CONTRADICTED';

        const relA = claimA ? this.calculateRelevance(prop, claimA) : 0;
        const relB = claimB ? this.calculateRelevance(prop, claimB) : 0;
        
        // A conflict affects the proposal only if the proposal relates to the contradicted claim
        return (isAContradicted && relA >= 0.5) || (isBContradicted && relB >= 0.5);
      });

      if (relatedConflicts.length > 0) {
        // Sort by severity / priority, select highest
        const worstConflict = relatedConflicts.sort((a, b) => {
          const severities: Record<string, number> = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          return (severities[b.severity] || 0) - (severities[a.severity] || 0);
        })[0];

        return {
          ...prop,
          evidenceStatus: 'CONTRADICTED' as EvidenceStatus,
          evidenceCitation: worstConflict.resolution || 'Contradiction detected'
        };
      }

      // Check if it is supported by any claims
      const relatedClaims = claims.filter(c => this.calculateRelevance(prop, c) >= 0.5);
      if (relatedClaims.length > 0) {
        const supportedClaim = relatedClaims.find(c => c.evidenceStatus === 'SUPPORTED');
        if (supportedClaim) {
          return {
            ...prop,
            evidenceStatus: 'SUPPORTED' as EvidenceStatus,
            evidenceCitation: supportedClaim.citation || 'Verified by document source'
          };
        }
      }

      // Check if it is UNKNOWN
      const propContentLower = prop.content.toLowerCase();
      const cacheKeywords = ['redis', 'memcached', 'cache'];
      const hasUnknownKeywords = cacheKeywords.some(kw => propContentLower.includes(kw));
      const hasClaimsWithUnknownKeywords = claims.some(c => 
        c.subject.toLowerCase().includes('redis') || c.object.toLowerCase().includes('redis')
      );
      if (hasUnknownKeywords && !hasClaimsWithUnknownKeywords) {
        return {
          ...prop,
          evidenceStatus: 'UNKNOWN' as EvidenceStatus,
          evidenceCitation: 'No record in the workspace or document metadata'
        };
      }

      // Default is UNRELATED / NOT_AFFECTED
      return {
        ...prop,
        evidenceStatus: 'UNRELATED' as EvidenceStatus
      };
    });
  }
}
