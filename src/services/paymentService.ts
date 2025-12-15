// Mobile Money Payment Service (Orange Money, Wave, MTN)

export type PaymentProvider = 'orange_money' | 'wave' | 'mtn' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PaymentType = 'marketplace' | 'service' | 'investment_return' | 'refund';

export interface PaymentRequest {
  amount: number;
  currency?: string;
  provider: PaymentProvider;
  phoneNumber: string;
  description: string;
  paymentType: PaymentType;
  referenceId: string; // listing_id, booking_id, investment_id
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerTransactionId?: string;
  timestamp: string;
  message?: string;
}

export interface RefundRequest {
  originalTransactionId: string;
  amount: number;
  reason: string;
  phoneNumber: string;
  provider: PaymentProvider;
}

// Simulated payment processing (in production, integrate with actual APIs)
const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PLT-${timestamp}-${random}`.toUpperCase();
};

// Provider-specific configurations
const providerConfig = {
  orange_money: {
    name: 'Orange Money',
    icon: '🟠',
    ussdCode: '*144#',
    fees: 0.01, // 1% fee
    minAmount: 100,
    maxAmount: 5000000,
    currency: 'XOF',
  },
  wave: {
    name: 'Wave',
    icon: '🌊',
    ussdCode: '*920#',
    fees: 0.005, // 0.5% fee
    minAmount: 50,
    maxAmount: 3000000,
    currency: 'XOF',
  },
  mtn: {
    name: 'MTN Mobile Money',
    icon: '🟡',
    ussdCode: '*126#',
    fees: 0.015, // 1.5% fee
    minAmount: 100,
    maxAmount: 2000000,
    currency: 'XOF',
  },
  cash: {
    name: 'Espèces',
    icon: '💵',
    ussdCode: null,
    fees: 0,
    minAmount: 0,
    maxAmount: 10000000,
    currency: 'XOF',
  },
};

export const getProviderInfo = (provider: PaymentProvider) => {
  return providerConfig[provider];
};

export const calculateFees = (amount: number, provider: PaymentProvider): number => {
  const config = providerConfig[provider];
  return Math.round(amount * config.fees);
};

export const formatCurrency = (amount: number, currency = 'XOF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

// Validate phone number for Senegal
export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  // Senegal phone numbers: 7X XXX XX XX (9 digits) or +221 7X XXX XX XX
  return /^(221)?7[0-9]{8}$/.test(cleaned);
};

// Format phone for API
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('221')) {
    return `+${cleaned}`;
  }
  return `+221${cleaned}`;
};

// Initiate payment
export const initiatePayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  const config = providerConfig[request.provider];
  
  // Validate amount
  if (request.amount < config.minAmount || request.amount > config.maxAmount) {
    throw new Error(`Le montant doit être entre ${formatCurrency(config.minAmount)} et ${formatCurrency(config.maxAmount)}`);
  }
  
  // Validate phone
  if (request.provider !== 'cash' && !validatePhoneNumber(request.phoneNumber)) {
    throw new Error('Numéro de téléphone invalide');
  }
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simulate success (90% success rate for demo)
  const success = Math.random() > 0.1;
  
  const transactionId = generateTransactionId();
  const fees = calculateFees(request.amount, request.provider);
  
  if (success) {
    return {
      transactionId,
      status: 'completed',
      amount: request.amount + fees,
      currency: config.currency,
      provider: request.provider,
      providerTransactionId: `${request.provider.toUpperCase()}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: 'Paiement effectué avec succès',
    };
  } else {
    return {
      transactionId,
      status: 'failed',
      amount: request.amount,
      currency: config.currency,
      provider: request.provider,
      timestamp: new Date().toISOString(),
      message: 'Échec du paiement. Veuillez réessayer.',
    };
  }
};

// Process refund
export const processRefund = async (request: RefundRequest): Promise<PaymentResponse> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const config = providerConfig[request.provider];
  const transactionId = generateTransactionId();
  
  return {
    transactionId,
    status: 'refunded',
    amount: request.amount,
    currency: config.currency,
    provider: request.provider,
    providerTransactionId: `REFUND-${Date.now()}`,
    timestamp: new Date().toISOString(),
    message: `Remboursement de ${formatCurrency(request.amount)} effectué`,
  };
};

// Check payment status
export const checkPaymentStatus = async (transactionId: string): Promise<PaymentStatus> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, this would query the actual payment provider
  return 'completed';
};

// Generate USSD payment code
export const generateUSSDCode = (provider: PaymentProvider, amount: number, merchantCode = 'PLANTERA'): string | null => {
  const config = providerConfig[provider];
  if (!config.ussdCode) return null;
  
  switch (provider) {
    case 'orange_money':
      return `${config.ussdCode}*1*${merchantCode}*${amount}#`;
    case 'wave':
      return `${config.ussdCode}*2*${amount}#`;
    case 'mtn':
      return `${config.ussdCode}*1*${amount}#`;
    default:
      return null;
  }
};

// Payment history interface
export interface PaymentRecord {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  fees: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  paymentType: PaymentType;
  referenceId: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}
