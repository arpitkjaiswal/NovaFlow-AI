export interface PPAResult {
  augmentedSystemPrompt: string;
  augmentedUserContent: string;
  detectedIntent: string;
  detectedLanguage: string | null;
}

export function processPrompt(userPrompt: string): PPAResult {
  const normalized = userPrompt.toLowerCase();
  
  // 1. Intent Detection Heuristics
  let intent = 'GENERAL';
  if (
    normalized.includes('optimize') || 
    normalized.includes('speed up') || 
    normalized.includes('perf') || 
    normalized.includes('fast') || 
    normalized.includes('complexity')
  ) {
    intent = 'OPTIMIZE';
  } else if (
    normalized.includes('bug') || 
    normalized.includes('fix') || 
    normalized.includes('error') || 
    normalized.includes('debug') || 
    normalized.includes('fail') || 
    normalized.includes('wrong')
  ) {
    intent = 'DEBUG';
  } else if (
    normalized.includes('explain') || 
    normalized.includes('how') || 
    normalized.includes('what is') || 
    normalized.includes('why')
  ) {
    intent = 'EXPLAIN';
  } else if (
    normalized.includes('compare') || 
    normalized.includes('vs') || 
    normalized.includes('difference')
  ) {
    intent = 'COMPARE';
  }

  // 2. Language Detection
  let detectedLanguage: string | null = null;
  if (normalized.includes('javascript') || normalized.includes(' js ')) {
    detectedLanguage = 'javascript';
  } else if (normalized.includes('typescript') || normalized.includes(' ts ')) {
    detectedLanguage = 'typescript';
  } else if (normalized.includes('python') || normalized.includes(' py ')) {
    detectedLanguage = 'python';
  } else if (normalized.includes('rust') || normalized.includes(' rs ')) {
    detectedLanguage = 'rust';
  } else if (normalized.includes('cpp') || normalized.includes('c++')) {
    detectedLanguage = 'cpp';
  } else if (normalized.includes('go ') || normalized.includes('golang')) {
    detectedLanguage = 'go';
  }

  // 3. System Prompt Builder
  let systemPrompt = `You are DevFlow AI, an expert, senior software engineer and competitive programmer.
Provide clean, idiomatic, well-commented code. 
Be concise, professional, and explain your reasoning clearly.`;

  if (intent === 'OPTIMIZE') {
    systemPrompt = `You are an expert competitive programmer and performance engineer.
Preserve correctness exactly. Focus on minimizing time complexity (big-O) and space complexity.
Explain your changes clearly and compare the time/space complexity before and after.`;
  } else if (intent === 'DEBUG') {
    systemPrompt = `You are an expert debugger and security researcher.
Analyze the user's code for potential bugs, logical errors, edge cases, race conditions, or performance bottlenecks.
Provide the corrected code, explain the bug(s) identified, and specify the exact lines modified.`;
  } else if (intent === 'EXPLAIN') {
    systemPrompt = `You are an expert software engineering instructor.
Break down complex topics into clean, accessible conceptual steps. Use analogy where helpful.
Provide small, highly readable code examples illustrating your explanations.`;
  } else if (intent === 'COMPARE') {
    systemPrompt = `You are a systems designer and database architect.
Compare the algorithms, patterns, or tools requested with attention to performance, maintainability, scalability, and code size.
Summarize tradeoffs in a clear comparative table.`;
  }

  // 4. Prompt Builder (Augmenting User prompt with helper instructions hidden from the client)
  let augmentedUserContent = userPrompt;
  if (intent === 'OPTIMIZE') {
    augmentedUserContent = `${userPrompt}\n\n[System directive: Ensure you provide the time and space complexity analysis, and write optimized code preserving correctness.]`;
  } else if (intent === 'DEBUG') {
    augmentedUserContent = `${userPrompt}\n\n[System directive: Highlight the root cause of the bug, describe edge cases, and present the fixed code.]`;
  }

  return {
    augmentedSystemPrompt: systemPrompt,
    augmentedUserContent,
    detectedIntent: intent,
    detectedLanguage
  };
}
