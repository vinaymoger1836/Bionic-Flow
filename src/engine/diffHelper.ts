export interface DiffToken {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Computes word-level differences between oldText and newText using LCS algorithm.
 */
export function computeWordDiff(oldText: string, newText: string): DiffToken[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', value: newText }];
  }

  // Tokenize preserving spaces and punctuation
  const tokenize = (str: string): string[] => {
    return str.split(/(\s+|[.,;!?]+)/).filter((t) => t.length > 0);
  };

  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  const n = oldTokens.length;
  const m = newTokens.length;

  // DP table for Longest Common Subsequence (LCS)
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldTokens[i - 1].toLowerCase() === newTokens[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to extract diff tokens
  const result: DiffToken[] = [];
  let i = n;
  let j = m;

  const rawBacktrack: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1].toLowerCase() === newTokens[j - 1].toLowerCase()) {
      rawBacktrack.push({ type: 'unchanged', value: newTokens[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawBacktrack.push({ type: 'added', value: newTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawBacktrack.push({ type: 'removed', value: oldTokens[i - 1] });
      i--;
    }
  }

  rawBacktrack.reverse();

  // Consolidate adjacent tokens of same type
  for (const token of rawBacktrack) {
    const last = result[result.length - 1];
    if (last && last.type === token.type) {
      last.value += token.value;
    } else {
      result.push({ ...token });
    }
  }

  return result;
}
