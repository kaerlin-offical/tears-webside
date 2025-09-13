import { Hono } from 'npm:hono@4.5.8';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

const app = new Hono();

// CORS and logging
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Custom-Token'],
}));
app.use('*', logger(console.log));

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Generate secure token
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let token = '';
  for (let i = 0; i < 40; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Validate token
async function validateToken(token: string): Promise<string | null> {
  try {
    console.log('Validating token:', token?.substring(0, 10) + '...');
    const tokenData = await kv.get(`token:${token}`);
    console.log('Token lookup result:', tokenData);
    
    if (tokenData && tokenData.userId) {
      // Check if token is expired (24 hours = 86400000ms)
      const isExpired = Date.now() - tokenData.timestamp > 86400000;
      if (isExpired) {
        console.log('Token expired');
        await kv.del(`token:${token}`);
        return null;
      }
      return tokenData.userId;
    }
    return null;
  } catch (error) {
    console.log('Token validation error:', error);
    return null;
  }
}

// Routes
app.post('/make-server-d6af8885/login', async (c) => {
  try {
    // Rate limiting pro IP (max. 5 Versuche pro 10 Minuten)
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || c.req.raw.conn.remoteAddr?.hostname || 'unknown';
    const rateKey = `login_attempts:${ip}`;
    let attempts = (await kv.get(rateKey)) || { count: 0, last: Date.now() };
    if (Date.now() - attempts.last > 10 * 60 * 1000) {
      attempts = { count: 0, last: Date.now() };
    }
    if (attempts.count >= 5) {
      await kv.set(rateKey, { count: attempts.count, last: attempts.last });
      return c.json({ success: false, message: 'Too many login attempts. Please wait 10 minutes.' }, 429);
    }

    const { secretCode } = await c.req.json();
    console.log('Login attempt with code:', secretCode, 'from IP:', ip);

    if (secretCode === 'tears2024') {
      const token = generateSecureToken();
      const userId = 'admin_user';
      console.log('Generated token:', token.substring(0, 10) + '...');
      console.log('Storing token for userId:', userId);
      await kv.set(`token:${token}`, { userId, timestamp: Date.now() });
      const storedData = await kv.get(`token:${token}`);
      console.log('Verification - stored data:', storedData);
      // Reset attempts on success
      await kv.set(rateKey, { count: 0, last: Date.now() });
      return c.json({ success: true, token, message: 'Login successful' });
    } else {
      // Log failed login
      const logKey = `failed_login:${ip}:${Date.now()}`;
      await kv.set(logKey, { ip, timestamp: Date.now(), reason: 'Invalid secret code' });
      attempts.count += 1;
      attempts.last = Date.now();
      await kv.set(rateKey, attempts);
      return c.json({ success: false, message: 'Invalid secret code' }, 401);
    }
  } catch (error) {
    console.log('Login error:', error);
    return c.json({ success: false, message: 'Login failed' }, 500);
  }
  try {
    const { secretCode } = await c.req.json();
    console.log('Login attempt with code:', secretCode);
    
    // moved up in new logic
      const token = generateSecureToken();
      const userId = 'admin_user';
      
      console.log('Generated token:', token.substring(0, 10) + '...');
      console.log('Storing token for userId:', userId);
      
      // Store token with expiration (24 hours)
      // Store as JSON object to match JSONB column type
      await kv.set(`token:${token}`, { userId, timestamp: Date.now() });
      
      // Verify storage worked
      const storedData = await kv.get(`token:${token}`);
      console.log('Verification - stored data:', storedData);
      
      return c.json({ 
        success: true, 
        token,
        message: 'Login successful'
      });
    } else {
      return c.json({ 
        success: false, 
        message: 'Invalid secret code' 
      }, 401);
    }
  } catch (error) {
    console.log('Login error:', error);
    return c.json({ 
      success: false, 
      message: 'Login failed' 
    }, 500);
  }
});

app.post('/make-server-d6af8885/validate', async (c) => {
  try {
    const { token } = await c.req.json();
    console.log('Validate endpoint - token:', token?.substring(0, 10) + '...');
    
    const userId = await validateToken(token);
    console.log('Validate endpoint - userId:', userId);
    
    if (userId) {
      return c.json({ 
        success: true, 
        userId,
        message: 'Token valid' 
      });
    } else {
      return c.json({ 
        success: false, 
        message: 'Invalid token' 
      }, 401);
    }
  } catch (error) {
    console.log('Token validation error:', error);
    return c.json({ 
      success: false, 
      message: 'Validation failed' 
    }, 500);
  }
});

app.get('/make-server-d6af8885/admin/:userId', async (c) => {
  try {
    const customToken = c.req.header('X-Custom-Token');
    const userId = c.req.param('userId');
    
    console.log('Admin request - Custom Token:', customToken?.substring(0, 10) + '...', 'UserId:', userId);
    
    if (!customToken) {
      console.log('No custom token provided');
      return c.json({ 
        success: false, 
        message: 'No custom token provided' 
      }, 401);
    }
    
    const validatedUserId = await validateToken(customToken);
    console.log('Token validation result:', validatedUserId);
    
    if (!validatedUserId) {
      console.log('Token validation failed');
      return c.json({ 
        success: false, 
        message: 'Invalid token' 
      }, 401);
    }
    
    const adminData = await kv.get(`admin:${userId}`);
    
    if (adminData) {
      return c.json({ 
        success: true, 
        data: JSON.parse(adminData)
      });
    } else {
      // Return mock admin data if none exists
      const mockData = {
        systemStats: {
          totalUsers: 1247,
          activeScripts: 89,
          systemUptime: '7d 14h 32m',
          memoryUsage: 68.4
        },
        recentActivity: [
          { id: '1', timestamp: new Date().toISOString(), type: 'login', description: 'Admin login successful', severity: 'low' },
          { id: '2', timestamp: new Date(Date.now() - 600000).toISOString(), type: 'script_executed', description: 'Speed hack script executed by user_942', severity: 'medium' }
        ],
        serverLogs: [
          { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Server startup completed', source: 'System' },
          { id: '2', timestamp: new Date(Date.now() - 120000).toISOString(), level: 'warning', message: 'High memory usage detected', source: 'Monitor' }
        ],
        userManagement: [
          { id: '1', username: 'admin', email: 'admin@tears.local', role: 'admin', lastActive: new Date().toISOString(), status: 'online' },
          { id: '2', username: 'darkgamer2024', email: 'gamer@example.com', role: 'user', lastActive: new Date(Date.now() - 300000).toISOString(), status: 'online' }
        ]
      };
      
      return c.json({ 
        success: true, 
        data: mockData
      });
    }
  } catch (error) {
    console.log('Admin data fetch error:', error);
    return c.json({ 
      success: false, 
      message: `Failed to fetch admin data: ${error.message}` 
    }, 500);
  }
});

app.post('/make-server-d6af8885/admin/:userId', async (c) => {
  try {
    const customToken = c.req.header('X-Custom-Token');
    const userId = c.req.param('userId');
    
    const validatedUserId = await validateToken(customToken);
    if (!customToken || !validatedUserId) {
      return c.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, 401);
    }
    
    const adminData = await c.req.json();
    
    // Validate admin data structure
    if (!adminData.systemStats || !Array.isArray(adminData.recentActivity)) {
      return c.json({ 
        success: false, 
        message: 'Invalid admin data structure' 
      }, 400);
    }
    
    await kv.set(`admin:${userId}`, JSON.stringify(adminData));
    
    return c.json({ 
      success: true, 
      message: 'Admin data saved successfully'
    });
  } catch (error) {
    console.log('Admin save error:', error);
    return c.json({ 
      success: false, 
      message: `Failed to save admin data: ${error.message}` 
    }, 500);
  }
});

app.delete('/make-server-d6af8885/logout', async (c) => {
  try {
    const customToken = c.req.header('X-Custom-Token');
    
    if (customToken) {
      await kv.del(`token:${customToken}`);
    }
    
    return c.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.log('Logout error:', error);
    return c.json({ 
      success: false, 
      message: `Logout failed: ${error.message}` 
    }, 500);
  }
});

// Health check
app.get('/make-server-d6af8885/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

Deno.serve(app.fetch);