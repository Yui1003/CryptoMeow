export interface GameResult {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  result: number; // 0-1 random value
}

export function generateServerSeed(): string {
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return timestamp + random1 + random2;
}

export function generateClientSeed(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return timestamp + random;
}

// Simple hash function for browser compatibility
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function calculateResult(serverSeed: string, clientSeed: string, nonce: number): number {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = simpleHash(combined);
  
  // Convert first 8 characters of hash to decimal
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt / 0xffffffff; // Normalize to 0-1
}

export function verifyResult(serverSeed: string, clientSeed: string, nonce: number, expectedResult: number): boolean {
  const calculatedResult = calculateResult(serverSeed, clientSeed, nonce);
  return Math.abs(calculatedResult - expectedResult) < 0.0001; // Allow small floating point differences
}

// Game-specific result calculations
export function minesResult(result: number, totalTiles: number, mineCount: number, revealedTiles: number): boolean {
  // Returns true if mine hit
  const safeTiles = totalTiles - mineCount;
  const mineChance = mineCount / (totalTiles - revealedTiles);
  return result < mineChance;
}

export function crashResult(result: number): number {
  // Using house edge formula to generate fair crash points
  const houseEdge = 0.04; // 4% house edge
  const e = 2.718281828459045; // Math.E
  
  // Convert 0-1 result to crash point using inverse formula
  const crash = 1 / (1 - result * (1 - houseEdge));
  
  // Ensure minimum crash point is 1.01x and max is 100x
  return Math.min(Math.max(1.01, crash), 100);
}

export function wheelResult(result: number, segments: number[]): number {
  // Returns index of winning segment
  const totalWeight = segments.reduce((sum, weight) => sum + weight, 0);
  let currentWeight = 0;
  const target = result * totalWeight;
  
  for (let i = 0; i < segments.length; i++) {
    currentWeight += segments[i];
    if (target <= currentWeight) {
      return i;
    }
  }
  return segments.length - 1;
}

export function hiloResult(result: number): number {
  // Returns card value 1-13 (Ace through King)
  return Math.floor(result * 13) + 1;
}

export function diceResult(result: number, min: number = 1, max: number = 100): number {
  // Returns dice roll result in specified range
  return Math.floor(result * (max - min + 1)) + min;
}
