/**
 * Payment Gateway Service
 * Thin wrapper over the Skaftin Payment API (Paystack/PayFast) — see
 * client-sdk/requests/03-PAYMENT-REQUESTS.md for the request/response contracts.
 *
 * Distinct from `paymentService.ts`, which is unrelated CRUD over the app's
 * own `payments` (invoice payment) table.
 */

import { skaftinClient } from '../backend';
import { SKAFTIN_CONFIG } from '../config/skaftin.config';
import type {
  PaymentPlan,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  TransactionStatusResponse,
  CancelSubscriptionResponse,
} from '../types/subscription';

const { payments: PAYMENTS_ENDPOINTS } = SKAFTIN_CONFIG.endpoints;

export class PaymentGatewayService {
  static async listPlans(providerId?: number): Promise<PaymentPlan[]> {
    const response = await skaftinClient.get<PaymentPlan[]>(
      PAYMENTS_ENDPOINTS.plans,
      providerId != null ? { provider_id: providerId } : undefined
    );
    return response.data ?? [];
  }

  static async initiatePayment(data: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    const response = await skaftinClient.post(PAYMENTS_ENDPOINTS.initiate, data);
    return response as unknown as InitiatePaymentResponse;
  }

  static async getTransactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    const response = await skaftinClient.get(`${PAYMENTS_ENDPOINTS.transaction}/${transactionId}`);
    return response as unknown as TransactionStatusResponse;
  }

  static async cancelSubscription(transactionId: string): Promise<CancelSubscriptionResponse> {
    const response = await skaftinClient.post(PAYMENTS_ENDPOINTS.cancelSubscription, {
      transaction_id: transactionId,
    });
    return response as unknown as CancelSubscriptionResponse;
  }
}

export default PaymentGatewayService;
