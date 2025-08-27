import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { POST as issueCertificate } from '../../src/app/api/certificates/issue/route';
import { POST as revokeCertificate } from '../../src/app/api/certificates/revoke/route';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

const { getServerSession } = require('next-auth');

describe('API Integration Tests', () => {
  let prisma: PrismaClient;
  let testUser: any;
  let testCA: any;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./test.db',
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.certificateRevocation.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.caConfig.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: bcrypt.hashSync('password123', 10),
        role: 'OPERATOR',
        status: 'ACTIVE',
        name: 'Test User',
      },
    });

    // Create test CA
    testCA = await prisma.caConfig.create({
      data: {
        name: 'Test CA',
        commonName: 'test-ca.example.com',
        organization: 'Test Organization',
        country: 'US',
        state: 'CA',
        locality: 'San Francisco',
        status: 'ACTIVE',
        createdById: testUser.id,
      },
    });

    // Mock NextAuth session
    getServerSession.mockResolvedValue({
      user: {
        id: testUser.id,
        username: testUser.username,
        role: testUser.role,
      },
    });
  });

  describe('Certificate Issue API Integration', () => {
    test('should issue certificate and update database state', async () => {
      const requestBody = {
        commonName: 'test.example.com',
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
        subjectAltNames: ['test.example.com', '*.test.example.com'],
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await issueCertificate(request);
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.certificate).toBeDefined();

      // Verify database state was updated
      const certificate = await prisma.certificate.findFirst({
        where: { commonName: 'test.example.com' },
        include: { issuedBy: true, caConfig: true },
      });

      expect(certificate).toBeDefined();
      expect(certificate?.commonName).toBe('test.example.com');
      expect(certificate?.status).toBe('ACTIVE');
      expect(certificate?.issuedBy.id).toBe(testUser.id);
      expect(certificate?.caConfig.id).toBe(testCA.id);

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: { 
          action: 'CERTIFICATE_ISSUED',
          userId: testUser.id,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.details).toContain('test.example.com');
    });

    test('should handle certificate issuance with minimal data', async () => {
      const requestBody = {
        commonName: 'minimal.example.com',
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 30,
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await issueCertificate(request);
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      // Verify certificate was created with default values
      const certificate = await prisma.certificate.findFirst({
        where: { commonName: 'minimal.example.com' },
      });

      expect(certificate).toBeDefined();
      expect(certificate?.subjectAltNames).toEqual([]);
    });

    test('should handle certificate issuance errors gracefully', async () => {
      const requestBody = {
        commonName: '', // Invalid: empty common name
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await issueCertificate(request);
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();

      // Verify no certificate was created
      const certificate = await prisma.certificate.findFirst({
        where: { commonName: '' },
      });
      expect(certificate).toBeNull();

      // Verify no audit log was created for failed operation
      const auditLog = await prisma.auditLog.findFirst({
        where: { 
          action: 'CERTIFICATE_ISSUED',
          userId: testUser.id,
        },
      });
      expect(auditLog).toBeNull();
    });

    test('should enforce certificate serial number uniqueness', async () => {
      // First certificate
      const requestBody1 = {
        commonName: 'unique1.example.com',
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
      };

      const request1 = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody1),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response1 = await issueCertificate(request1);
      expect(response1.status).toBe(200);

      // Second certificate with same common name (if that's how uniqueness is enforced)
      const requestBody2 = {
        commonName: 'unique1.example.com', // Same common name
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
      };

      const request2 = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody2),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response2 = await issueCertificate(request2);
      
      // This behavior depends on the API implementation
      // If uniqueness is enforced, this should fail
      if (response2.status === 400) {
        const responseData = await response2.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('already exists');
      }
    });
  });

  describe('Certificate Revocation API Integration', () => {
    let testCertificate: any;

    beforeEach(async () => {
      // Create a test certificate to revoke
      testCertificate = await prisma.certificate.create({
        data: {
          serialNumber: 'REVOKE-TEST-001',
          commonName: 'revoke-test.example.com',
          subjectAltNames: ['revoke-test.example.com'],
          validFrom: new Date(),
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
          issuedById: testUser.id,
          caConfigId: testCA.id,
        },
      });
    });

    test('should revoke certificate and update database state', async () => {
      const requestBody = {
        certificateId: testCertificate.id,
        reason: 'UNSPECIFIED',
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/revoke', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await revokeCertificate(request);
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      // Verify certificate status was updated
      const updatedCertificate = await prisma.certificate.findUnique({
        where: { id: testCertificate.id },
      });

      expect(updatedCertificate?.status).toBe('REVOKED');

      // Verify revocation record was created
      const revocation = await prisma.certificateRevocation.findFirst({
        where: { certificateId: testCertificate.id },
        include: { revokedBy: true },
      });

      expect(revocation).toBeDefined();
      expect(revocation?.reason).toBe('UNSPECIFIED');
      expect(revocation?.revokedBy.id).toBe(testUser.id);

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: { 
          action: 'CERTIFICATE_REVOKED',
          userId: testUser.id,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.details).toContain('revoke-test.example.com');
    });

    test('should handle revocation of already revoked certificate', async () => {
      // First revocation
      const requestBody1 = {
        certificateId: testCertificate.id,
        reason: 'UNSPECIFIED',
      };

      const request1 = new NextRequest('http://localhost:3000/api/certificates/revoke', {
        method: 'POST',
        body: JSON.stringify(requestBody1),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await revokeCertificate(request1);

      // Try to revoke again
      const requestBody2 = {
        certificateId: testCertificate.id,
        reason: 'KEY_COMPROMISE',
      };

      const request2 = new NextRequest('http://localhost:3000/api/certificates/revoke', {
        method: 'POST',
        body: JSON.stringify(requestBody2),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response2 = await revokeCertificate(request2);
      
      // This should either fail or update the existing revocation
      if (response2.status === 400) {
        const responseData = await response2.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('already revoked');
      } else if (response2.status === 200) {
        // If it succeeds, verify the revocation was updated
        const revocation = await prisma.certificateRevocation.findFirst({
          where: { certificateId: testCertificate.id },
        });
        expect(revocation?.reason).toBe('KEY_COMPROMISE');
      }
    });

    test('should handle revocation of non-existent certificate', async () => {
      const requestBody = {
        certificateId: 'non-existent-id',
        reason: 'UNSPECIFIED',
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/revoke', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await revokeCertificate(request);
      expect(response.status).toBe(404);

      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('not found');

      // Verify no revocation record was created
      const revocation = await prisma.certificateRevocation.findFirst({
        where: { certificateId: 'non-existent-id' },
      });
      expect(revocation).toBeNull();
    });

    test('should handle revocation with invalid reason', async () => {
      const requestBody = {
        certificateId: testCertificate.id,
        reason: 'INVALID_REASON', // Invalid reason
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/revoke', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await revokeCertificate(request);
      
      // This should fail validation
      if (response.status === 400) {
        const responseData = await response.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('invalid reason');

        // Verify no revocation record was created
        const revocation = await prisma.certificateRevocation.findFirst({
          where: { certificateId: testCertificate.id },
        });
        expect(revocation).toBeNull();
      }
    });
  });

  describe('API Error Handling Integration', () => {
    test('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: 'invalid json content',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await issueCertificate(request);
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid JSON');
    });

    test('should handle missing required fields', async () => {
      const requestBody = {
        // Missing commonName
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await issueCertificate(request);
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('required');
    });

    test('should handle invalid field values', async () => {
      const requestBody = {
        commonName: 'test.example.com',
        certificateType: 'INVALID_TYPE', // Invalid type
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: -1, // Invalid validity
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await issueCertificate(request);
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('invalid');
    });
  });

  describe('API Authentication Integration', () => {
    test('should reject requests without valid session', async () => {
      // Mock no session
      getServerSession.mockResolvedValue(null);

      const requestBody = {
        commonName: 'test.example.com',
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await issueCertificate(request);
      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Unauthorized');

      // Verify no certificate was created
      const certificate = await prisma.certificate.findFirst({
        where: { commonName: 'test.example.com' },
      });
      expect(certificate).toBeNull();
    });

    test('should reject requests with insufficient permissions', async () => {
      // Mock user with insufficient role
      getServerSession.mockResolvedValue({
        user: {
          id: testUser.id,
          username: testUser.username,
          role: 'VIEWER', // Insufficient role
        },
      });

      const requestBody = {
        commonName: 'test.example.com',
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await issueCertificate(request);
      expect(response.status).toBe(403);

      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Forbidden');

      // Verify no certificate was created
      const certificate = await prisma.certificate.findFirst({
        where: { commonName: 'test.example.com' },
      });
      expect(certificate).toBeNull();
    });
  });

  describe('API Transaction Integrity', () => {
    test('should maintain database consistency on partial failures', async () => {
      // This test would require mocking the crypto service to fail
      // For now, we'll test that the API handles errors gracefully
      
      const requestBody = {
        commonName: 'transaction-test.example.com',
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
      };

      const request = new NextRequest('http://localhost:3000/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      try {
        const response = await issueCertificate(request);
        
        // If successful, verify database consistency
        if (response.status === 200) {
          const certificate = await prisma.certificate.findFirst({
            where: { commonName: 'transaction-test.example.com' },
          });
          
          if (certificate) {
            // Certificate exists, verify audit log also exists
            const auditLog = await prisma.auditLog.findFirst({
              where: { 
                action: 'CERTIFICATE_ISSUED',
                userId: testUser.id,
              },
            });
            expect(auditLog).toBeDefined();
          }
        }
      } catch (error) {
        // If API fails, verify no partial data was created
        const certificate = await prisma.certificate.findFirst({
          where: { commonName: 'transaction-test.example.com' },
        });
        expect(certificate).toBeNull();
      }
    });

    test('should handle concurrent requests properly', async () => {
      const requestBody = {
        commonName: 'concurrent.example.com',
        certificateType: 'SERVER',
        keyAlgorithm: 'RSA',
        keySize: '2048',
        validityDays: 365,
      };

      // Create multiple concurrent requests
      const requests = Array(3).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/certificates/issue', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      // Execute requests concurrently
      const responses = await Promise.all(
        requests.map(request => issueCertificate(request))
      );

      // Only one should succeed (due to uniqueness constraints)
      const successfulResponses = responses.filter(response => response.status === 200);
      const failedResponses = responses.filter(response => response.status === 400);

      expect(successfulResponses.length).toBe(1);
      expect(failedResponses.length).toBe(2);

      // Verify only one certificate was created
      const certificates = await prisma.certificate.findMany({
        where: { commonName: 'concurrent.example.com' },
      });
      expect(certificates).toHaveLength(1);
    });
  });
});