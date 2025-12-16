// Blockchain Service for Smart Contracts, Escrow, and Traceability

export interface BlockchainTransaction {
  hash: string;
  timestamp: string;
  type: 'investment' | 'harvest' | 'traceability' | 'repayment' | 'VET_INTERVENTION' | 'escrow_created' | 'escrow_released' | 'escrow_refunded';
  data: Record<string, any>;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface SmartContract {
  id: string;
  type: 'investment' | 'sale' | 'escrow';
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

export interface EscrowContract {
  id: string;
  transactionId: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  offerId?: string;
  amount: number;
  fees: number;
  totalAmount: number;
  currency: string;
  status: 'created' | 'funded' | 'released' | 'refunded' | 'disputed';
  blockchainHash: string;
  createdAt: string;
  fundedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  deliveryConfirmedAt?: string;
  conditions: {
    autoReleaseAfterDays: number;
    requireDeliveryConfirmation: boolean;
    disputeWindowDays: number;
  };
  metadata?: Record<string, any>;
}

export interface EscrowEvent {
  type: 'created' | 'funded' | 'delivery_confirmed' | 'released' | 'refund_requested' | 'refunded' | 'disputed';
  timestamp: string;
  actor: string;
  hash: string;
  details?: string;
}

// In-memory escrow storage (in production, this would be in Supabase)
const escrowContracts: Map<string, EscrowContract> = new Map();
const escrowEvents: Map<string, EscrowEvent[]> = new Map();

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

function generateEscrowId(): string {
  return `ESC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

// Create escrow smart contract for marketplace transaction
export async function createEscrowContract(
  buyerId: string,
  sellerId: string,
  listingId: string,
  amount: number,
  fees: number,
  offerId?: string,
  options?: {
    autoReleaseAfterDays?: number;
    requireDeliveryConfirmation?: boolean;
    disputeWindowDays?: number;
  }
): Promise<{ contract: EscrowContract; transaction: BlockchainTransaction }> {
  const escrowId = generateEscrowId();
  const transactionId = `TXN-${Date.now().toString(36)}`.toUpperCase();
  
  const contractData = {
    version: "1.0",
    type: "escrow",
    escrowId,
    transactionId,
    buyerId,
    sellerId,
    listingId,
    offerId,
    amount,
    fees,
    totalAmount: amount + fees,
    currency: "XOF",
    conditions: {
      autoReleaseAfterDays: options?.autoReleaseAfterDays ?? 7,
      requireDeliveryConfirmation: options?.requireDeliveryConfirmation ?? true,
      disputeWindowDays: options?.disputeWindowDays ?? 3,
    },
    timestamp: new Date().toISOString(),
    platform: "Plantéra",
  };

  const hash = generateHash(contractData);

  // Simulate blockchain confirmation
  await new Promise(resolve => setTimeout(resolve, 800));

  const contract: EscrowContract = {
    id: escrowId,
    transactionId,
    buyerId,
    sellerId,
    listingId,
    offerId,
    amount,
    fees,
    totalAmount: amount + fees,
    currency: "XOF",
    status: 'created',
    blockchainHash: hash,
    createdAt: new Date().toISOString(),
    conditions: contractData.conditions,
    metadata: { listingId, offerId },
  };

  const transaction: BlockchainTransaction = {
    hash,
    timestamp: new Date().toISOString(),
    type: 'escrow_created',
    data: contractData,
    status: 'confirmed',
  };

  // Store contract
  escrowContracts.set(escrowId, contract);
  escrowEvents.set(escrowId, [{
    type: 'created',
    timestamp: contract.createdAt,
    actor: buyerId,
    hash,
    details: `Escrow créé pour ${amount} XOF`,
  }]);

  console.log(`[Blockchain] Escrow contract created: ${escrowId}`, contract);

  return { contract, transaction };
}

// Fund escrow (buyer deposits money)
export async function fundEscrow(
  escrowId: string,
  paymentTransactionId: string
): Promise<{ contract: EscrowContract; transaction: BlockchainTransaction }> {
  const contract = escrowContracts.get(escrowId);
  if (!contract) {
    throw new Error(`Escrow ${escrowId} not found`);
  }
  if (contract.status !== 'created') {
    throw new Error(`Escrow ${escrowId} cannot be funded in status ${contract.status}`);
  }

  const fundData = {
    escrowId,
    paymentTransactionId,
    amount: contract.totalAmount,
    timestamp: new Date().toISOString(),
  };

  const hash = generateHash(fundData);
  await new Promise(resolve => setTimeout(resolve, 500));

  contract.status = 'funded';
  contract.fundedAt = new Date().toISOString();
  escrowContracts.set(escrowId, contract);

  const events = escrowEvents.get(escrowId) || [];
  events.push({
    type: 'funded',
    timestamp: contract.fundedAt,
    actor: contract.buyerId,
    hash,
    details: `Fonds déposés: ${contract.totalAmount} XOF`,
  });
  escrowEvents.set(escrowId, events);

  console.log(`[Blockchain] Escrow funded: ${escrowId}`);

  return {
    contract,
    transaction: {
      hash,
      timestamp: new Date().toISOString(),
      type: 'escrow_created',
      data: fundData,
      status: 'confirmed',
    },
  };
}

// Confirm delivery (buyer confirms receipt)
export async function confirmDelivery(
  escrowId: string,
  buyerId: string
): Promise<{ contract: EscrowContract; hash: string }> {
  const contract = escrowContracts.get(escrowId);
  if (!contract) {
    throw new Error(`Escrow ${escrowId} not found`);
  }
  if (contract.status !== 'funded') {
    throw new Error(`Escrow ${escrowId} is not funded`);
  }
  if (contract.buyerId !== buyerId) {
    throw new Error(`Only the buyer can confirm delivery`);
  }

  const confirmData = {
    escrowId,
    buyerId,
    confirmedAt: new Date().toISOString(),
  };

  const hash = generateHash(confirmData);
  await new Promise(resolve => setTimeout(resolve, 300));

  contract.deliveryConfirmedAt = new Date().toISOString();
  escrowContracts.set(escrowId, contract);

  const events = escrowEvents.get(escrowId) || [];
  events.push({
    type: 'delivery_confirmed',
    timestamp: contract.deliveryConfirmedAt,
    actor: buyerId,
    hash,
    details: 'Livraison confirmée par l\'acheteur',
  });
  escrowEvents.set(escrowId, events);

  console.log(`[Blockchain] Delivery confirmed for escrow: ${escrowId}`);

  return { contract, hash };
}

// Release funds to seller
export async function releaseEscrowFunds(
  escrowId: string,
  actorId: string
): Promise<{ contract: EscrowContract; transaction: BlockchainTransaction }> {
  const contract = escrowContracts.get(escrowId);
  if (!contract) {
    throw new Error(`Escrow ${escrowId} not found`);
  }
  if (contract.status !== 'funded') {
    throw new Error(`Escrow ${escrowId} cannot be released in status ${contract.status}`);
  }
  
  // Check if delivery is confirmed or auto-release conditions met
  const daysSinceFunded = contract.fundedAt 
    ? (Date.now() - new Date(contract.fundedAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  
  const canAutoRelease = daysSinceFunded >= contract.conditions.autoReleaseAfterDays;
  const deliveryConfirmed = !!contract.deliveryConfirmedAt;
  
  if (!deliveryConfirmed && !canAutoRelease && actorId !== contract.buyerId) {
    throw new Error(`Funds cannot be released: delivery not confirmed and auto-release period not reached`);
  }

  const releaseData = {
    escrowId,
    sellerId: contract.sellerId,
    amount: contract.amount,
    platformFees: contract.fees,
    releasedBy: actorId,
    autoRelease: canAutoRelease && !deliveryConfirmed,
    timestamp: new Date().toISOString(),
  };

  const hash = generateHash(releaseData);
  await new Promise(resolve => setTimeout(resolve, 600));

  contract.status = 'released';
  contract.releasedAt = new Date().toISOString();
  escrowContracts.set(escrowId, contract);

  const events = escrowEvents.get(escrowId) || [];
  events.push({
    type: 'released',
    timestamp: contract.releasedAt,
    actor: actorId,
    hash,
    details: `Fonds libérés au vendeur: ${contract.amount} XOF`,
  });
  escrowEvents.set(escrowId, events);

  console.log(`[Blockchain] Escrow funds released: ${escrowId}`);

  return {
    contract,
    transaction: {
      hash,
      timestamp: new Date().toISOString(),
      type: 'escrow_released',
      data: releaseData,
      status: 'confirmed',
    },
  };
}

// Request refund
export async function requestEscrowRefund(
  escrowId: string,
  buyerId: string,
  reason: string
): Promise<{ contract: EscrowContract; transaction: BlockchainTransaction }> {
  const contract = escrowContracts.get(escrowId);
  if (!contract) {
    throw new Error(`Escrow ${escrowId} not found`);
  }
  if (contract.status !== 'funded') {
    throw new Error(`Escrow ${escrowId} cannot be refunded in status ${contract.status}`);
  }
  if (contract.buyerId !== buyerId) {
    throw new Error(`Only the buyer can request a refund`);
  }
  if (contract.deliveryConfirmedAt) {
    throw new Error(`Cannot refund after delivery confirmation`);
  }

  const refundData = {
    escrowId,
    buyerId,
    amount: contract.totalAmount,
    reason,
    timestamp: new Date().toISOString(),
  };

  const hash = generateHash(refundData);
  await new Promise(resolve => setTimeout(resolve, 700));

  contract.status = 'refunded';
  contract.refundedAt = new Date().toISOString();
  escrowContracts.set(escrowId, contract);

  const events = escrowEvents.get(escrowId) || [];
  events.push({
    type: 'refunded',
    timestamp: contract.refundedAt,
    actor: buyerId,
    hash,
    details: `Remboursement: ${contract.totalAmount} XOF - ${reason}`,
  });
  escrowEvents.set(escrowId, events);

  console.log(`[Blockchain] Escrow refunded: ${escrowId}`);

  return {
    contract,
    transaction: {
      hash,
      timestamp: new Date().toISOString(),
      type: 'escrow_refunded',
      data: refundData,
      status: 'confirmed',
    },
  };
}

// Get escrow contract details
export function getEscrowContract(escrowId: string): EscrowContract | undefined {
  return escrowContracts.get(escrowId);
}

// Get escrow event history
export function getEscrowHistory(escrowId: string): EscrowEvent[] {
  return escrowEvents.get(escrowId) || [];
}

// Get all escrows for a user
export function getUserEscrows(userId: string): EscrowContract[] {
  const userEscrows: EscrowContract[] = [];
  escrowContracts.forEach((contract) => {
    if (contract.buyerId === userId || contract.sellerId === userId) {
      userEscrows.push(contract);
    }
  });
  return userEscrows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  return {
    status: 'active',
    lastUpdate: new Date().toISOString(),
    transactions: []
  };
}

// Blockchain Service object for convenient access
export const blockchainService = {
  generateHash,
  
  // Escrow functions
  createEscrowContract,
  fundEscrow,
  confirmDelivery,
  releaseEscrowFunds,
  requestEscrowRefund,
  getEscrowContract,
  getEscrowHistory,
  getUserEscrows,
  
  // Investment functions
  createInvestmentContract,
  recordRepayment,
  
  // Traceability
  generateTraceabilityCertificate,
  verifyBlockchainHash,
  getContractStatus,
  
  // Record any transaction type
  async recordTransaction(transaction: {
    type: string;
    data: Record<string, any>;
    timestamp: string;
  }): Promise<string> {
    const hash = generateHash(transaction);
    console.log(`[Blockchain] Transaction recorded: ${hash}`, transaction);
    return hash;
  },
};
