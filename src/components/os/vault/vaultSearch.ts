import {
    VaultItem,
    VaultKnowledgeEntry,
    vaultItemsRegistry,
    vaultKnowledgeRegistry,
  } from '@/data/os/vault';
  
  export type VaultSearchResultType = 'asset' | 'knowledge';
  
  export interface VaultSearchResult {
    id: string;
    resultType: VaultSearchResultType;
    title: string;
    summary: string;
    matchedField: string;
    matchedSnippet: string;
    score: number;
    rawAsset?: VaultItem;
    rawKnowledge?: VaultKnowledgeEntry;
  }
  
  interface SearchVaultParams {
    query: string;
    assets?: VaultItem[];
    knowledge?: VaultKnowledgeEntry[];
  }
  
  export function searchVault({
    query,
    assets = vaultItemsRegistry,
    knowledge = vaultKnowledgeRegistry,
  }: SearchVaultParams): VaultSearchResult[] {
    const normalizedQuery = query.trim().toLowerCase();
  
    if (!normalizedQuery) {
      return [];
    }
  
    const results: VaultSearchResult[] = [];
  
    // Search Assets
    for (const asset of assets) {
      let score = 0;
      let matchedField = '';
      let matchedSnippet = '';
  
      const idLower = asset.id.toLowerCase();
      const nameLower = asset.name.toLowerCase();
      const typeLower = asset.type.toLowerCase();
      const descLower = (asset.description || '').toLowerCase();
      const mimeLower = (asset.mimeType || '').toLowerCase();
      const tagsLower = asset.tags.map((t) => t.toLowerCase());
  
      if (idLower === normalizedQuery) {
        score += 100;
        matchedField = 'ID (Exact)';
        matchedSnippet = asset.id;
      } else if (idLower.includes(normalizedQuery)) {
        score += 80;
        matchedField = 'ID';
        matchedSnippet = asset.id;
      } else if (nameLower === normalizedQuery) {
        score += 90;
        matchedField = 'Name (Exact)';
        matchedSnippet = asset.name;
      } else if (nameLower.includes(normalizedQuery)) {
        score += 70;
        matchedField = 'Name';
        matchedSnippet = asset.name;
      } else if (tagsLower.some((t) => t === normalizedQuery)) {
        score += 60;
        matchedField = 'Tag (Exact)';
        matchedSnippet = asset.tags.filter((t) => t.toLowerCase() === normalizedQuery).join(', ');
      } else if (tagsLower.some((t) => t.includes(normalizedQuery))) {
        score += 50;
        matchedField = 'Tag';
        matchedSnippet = asset.tags.filter((t) => t.toLowerCase().includes(normalizedQuery)).join(', ');
      } else if (typeLower.includes(normalizedQuery)) {
        score += 40;
        matchedField = 'Type';
        matchedSnippet = asset.type;
      } else if (mimeLower.includes(normalizedQuery)) {
        score += 30;
        matchedField = 'MIME Type';
        matchedSnippet = asset.mimeType || '';
      } else if (descLower.includes(normalizedQuery)) {
        score += 20;
        matchedField = 'Description';
        matchedSnippet = asset.description || '';
      }
  
      if (score > 0) {
        results.push({
          id: asset.id,
          resultType: 'asset',
          title: asset.name,
          summary: asset.description || `MIME: ${asset.mimeType || 'N/A'} | Status: ${asset.status}`,
          matchedField,
          matchedSnippet,
          score,
          rawAsset: asset,
        });
      }
    }
  
    // Search Knowledge
    for (const entry of knowledge) {
      let score = 0;
      let matchedField = '';
      let matchedSnippet = '';
  
      const idLower = entry.id.toLowerCase();
      const titleLower = entry.title.toLowerCase();
      const typeLower = entry.type.toLowerCase();
      const summaryLower = entry.summary.toLowerCase();
      const contentLower = entry.content.toLowerCase();
      const tagsLower = entry.tags.map((t) => t.toLowerCase());
  
      if (idLower === normalizedQuery) {
        score += 100;
        matchedField = 'ID (Exact)';
        matchedSnippet = entry.id;
      } else if (idLower.includes(normalizedQuery)) {
        score += 80;
        matchedField = 'ID';
        matchedSnippet = entry.id;
      } else if (titleLower === normalizedQuery) {
        score += 90;
        matchedField = 'Title (Exact)';
        matchedSnippet = entry.title;
      } else if (titleLower.includes(normalizedQuery)) {
        score += 70;
        matchedField = 'Title';
        matchedSnippet = entry.title;
      } else if (tagsLower.some((t) => t === normalizedQuery)) {
        score += 60;
        matchedField = 'Tag (Exact)';
        matchedSnippet = entry.tags.filter((t) => t.toLowerCase() === normalizedQuery).join(', ');
      } else if (tagsLower.some((t) => t.includes(normalizedQuery))) {
        score += 50;
        matchedField = 'Tag';
        matchedSnippet = entry.tags.filter((t) => t.toLowerCase().includes(normalizedQuery)).join(', ');
      } else if (typeLower.includes(normalizedQuery)) {
        score += 40;
        matchedField = 'Type';
        matchedSnippet = entry.type;
      } else if (summaryLower.includes(normalizedQuery)) {
        score += 30;
        matchedField = 'Summary';
        matchedSnippet = entry.summary;
      } else if (contentLower.includes(normalizedQuery)) {
        score += 20;
        matchedField = 'Content';
        matchedSnippet = entry.content;
      }
  
      if (score > 0) {
        results.push({
          id: entry.id,
          resultType: 'knowledge',
          title: entry.title,
          summary: entry.summary,
          matchedField,
          matchedSnippet,
          score,
          rawKnowledge: entry,
        });
      }
    }
  
    return results.sort((a, b) => b.score - a.score);
  }