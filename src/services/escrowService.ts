// Escrow Service - Persists escrow contracts to Supabase with blockchain hashes

import { supabase } from "@/integrations/supabase/client";

export interface EscrowContract {
  id: string;
  transaction_id: string;
  buyer_id: string;
  seller_id: string;
  listing_id?: string;
  offer_id?: string;
  amount: number;
  fees: number;
  total_amount: number;
  currency: string;
  status: 'created' | 'funded' | 'released' | 'refunded' | 'disputed';
  blockchain_hash: string;
  created_at: string;
  funded_at?: string;
  released_at?: string;
  refunded_at?: string;
  delivery_confirmed_at?: string;
  auto_release_after_days: number;
  require_delivery_confirmation: boolean;
  dispute_window_days: number;
  metadata?: Record<string, any>;
}

export interface EscrowEvent {
  id: string;
  escrow_id: string;
  event_type: 'created' | 'funded' | 'delivery_confirmed' | 'released' | 'refund_requested' | 'refunded' | 'disputed';
  actor_id: string;
  hash: string;
  details?: string;
  created_at: string;
}

// Generate blockchain hash
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

function generateTransactionId(): string {
  return `ESC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

// Create escrow contract
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
): Promise<EscrowContract> {
  const transactionId = generateTransactionId();
  const totalAmount = amount + fees;
  
  const contractData = {
    version: "1.0",
    type: "escrow",
    transactionId,
    buyerId,
    sellerId,
    listingId,
    offerId,
    amount,
    fees,
    totalAmount,
    currency: "XOF",
    timestamp: new Date().toISOString(),
    platform: "Plantéra",
  };

  const blockchainHash = generateHash(contractData);

  const { data, error } = await supabase
    .from('escrow_contracts')
    .insert({
      transaction_id: transactionId,
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: listingId,
      offer_id: offerId,
      amount,
      fees,
      total_amount: totalAmount,
      currency: 'XOF',
      status: 'created',
      blockchain_hash: blockchainHash,
      auto_release_after_days: options?.autoReleaseAfterDays ?? 7,
      require_delivery_confirmation: options?.requireDeliveryConfirmation ?? true,
      dispute_window_days: options?.disputeWindowDays ?? 3,
      metadata: { listingId, offerId },
    })
    .select()
    .single();

  if (error) {
    console.error('[Escrow] Error creating contract:', error);
    throw new Error(`Erreur lors de la création de l'escrow: ${error.message}`);
  }

  // Record blockchain transaction
  await supabase.from('blockchain_transactions').insert({
    hash: blockchainHash,
    transaction_type: 'escrow_created',
    escrow_id: data.id,
    user_id: buyerId,
    data: contractData,
    status: 'confirmed',
  });

  // Record event
  await supabase.from('escrow_events').insert({
    escrow_id: data.id,
    event_type: 'created',
    actor_id: buyerId,
    hash: blockchainHash,
    details: `Escrow créé pour ${amount} XOF`,
  });

  console.log(`[Escrow] Contract created: ${data.id}`);
  return data as EscrowContract;
}

// Fund escrow
export async function fundEscrow(
  escrowId: string,
  paymentTransactionId: string
): Promise<EscrowContract> {
  const { data: contract, error: fetchError } = await supabase
    .from('escrow_contracts')
    .select('*')
    .eq('id', escrowId)
    .single();

  if (fetchError || !contract) {
    throw new Error(`Escrow ${escrowId} non trouvé`);
  }

  if (contract.status !== 'created') {
    throw new Error(`Escrow ne peut pas être financé dans l'état ${contract.status}`);
  }

  const fundData = {
    escrowId,
    paymentTransactionId,
    amount: contract.total_amount,
    timestamp: new Date().toISOString(),
  };

  const hash = generateHash(fundData);

  const { data, error } = await supabase
    .from('escrow_contracts')
    .update({
      status: 'funded',
      funded_at: new Date().toISOString(),
    })
    .eq('id', escrowId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur lors du financement: ${error.message}`);
  }

  // Record blockchain transaction
  await supabase.from('blockchain_transactions').insert({
    hash,
    transaction_type: 'escrow_funded',
    escrow_id: escrowId,
    user_id: contract.buyer_id,
    data: fundData,
    status: 'confirmed',
  });

  // Record event
  await supabase.from('escrow_events').insert({
    escrow_id: escrowId,
    event_type: 'funded',
    actor_id: contract.buyer_id,
    hash,
    details: `Fonds déposés: ${contract.total_amount} XOF`,
  });

  console.log(`[Escrow] Funded: ${escrowId}`);
  return data as EscrowContract;
}

// Confirm delivery
export async function confirmDelivery(
  escrowId: string,
  buyerId: string
): Promise<EscrowContract> {
  const { data: contract, error: fetchError } = await supabase
    .from('escrow_contracts')
    .select('*')
    .eq('id', escrowId)
    .single();

  if (fetchError || !contract) {
    throw new Error(`Escrow ${escrowId} non trouvé`);
  }

  if (contract.status !== 'funded') {
    throw new Error(`Escrow non financé`);
  }

  if (contract.buyer_id !== buyerId) {
    throw new Error(`Seul l'acheteur peut confirmer la livraison`);
  }

  const confirmData = {
    escrowId,
    buyerId,
    confirmedAt: new Date().toISOString(),
  };

  const hash = generateHash(confirmData);

  const { data, error } = await supabase
    .from('escrow_contracts')
    .update({
      delivery_confirmed_at: new Date().toISOString(),
    })
    .eq('id', escrowId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur: ${error.message}`);
  }

  // Record blockchain transaction
  await supabase.from('blockchain_transactions').insert({
    hash,
    transaction_type: 'delivery_confirmed',
    escrow_id: escrowId,
    user_id: buyerId,
    data: confirmData,
    status: 'confirmed',
  });

  // Record event
  await supabase.from('escrow_events').insert({
    escrow_id: escrowId,
    event_type: 'delivery_confirmed',
    actor_id: buyerId,
    hash,
    details: 'Livraison confirmée par l\'acheteur',
  });

  console.log(`[Escrow] Delivery confirmed: ${escrowId}`);
  return data as EscrowContract;
}

// Release funds to seller
export async function releaseFunds(
  escrowId: string,
  actorId: string
): Promise<EscrowContract> {
  const { data: contract, error: fetchError } = await supabase
    .from('escrow_contracts')
    .select('*')
    .eq('id', escrowId)
    .single();

  if (fetchError || !contract) {
    throw new Error(`Escrow ${escrowId} non trouvé`);
  }

  if (contract.status !== 'funded') {
    throw new Error(`Escrow ne peut pas être libéré dans l'état ${contract.status}`);
  }

  // Check conditions
  const daysSinceFunded = contract.funded_at 
    ? (Date.now() - new Date(contract.funded_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  
  const canAutoRelease = daysSinceFunded >= contract.auto_release_after_days;
  const deliveryConfirmed = !!contract.delivery_confirmed_at;
  
  if (!deliveryConfirmed && !canAutoRelease && actorId !== contract.buyer_id) {
    throw new Error(`Les fonds ne peuvent pas être libérés: livraison non confirmée`);
  }

  const releaseData = {
    escrowId,
    sellerId: contract.seller_id,
    amount: contract.amount,
    platformFees: contract.fees,
    releasedBy: actorId,
    autoRelease: canAutoRelease && !deliveryConfirmed,
    timestamp: new Date().toISOString(),
  };

  const hash = generateHash(releaseData);

  const { data, error } = await supabase
    .from('escrow_contracts')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('id', escrowId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur: ${error.message}`);
  }

  // Record blockchain transaction
  await supabase.from('blockchain_transactions').insert({
    hash,
    transaction_type: 'escrow_released',
    escrow_id: escrowId,
    user_id: actorId,
    data: releaseData,
    status: 'confirmed',
  });

  // Record event
  await supabase.from('escrow_events').insert({
    escrow_id: escrowId,
    event_type: 'released',
    actor_id: actorId,
    hash,
    details: `Fonds libérés au vendeur: ${contract.amount} XOF`,
  });

  console.log(`[Escrow] Funds released: ${escrowId}`);
  return data as EscrowContract;
}

// Request refund
export async function requestRefund(
  escrowId: string,
  buyerId: string,
  reason: string
): Promise<EscrowContract> {
  const { data: contract, error: fetchError } = await supabase
    .from('escrow_contracts')
    .select('*')
    .eq('id', escrowId)
    .single();

  if (fetchError || !contract) {
    throw new Error(`Escrow ${escrowId} non trouvé`);
  }

  if (contract.status !== 'funded') {
    throw new Error(`Remboursement impossible dans l'état ${contract.status}`);
  }

  if (contract.buyer_id !== buyerId) {
    throw new Error(`Seul l'acheteur peut demander un remboursement`);
  }

  if (contract.delivery_confirmed_at) {
    throw new Error(`Remboursement impossible après confirmation de livraison`);
  }

  const refundData = {
    escrowId,
    buyerId,
    amount: contract.total_amount,
    reason,
    timestamp: new Date().toISOString(),
  };

  const hash = generateHash(refundData);

  const { data, error } = await supabase
    .from('escrow_contracts')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('id', escrowId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur: ${error.message}`);
  }

  // Record blockchain transaction
  await supabase.from('blockchain_transactions').insert({
    hash,
    transaction_type: 'escrow_refunded',
    escrow_id: escrowId,
    user_id: buyerId,
    data: refundData,
    status: 'confirmed',
  });

  // Record event
  await supabase.from('escrow_events').insert({
    escrow_id: escrowId,
    event_type: 'refunded',
    actor_id: buyerId,
    hash,
    details: `Remboursement: ${contract.total_amount} XOF - ${reason}`,
  });

  console.log(`[Escrow] Refunded: ${escrowId}`);
  return data as EscrowContract;
}

// Get user's escrow contracts
export async function getUserEscrows(userId: string): Promise<EscrowContract[]> {
  const { data, error } = await supabase
    .from('escrow_contracts')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Escrow] Error fetching user escrows:', error);
    return [];
  }

  return data as EscrowContract[];
}

// Get escrow events
export async function getEscrowEvents(escrowId: string): Promise<EscrowEvent[]> {
  const { data, error } = await supabase
    .from('escrow_events')
    .select('*')
    .eq('escrow_id', escrowId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Escrow] Error fetching events:', error);
    return [];
  }

  return data as EscrowEvent[];
}

// Get escrow by ID
export async function getEscrowById(escrowId: string): Promise<EscrowContract | null> {
  const { data, error } = await supabase
    .from('escrow_contracts')
    .select('*')
    .eq('id', escrowId)
    .single();

  if (error) {
    return null;
  }

  return data as EscrowContract;
}

export const escrowService = {
  createEscrowContract,
  fundEscrow,
  confirmDelivery,
  releaseFunds,
  requestRefund,
  getUserEscrows,
  getEscrowEvents,
  getEscrowById,
};
