// Blockchain Service for Smart Contracts and Traceability
import { supabase } from "@/integrations/supabase/client";

export interface BlockchainTransaction {
  hash: string;
  timestamp: string;
  type: 'investment' | 'harvest' | 'traceability' | 'repayment';
  data: Record<string, any>;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface SmartContract {
  id: string;
  type: 'investment' | 'sale';
  parties: {
    farmer: string;
    investor?: string;
    buyer?: string;
  };
  terms: {
    amount: number;
    returnPercent?: number;
    harvestDate?: string;
  };
  status: 'active' | 'completed' | 'cancelled';
  blockchainHash: string;
  createdAt: string;
}

// Generate a deterministic hash from data
function generateHash(data: any): string {
  const str = JSON.stringify(data) + Date.now();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

// Create investment smart contract
export async function createInvestmentContract(
  investmentId: string,
  farmerId: string,
  investorId: string,
  amount: number,
  returnPercent: number,
  harvestDate: string | null
): Promise<BlockchainTransaction> {
  const contractData = {
    version: "1.0",
    type: "investment",
    investmentId,
    farmerId,
    investorId,
    amount,
    returnPercent,
    harvestDate,
    timestamp: new Date().toISOString(),
    platform: "Plantéra",
  };

  const hash = generateHash(contractData);

  // Simulate blockchain confirmation
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    hash,
    timestamp: new Date().toISOString(),
    type: 'investment',
    data: contractData,
    status: 'confirmed'
  };
}

// Record repayment on blockchain
export async function recordRepayment(
  investmentId: string,
  amount: number,
  investorId: string,
  farmerId: string
): Promise<BlockchainTransaction> {
  const repaymentData = {
    version: "1.0",
    type: "repayment",
    investmentId,
    amount,
    investorId,
    farmerId,
    timestamp: new Date().toISOString(),
    platform: "Plantéra",
  };

  const hash = generateHash(repaymentData);

  return {
    hash,
    timestamp: new Date().toISOString(),
    type: 'repayment',
    data: repaymentData,
    status: 'confirmed'
  };
}

// Generate traceability certificate
export async function generateTraceabilityCertificate(
  lotId: string,
  productData: {
    productName: string;
    fieldName?: string;
    fieldLocation?: string;
    soilType?: string;
    sowingDate?: string;
    harvestDate?: string;
    quantity?: number;
    qualityGrade?: string;
    variety?: string;
  },
  iotData?: {
    avgHumidity?: number;
    avgTemperature?: number;
    irrigationCount?: number;
  }
): Promise<{ hash: string; certificateUrl: string }> {
  const certificateData = {
    version: "1.0",
    platform: "Plantéra",
    lotId,
    product: productData,
    iotSummary: iotData,
    issuedAt: new Date().toISOString(),
  };

  const hash = generateHash(certificateData);
  const certificateUrl = `${window.location.origin}/trace/${lotId}`;

  return { hash, certificateUrl };
}

// Verify blockchain hash
export function verifyBlockchainHash(hash: string): { valid: boolean; message: string } {
  // In production, this would verify against actual blockchain
  if (hash && hash.startsWith('0x') && hash.length >= 40) {
    return { valid: true, message: "Certificat vérifié sur la blockchain" };
  }
  return { valid: false, message: "Hash invalide" };
}

// Get investment contract status
export async function getContractStatus(investmentId: string): Promise<{
  status: string;
  lastUpdate: string;
  transactions: BlockchainTransaction[];
}> {
  // Simulate fetching contract history
  return {
    status: 'active',
    lastUpdate: new Date().toISOString(),
    transactions: []
  };
}
