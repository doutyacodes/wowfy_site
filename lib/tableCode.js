import crypto from 'crypto';

const SECRET_KEY = process.env.TABLE_CODE_SECRET || 'wowfy-table-secret-key';

// Generate a 6-digit code from table ID
export function generateTableCode(tableId) {
  const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
  const expiresAt = timestamp + (5 * 60); // Expires in 5 minutes
  
  const data = `${tableId}:${expiresAt}`;
  const hash = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
  
  // Take first 6 characters and ensure they're numbers
  const code = parseInt(hash.substring(0, 8), 16).toString().substring(0, 6).padStart(6, '0');
  
  return {
    code,
    expiresAt: new Date(expiresAt * 1000),
    tableId
  };
}

// Verify and decode a 6-digit table code
export function verifyTableCode(code, tableId) {
  if (!code || code.length !== 6) {
    return { valid: false, error: 'Invalid code format' };
  }

  // Generate codes for the last 6 minutes to account for timing
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = 0; i < 6; i++) {
    const testTimestamp = now - (i * 60); // Check each minute back
    const expiresAt = testTimestamp + (5 * 60);
    
    if (expiresAt < now) continue; // Skip if expired
    
    const data = `${tableId}:${expiresAt}`;
    const hash = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
    const expectedCode = parseInt(hash.substring(0, 8), 16).toString().substring(0, 6).padStart(6, '0');
    
    if (expectedCode === code) {
      return {
        valid: true,
        tableId,
        expiresAt: new Date(expiresAt * 1000)
      };
    }
  }
  
  return { valid: false, error: 'Invalid or expired code' };
}

// Generate a simple moderator code for table access (for demo purposes)
export function generateModeratorCode(tableId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `MOD:${tableId}:${timestamp}`;
  const hash = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
  return hash.substring(0, 8).toUpperCase();
}