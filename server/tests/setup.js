process.env.NODE_ENV = 'test';
// Make sure mock payments are available so the full payment path can run.
process.env.ENABLE_MOCK_PAYMENTS = process.env.ENABLE_MOCK_PAYMENTS || 'true';
