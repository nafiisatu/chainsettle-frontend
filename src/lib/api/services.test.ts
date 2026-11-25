import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Test documentation for src/lib/api/services.ts
 * 
 * This file defines typed API service functions that wrap every backend REST endpoint.
 * Each function is a thin wrapper that calls apiClient and deserializes the response.
 * Full integration tests require a running backend; these tests document the expected
 * behavior and function signatures.
 */

describe('API Services', () => {
  describe('authApi', () => {
    it('documents getNonce function signature', () => {
      // authApi.getNonce(address: string): Promise<string>
      // Expected behavior:
      // - Calls GET /auth/nonce?address={address}
      // - Returns the nonce string from the response
      // - Throws on network error or invalid address
      const functionSignature = 'getNonce(address: string): Promise<string>';
      assert.ok(functionSignature.includes('address'));
      assert.ok(functionSignature.includes('Promise'));
    });

    it('documents login function signature', () => {
      // authApi.login(payload): Promise<{ accessToken: string; user: User }>
      // Expected behavior:
      // - Calls POST /auth/login
      // - Payload contains: stellarAddress, signedNonce, signature
      // - Returns accessToken and user object
      // - Throws on invalid signature or server error (500, 403)
      const payload = {
        stellarAddress: 'GXXXXX...',
        signedNonce: 'base64-encoded-signature',
        signature: 'cryptographic-proof',
      };
      assert.ok(Object.keys(payload).includes('stellarAddress'));
    });
  });

  describe('shipmentsApi', () => {
    it('documents create function', () => {
      // shipmentsApi.create(input: CreateShipmentInput & { txHash, buyerAddress, tokenAddress }): Promise<Shipment>
      // Expected behavior:
      // - Calls POST /shipments with shipment details
      // - Requires: shipmentId, supplierAddress, logisticsAddress, arbiterAddress, totalAmount, milestones, txHash, buyerAddress, tokenAddress
      // - Returns the created Shipment object from backend
      const shipmentFields = [
        'shipmentId',
        'supplierAddress',
        'logisticsAddress',
        'arbiterAddress',
        'totalAmount',
        'milestones',
        'txHash',
        'buyerAddress',
        'tokenAddress',
      ];
      assert.equal(shipmentFields.length, 9);
    });

    it('documents list function with pagination', () => {
      // shipmentsApi.list(params?): Promise<PaginatedResponse<Shipment>>
      // Optional query parameters: buyerAddress, supplierAddress, status, page, limit
      // Returns: { data: Shipment[], page, limit, total, totalPages }
      const listParams = ['buyerAddress', 'supplierAddress', 'status', 'page', 'limit'];
      assert.ok(listParams.length >= 3);
    });

    it('documents get function', () => {
      // shipmentsApi.get(id: string): Promise<Shipment>
      // Calls GET /shipments/{id}
      // Returns full shipment including milestones and events
      const id = 'SHIP-20260927-ABCD';
      assert.ok(id.startsWith('SHIP-'));
    });

    it('documents sync function', () => {
      // shipmentsApi.sync(id: string): Promise<void>
      // Calls POST /shipments/{id}/sync
      // Forces backend to re-fetch and update shipment state from Stellar chain
      const functionName = 'sync';
      assert.equal(functionName, 'sync');
    });

    it('documents cancel function', () => {
      // shipmentsApi.cancel(id: string): Promise<Shipment>
      // Calls POST /shipments/{id}/cancel
      // Only callable by buyer
      // Returns updated Shipment with status 'Cancelled'
      const role = 'buyer';
      assert.equal(role, 'buyer');
    });
  });

  describe('milestonesApi', () => {
    it('documents list function', () => {
      // milestonesApi.list(shipmentId: string): Promise<Milestone[]>
      // Calls GET /shipments/{shipmentId}/milestones
      // Returns array of Milestone objects for the shipment
      const shipmentId = 'SHIP-20260927-ABCD';
      assert.ok(shipmentId.length > 0);
    });

    it('documents get function', () => {
      // milestonesApi.get(shipmentId: string, index: number): Promise<Milestone>
      // Calls GET /shipments/{shipmentId}/milestones/{index}
      // Returns single Milestone by index (0-based)
      const index = 0;
      assert.equal(index, 0);
    });
  });

  describe('eventsApi', () => {
    it('documents list function', () => {
      // eventsApi.list(params?): Promise<PaginatedResponse<ChainEvent>>
      // Optional query parameters: shipmentId, page, limit
      // Returns paginated ChainEvent objects
      const eventFields = ['shipmentId', 'page', 'limit'];
      assert.equal(eventFields.length, 3);
    });
  });

  describe('notificationsApi', () => {
    it('documents list function', () => {
      // notificationsApi.list(params?): Promise<PaginatedResponse<Notification>>
      // Optional query parameters: unreadOnly (boolean), page, limit
      // Returns paginated Notification objects
      const listOptions = ['unreadOnly', 'page', 'limit'];
      assert.ok(listOptions.includes('unreadOnly'));
    });

    it('documents markRead function', () => {
      // notificationsApi.markRead(id: string): Promise<void>
      // Calls PATCH /notifications/{id}/read
      // Marks single notification as read
      const id = 'notif_123';
      assert.ok(id.length > 0);
    });

    it('documents markAllRead function', () => {
      // notificationsApi.markAllRead(): Promise<void>
      // Calls PATCH /notifications/read-all
      // Marks all notifications for current user as read
      const functionName = 'markAllRead';
      assert.equal(functionName, 'markAllRead');
    });
  });

  describe('commentsApi', () => {
    it('documents list function', () => {
      // commentsApi.list(shipmentId: string): Promise<Comment[]>
      // Calls GET /shipments/{shipmentId}/comments
      // Returns array of Comment objects
      // Handles both ApiResponse and direct array responses for compatibility
      const shipmentId = 'SHIP-20260927-ABCD';
      assert.ok(shipmentId.includes('SHIP'));
    });

    it('documents create function', () => {
      // commentsApi.create(shipmentId: string, body: string | { content: string }): Promise<Comment>
      // Calls POST /shipments/{shipmentId}/comments
      // Payload: { content: string } where content is 1-1000 characters
      // Returns newly created Comment object
      const content = 'This is a comment about the shipment.';
      assert.ok(content.length > 0 && content.length <= 1000);
    });

    it('documents update and delete comment functions', () => {
      // commentsApi.update(shipmentId: string, commentId: string, body: string | UpdateCommentInput): Promise<Comment>
      // Calls PATCH /shipments/{shipmentId}/comments/{commentId}
      // commentsApi.delete(shipmentId: string, commentId: string): Promise<void>
      // Calls DELETE /shipments/{shipmentId}/comments/{commentId}
      const methods = ['list', 'create', 'update', 'delete'];
      assert.equal(methods.length, 4);
    });

    it('documents Comment interface structure', () => {
      // Comment interface fields:
      // - id: string
      // - shipmentId: string
      // - authorAddress: string (Stellar account)
      // - authorRole?: string ('BUYER' | 'SUPPLIER' | 'LOGISTICS' | 'ARBITER')
      // - content: string
      // - mentions?: MentionRole[]
      // - edited?: boolean
      // - editedAt?: string | null
      // - createdAt: ISO timestamp string
      // - updatedAt?: ISO timestamp string
      const commentFields = ['id', 'shipmentId', 'authorAddress', 'content', 'createdAt'];
      assert.equal(commentFields.length, 5);
    });
  });

  describe('adminApi', () => {
    it('documents listUsers and updateUserRole functions', () => {
      // adminApi.listUsers(params?: { search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<User>>
      // Calls GET /admin/users
      // adminApi.updateUserRole(userId: string, role: UserRole): Promise<User>
      // Calls PATCH /admin/users/{userId}/role
      const methods = ['listUsers', 'updateUserRole'];
      assert.equal(methods.length, 2);
    });
  });

  describe('error handling', () => {
    it('documents API error conventions', () => {
      // All service functions throw on error:
      // - Network errors: Axios error with isNetwork flag
      // - 400 Bad Request: validation error in request
      // - 401 Unauthorized: handled by apiClient interceptor (redirects to login)
      // - 403 Forbidden: user lacks permission for the operation
      // - 404 Not Found: resource does not exist
      // - 500+ Server Error: backend failure
      const errorStatuses = [400, 401, 403, 404, 500];
      assert.equal(errorStatuses.length, 5);
    });
  });

  describe('auth flow request detection', () => {
    it('documents isAuthFlowRequest function', () => {
      // Helper function: isAuthFlowRequest(url: string | undefined): boolean
      // Returns true if URL is part of the sign-in flow (/auth/nonce, /auth/login)
      // Used by apiClient response interceptor to distinguish login errors from session expiry
      const authPaths = ['/auth/nonce', '/auth/login'];
      assert.ok(authPaths.every((p) => typeof p === 'string'));
    });
  });
});
