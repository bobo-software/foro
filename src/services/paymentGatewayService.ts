/**
 * Payment Gateway Service
 * Thin wrapper over foro-api payment routes (Paystack/PayFast when configured).
 *
 * Distinct from `paymentService.ts`, which is CRUD over the app's own
 * `payments` (invoice payment) table.
 *
 * Note: foro-api currently stubs these endpoints with 503 until a provider
 * is wired (see foro-api PaymentRoutes).
 */

import { foroApiClient } from '../backend';
import type {
  PaymentPlan,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  TransactionStatusResponse,
  CancelSubscriptionResponse,
} from '../types/subscription';

const PAYMENTS_ENDPOINTS = {
  plans: '/api/v1/payments/plans',
  initiate: '/api/v1/payments/initiate',
  transaction: '/api/v1/payments/transaction',
  cancelSubscription: '/api/v1/payments/subscription/cancel',
} as const;

export class PaymentGatewayService {
  static async listPlans(providerId?: number): Promise<PaymentPlan[]> {
    const response = await foroApiClient.get<PaymentPlan[]>(
      PAYMENTS_ENDPOINTS.plans,
      providerId != null ? { provider_id: providerId } : undefined
    );
    return response.data ?? [];
  }

  static async initiatePayment(data: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    const response = await foroApiClient.post(PAYMENTS_ENDPOINTS.initiate, data);
    return response as unknown as InitiatePaymentResponse;
  }

  static async getTransactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    const response = await foroApiClient.get(`${PAYMENTS_ENDPOINTS.transaction}/${transactionId}`);
    return response as unknown as TransactionStatusResponse;
  }

  static async cancelSubscription(transactionId: string): Promise<CancelSubscriptionResponse> {
    const response = await foroApiClient.post(PAYMENTS_ENDPOINTS.cancelSubscription, {
      transaction_id: transactionId,
    });
    return response as unknown as CancelSubscriptionResponse;
  }
}

export default PaymentGatewayService;
