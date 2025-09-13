import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Package, Mail, User, Shield, Download, Edit3, Save, LogOut, Menu, X, BarChart3, Users, FileText, Settings, Activity, Server, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Textarea } from './components/ui/textarea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from './utils/supabase/info';

type Page = 'home' | 'download' | 'contact' | 'admin';

interface AdminData {
  systemStats: {
    totalUsers: number;
    activeScripts: number;
    systemUptime: string;
    memoryUsage: number;
  };
  recentActivity: Activity[];
  serverLogs: LogEntry[];
  userManagement: User[];
}

interface Activity {
  id: string;
  timestamp: string;
  type: 'login' | 'script_executed' | 'user_created' | 'system_error';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  source: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  lastActive: string;
  status: 'online' | 'offline' | 'banned';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [adminData, setAdminData] = useState<AdminData>({
    systemStats: {
      totalUsers: 0,
      activeScripts: 0,
      systemUptime: '',
      memoryUsage: 0
    },
    recentActivity: [],
    serverLogs: [],
    userManagement: []
  });
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'users' | 'logs' | 'settings'>('dashboard');
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const apiBase = `https://${projectId}.supabase.co/functions/v1/make-server-d6af8885`;

  useEffect(() => {
    // Loading animation
    setTimeout(() => setIsLoading(false), 2000);
    
    // Check if user is already logged in
    const token = localStorage.getItem('tearsToken');
    if (token && token.length >= 30) {
      validateToken(token);
    }
  }, []);

  const validateToken = async (token: string) => {
    // Check if it's a mock/demo token
    if (token.startsWith('mock_') || token.startsWith('demo_')) {
      setIsLoggedIn(true);
      setUserToken(token);
      setUserId('admin_user');
      setAdminData(generateMockAdminData());
      toast.info('Demo session restored');
      return;
    }
    
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${apiBase}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ token }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (result.success) {
        setIsLoggedIn(true);
        setUserToken(token);
        setUserId(result.userId);
        loadAdminData(token, result.userId);
      } else {
        localStorage.removeItem('tearsToken');
        setIsLoggedIn(false);
        setUserToken(null);
        setUserId(null);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      
      // If server is unavailable but we have a valid length token, allow demo mode
      if (token && token.length >= 30) {
        const demoToken = 'demo_' + token.substring(5, 20);
        localStorage.setItem('tearsToken', demoToken);
        setIsLoggedIn(true);
        setUserToken(demoToken);
        setUserId('admin_user');
        setAdminData(generateMockAdminData());
        toast.warning('Server unavailable - switched to demo mode');
      } else {
        localStorage.removeItem('tearsToken');
        setIsLoggedIn(false);
        setUserToken(null);
        setUserId(null);
      }
    }
  };

  const handleLogin = async (secretCode: string) => {
    if (secretCode === 'tears2024') {
      // Direct login without backend for now
      const mockToken = 'mock_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      localStorage.setItem('tearsToken', mockToken);
      setUserToken(mockToken);
      setUserId('admin_user');
      setIsLoggedIn(true);
      setCurrentPage('admin');
      
      // Load demo data immediately
      setAdminData(generateMockAdminData());
      toast.success('Welcome to Tears Executor Admin Portal');
      toast.info('Running in demo mode with simulated data');
      
      return;
    }
    
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ secretCode }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (result.success) {
        localStorage.setItem('tearsToken', result.token);
        setUserToken(result.token);
        setUserId('admin_user');
        setIsLoggedIn(true);
        setCurrentPage('admin');
        await loadAdminData(result.token, 'admin_user');
        toast.success('Welcome to Tears Executor Admin Portal');
      } else {
        toast.error('Invalid secret code');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // If it's the correct secret code but server is unavailable, allow demo login
      if (secretCode === 'tears2024') {
        const mockToken = 'demo_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('tearsToken', mockToken);
        setUserToken(mockToken);
        setUserId('admin_user');
        setIsLoggedIn(true);
        setCurrentPage('admin');
        setAdminData(generateMockAdminData());
        toast.success('Welcome to Tears Executor Admin Portal (Demo Mode)');
        toast.warning('Server unavailable - using demo data');
      } else {
        toast.error('Login failed. Please try again.');
      }
    }
  };



  const loadAdminData = async (token: string, userId: string) => {
    try {
      console.log('Loading admin data with token:', token?.substring(0, 10) + '...', 'userId:', userId);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${apiBase}/admin/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-Custom-Token': token,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Admin data response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Admin data error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Admin data result:', result);
      
      if (result.success) {
        setAdminData(result.data);
        console.log('Admin data loaded successfully');
        toast.success('Admin data loaded from server');
      } else {
        console.error('Failed to load admin data:', result.message);
        toast.error(`Failed to load admin data: ${result.message}`);
        // Use mock data as fallback
        setAdminData(generateMockAdminData());
        toast.warning('Using demo data - server data unavailable');
      }
    } catch (error) {
      console.error('Admin load error:', error);
      
      // Check if it's a network error
      if (error.name === 'AbortError') {
        console.log('Request timed out - using mock data');
        toast.warning('Connection timeout - using demo data');
      } else if (error.message.includes('Failed to fetch')) {
        console.log('Network error - using mock data');
        toast.warning('Server unavailable - using demo data');
      } else {
        console.log('Unknown error - using mock data');
        toast.warning('Connection error - using demo data');
      }
      
      // Always use mock data if API fails
      setAdminData(generateMockAdminData());
      console.log('Using mock admin data due to error');
    }
  };

  const generateMockAdminData = (): AdminData => {
    const now = new Date();
    return {
      systemStats: {
        totalUsers: 1247,
        activeScripts: 89,
        systemUptime: '7d 14h 32m',
        memoryUsage: 68.4
      },
      recentActivity: [
        { id: '1', timestamp: new Date(now.getTime() - 300000).toISOString(), type: 'login', description: 'Admin login successful', severity: 'low' },
        { id: '2', timestamp: new Date(now.getTime() - 600000).toISOString(), type: 'script_executed', description: 'Speed hack script executed by user_942', severity: 'medium' },
        { id: '3', timestamp: new Date(now.getTime() - 900000).toISOString(), type: 'user_created', description: 'New user registration: darkgamer2024', severity: 'low' },
        { id: '4', timestamp: new Date(now.getTime() - 1200000).toISOString(), type: 'system_error', description: 'Rate limit exceeded for IP 192.168.1.100', severity: 'high' }
      ],
      serverLogs: [
        { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Server startup completed', source: 'System' },
        { id: '2', timestamp: new Date(now.getTime() - 120000).toISOString(), level: 'warning', message: 'High memory usage detected', source: 'Monitor' },
        { id: '3', timestamp: new Date(now.getTime() - 240000).toISOString(), level: 'error', message: 'Failed authentication attempt', source: 'Auth' },
        { id: '4', timestamp: new Date(now.getTime() - 360000).toISOString(), level: 'info', message: 'Script library updated', source: 'Scripts' }
      ],
      userManagement: [
        { id: '1', username: 'admin', email: 'admin@tears.local', role: 'admin', lastActive: new Date().toISOString(), status: 'online' },
        { id: '2', username: 'darkgamer2024', email: 'gamer@example.com', role: 'user', lastActive: new Date(now.getTime() - 300000).toISOString(), status: 'online' },
        { id: '3', username: 'scriptKid123', email: 'scripter@example.com', role: 'user', lastActive: new Date(now.getTime() - 3600000).toISOString(), status: 'offline' },
        { id: '4', username: 'hacker_pro', email: 'banned@example.com', role: 'user', lastActive: new Date(now.getTime() - 86400000).toISOString(), status: 'banned' }
      ]
    };
  };

  const exportData = (type: 'logs' | 'users' | 'activity') => {
    let data: any;
    let filename: string;
    
    switch (type) {
      case 'logs':
        data = adminData.serverLogs;
        filename = 'server_logs.json';
        break;
      case 'users':
        data = adminData.userManagement;
        filename = 'user_data.json';
        break;
      case 'activity':
        data = adminData.recentActivity;
        filename = 'activity_log.json';
        break;
    }
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', filename);
    linkElement.click();
    toast.success(`${type} data exported successfully`);
  };

  const logout = async () => {
    if (userToken) {
      try {
        await fetch(`${apiBase}/logout`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Custom-Token': userToken,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('tearsToken');
    setIsLoggedIn(false);
    setUserToken(null);
    setUserId(null);
    setCurrentPage('home');
    setAdminData({
      systemStats: { totalUsers: 0, activeScripts: 0, systemUptime: '', memoryUsage: 0 },
      recentActivity: [],
      serverLogs: [],
      userManagement: []
    });
    toast.success('Logged out successfully');
  };

  const toggleUserStatus = (userId: string) => {
    setAdminData(prev => ({
      ...prev,
      userManagement: prev.userManagement.map(user => 
        user.id === userId 
          ? { ...user, status: user.status === 'banned' ? 'offline' : 'banned' as const }
          : user
      )
    }));
    toast.success('User status updated');
  };

  const clearLogs = () => {
    setAdminData(prev => ({
      ...prev,
      serverLogs: []
    }));
    toast.success('Server logs cleared');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold text-white"
          >
            Tears Executor
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-gray-400 mt-2"
          >
            Loading the best Roblox experience...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 w-full bg-black/80 backdrop-blur-md border-b border-blue-500/20 z-50"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <Shield className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold text-white">Tears Executor</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <NavButton
                active={currentPage === 'home'}
                onClick={() => setCurrentPage('home')}
                icon={<Home className="h-4 w-4" />}
                text="Home"
              />
              <NavButton
                active={currentPage === 'download'}
                onClick={() => setCurrentPage('download')}
                icon={<Download className="h-4 w-4" />}
                text="Download"
              />
              <NavButton
                active={currentPage === 'contact'}
                onClick={() => setCurrentPage('contact')}
                icon={<Mail className="h-4 w-4" />}
                text="Contact"
              />
              {isLoggedIn && (
                <NavButton
                  active={currentPage === 'admin'}
                  onClick={() => setCurrentPage('admin')}
                  icon={<User className="h-4 w-4" />}
                  text="Admin"
                />
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-black/90 border-t border-blue-500/20"
            >
              <div className="container mx-auto px-4 py-4 space-y-2">
                <MobileNavButton
                  onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}
                  icon={<Home className="h-4 w-4" />}
                  text="Home"
                />
                <MobileNavButton
                  onClick={() => { setCurrentPage('download'); setMobileMenuOpen(false); }}
                  icon={<Download className="h-4 w-4" />}
                  text="Download"
                />
                <MobileNavButton
                  onClick={() => { setCurrentPage('contact'); setMobileMenuOpen(false); }}
                  icon={<Mail className="h-4 w-4" />}
                  text="Contact"
                />
                {isLoggedIn && (
                  <MobileNavButton
                    onClick={() => { setCurrentPage('admin'); setMobileMenuOpen(false); }}
                    icon={<User className="h-4 w-4" />}
                    text="Admin"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Main Content */}
      <main className="pt-16">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="container mx-auto px-4 py-12"
            >
              <HomePage 
                loginForm={loginForm}
                setLoginForm={setLoginForm}
                handleLogin={handleLogin}
                isLoggedIn={isLoggedIn}
                setCurrentPage={setCurrentPage}
              />
            </motion.div>
          )}

          {currentPage === 'download' && (
            <motion.div
              key="download"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="container mx-auto px-4 py-12"
            >
              <DownloadPage />
            </motion.div>
          )}

          {currentPage === 'contact' && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="container mx-auto px-4 py-12"
            >
              <ContactPage />
            </motion.div>
          )}

          {currentPage === 'admin' && isLoggedIn && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="container mx-auto px-4 py-12"
            >
              <AdminPage
                adminData={adminData}
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                exportData={exportData}
                logout={logout}
                toggleUserStatus={toggleUserStatus}
                clearLogs={clearLogs}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Navigation Components
function NavButton({ active, onClick, icon, text }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
      <span>{text}</span>
    </motion.button>
  );
}

function MobileNavButton({ onClick, icon, text }: {
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-3 w-full px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}

// Page Components
function HomePage({ loginForm, setLoginForm, handleLogin, isLoggedIn, setCurrentPage }: {
  loginForm: { username: string; password: string };
  setLoginForm: React.Dispatch<React.SetStateAction<{ username: string; password: string }>>;
  handleLogin: (secretCode: string) => void;
  isLoggedIn: boolean;
  setCurrentPage: React.Dispatch<React.SetStateAction<Page>>;
}) {
  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <motion.h1
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-bold text-white mb-6"
        >
          Tears Executor
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-gray-300 mb-8"
        >
          The most powerful and reliable Roblox script executor
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3">
            Download Now
          </Button>
          <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10 px-8 py-3">
            View Features
          </Button>
        </motion.div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-white mb-6">
            Premium Features
          </h2>
          <div className="space-y-4">
            <FeatureItem text="Lightning-fast script execution" />
            <FeatureItem text="Advanced anti-detection system" />
            <FeatureItem text="Regular updates and support" />
            <FeatureItem text="User-friendly interface" />
            <FeatureItem text="Huge script library" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
        >
          <Card className="bg-black/50 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-white text-center">
                Why Choose Tears?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="text-gray-300">Undetectable execution</span>
              </div>
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-green-500" />
                <span className="text-gray-300">1000+ pre-loaded scripts</span>
              </div>
              <div className="flex items-center space-x-3">
                <Download className="h-5 w-5 text-purple-500" />
                <span className="text-gray-300">Regular updates</span>
              </div>
              <div className="mt-6">
                {isLoggedIn ? (
                  <div className="text-center space-y-2">
                    <p className="text-green-400">✓ Premium Access Active</p>
                    <Button 
                      onClick={() => setCurrentPage('admin')}
                      className="w-full bg-green-500 hover:bg-green-600"
                    >
                      Access Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-gray-400 text-sm">Secret admin access available</p>
                    <Input
                      type="password"
                      placeholder="Enter secret code..."
                      className="bg-gray-800 border-gray-600 text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value;
                          handleLogin(value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <motion.div
      whileHover={{ x: 10 }}
      className="flex items-center space-x-3"
    >
      <div className="w-2 h-2 bg-blue-500 rounded-full" />
      <span className="text-gray-300">{text}</span>
    </motion.div>
  );
}

function DownloadPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-white mb-4">
          Download Tears Executor
        </h1>
        <p className="text-xl text-gray-300">
          Get the most powerful Roblox script executor
        </p>
      </motion.div>

      <div className="grid gap-8">
        {/* Download Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/50 border-blue-500/20 text-center">
            <CardContent className="pt-12 pb-12">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
              >
                <Download className="h-12 w-12 text-white" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                Coming Soon!
              </h2>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">
                Tears Executor is currently in final development. We're putting the finishing touches 
                on the most advanced and secure Roblox script executor ever created.
              </p>
              
              <div className="flex items-center justify-center space-x-2 mb-6">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              
              <Button disabled className="bg-gray-600 text-gray-400 cursor-not-allowed px-8 py-3">
                Download Not Available Yet
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-black/50 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-white text-center">What to Expect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <span className="text-gray-300">Advanced anti-detection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-blue-500" />
                    <span className="text-gray-300">Built-in script library</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Download className="h-5 w-5 text-purple-500" />
                    <span className="text-gray-300">Regular updates</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-orange-500" />
                    <span className="text-gray-300">User-friendly interface</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-red-500" />
                    <span className="text-gray-300">Premium support</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-yellow-500" />
                    <span className="text-gray-300">Lightning-fast execution</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Release Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-black/50 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-white text-center">Release Information</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-4">
                Join our community to be the first to know when Tears Executor is ready for download!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
                  Join Discord
                </Button>
                <Button variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10">
                  Follow Updates
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-white mb-4">
          Contact
        </h1>
        <p className="text-xl text-gray-300">
          Get in touch with our team
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <Card className="bg-black/50 border-yellow-500/30">
          <CardContent className="pt-16 pb-16">
            <motion.div
              animate={{ 
                rotateY: [0, 360],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center"
            >
              <Mail className="h-12 w-12 text-white" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-bold text-white mb-6"
            >
              🚧 Under Construction 🚧
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-gray-300 mb-8 max-w-md mx-auto"
            >
              Our contact system is currently being built. We're working hard to bring you 
              the best support experience possible!
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center space-x-2 text-yellow-400">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" />
                <span>Coming Soon</span>
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              </div>
              
              <p className="text-gray-400 text-sm">
                For urgent matters, please check our Discord community
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Temporary Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="mt-12"
      >
        <Card className="bg-black/30 border-gray-500/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Temporary Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3 text-gray-300">
              <Shield className="h-5 w-5 text-blue-500" />
              <span>Discord: tears_executor (Coming Soon)</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-gray-300">
              <Mail className="h-5 w-5 text-green-500" />
              <span>Email: support@tearsexecutor.com (In Development)</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function AdminPage({ adminData, selectedTab, setSelectedTab, exportData, logout, toggleUserStatus, clearLogs }: {
  adminData: AdminData;
  selectedTab: 'dashboard' | 'users' | 'logs' | 'settings';
  setSelectedTab: React.Dispatch<React.SetStateAction<'dashboard' | 'users' | 'logs' | 'settings'>>;
  exportData: (type: 'logs' | 'users' | 'activity') => void;
  logout: () => void;
  toggleUserStatus: (userId: string) => void;
  clearLogs: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <h1 className="text-4xl font-bold text-white">Tears Executor Admin Portal</h1>
        <Button
          onClick={logout}
          variant="outline"
          className="border-red-500 text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex space-x-1 mb-8 bg-black/30 p-1 rounded-lg"
      >
        <TabButton
          active={selectedTab === 'dashboard'}
          onClick={() => setSelectedTab('dashboard')}
          icon={<BarChart3 className="h-4 w-4" />}
          text="Dashboard"
        />
        <TabButton
          active={selectedTab === 'users'}
          onClick={() => setSelectedTab('users')}
          icon={<Users className="h-4 w-4" />}
          text="Users"
        />
        <TabButton
          active={selectedTab === 'logs'}
          onClick={() => setSelectedTab('logs')}
          icon={<FileText className="h-4 w-4" />}
          text="Logs"
        />
        <TabButton
          active={selectedTab === 'settings'}
          onClick={() => setSelectedTab('settings')}
          icon={<Settings className="h-4 w-4" />}
          text="Settings"
        />
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {selectedTab === 'dashboard' && (
          <DashboardTab 
            key="dashboard" 
            adminData={adminData} 
            exportData={exportData}
          />
        )}
        {selectedTab === 'users' && (
          <UsersTab 
            key="users" 
            users={adminData.userManagement} 
            toggleUserStatus={toggleUserStatus}
            exportData={exportData}
          />
        )}
        {selectedTab === 'logs' && (
          <LogsTab 
            key="logs" 
            logs={adminData.serverLogs} 
            clearLogs={clearLogs}
            exportData={exportData}
          />
        )}
        {selectedTab === 'settings' && (
          <SettingsTab key="settings" />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, text }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
        active
          ? 'bg-blue-500 text-white shadow-lg'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
      <span>{text}</span>
    </Button>
  );
}

function DashboardTab({ adminData, exportData }: { 
  adminData: AdminData; 
  exportData: (type: 'logs' | 'users' | 'activity') => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid gap-6"
    >
      {/* System Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={adminData.systemStats.totalUsers.toLocaleString()}
          icon={<Users className="h-6 w-6 text-blue-500" />}
          trend="+12%"
        />
        <StatCard
          title="Active Scripts"
          value={adminData.systemStats.activeScripts}
          icon={<Package className="h-6 w-6 text-green-500" />}
          trend="+5%"
        />
        <StatCard
          title="Uptime"
          value={adminData.systemStats.systemUptime}
          icon={<Server className="h-6 w-6 text-purple-500" />}
        />
        <StatCard
          title="Memory Usage"
          value={`${adminData.systemStats.memoryUsage}%`}
          icon={<BarChart3 className="h-6 w-6 text-orange-500" />}
          trend={adminData.systemStats.memoryUsage > 80 ? 'high' : 'normal'}
        />
      </div>

      {/* Recent Activity */}
      <Card className="bg-black/50 border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <span>Recent Activity</span>
          </CardTitle>
          <Button
            onClick={() => exportData('activity')}
            variant="outline"
            size="sm"
            className="border-gray-500 text-gray-400 hover:bg-gray-500/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {adminData.recentActivity.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.severity === 'high' ? 'bg-red-500' :
                  activity.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div>
                  <p className="text-white text-sm">{activity.description}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${
                activity.type === 'login' ? 'bg-blue-500/20 text-blue-400' :
                activity.type === 'script_executed' ? 'bg-purple-500/20 text-purple-400' :
                activity.type === 'user_created' ? 'bg-green-500/20 text-green-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {activity.type.replace('_', ' ')}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function UsersTab({ users, toggleUserStatus, exportData }: { 
  users: User[]; 
  toggleUserStatus: (userId: string) => void;
  exportData: (type: 'logs' | 'users' | 'activity') => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-black/50 border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>User Management</span>
          </CardTitle>
          <Button
            onClick={() => exportData('users')}
            variant="outline"
            size="sm"
            className="border-gray-500 text-gray-400 hover:bg-gray-500/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    user.status === 'online' ? 'bg-green-500' :
                    user.status === 'offline' ? 'bg-gray-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-white font-medium">{user.username}</p>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                    <p className="text-gray-500 text-xs">
                      Last active: {new Date(user.lastActive).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs ${
                    user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                    user.role === 'moderator' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {user.role}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    user.status === 'online' ? 'bg-green-500/20 text-green-400' :
                    user.status === 'offline' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {user.status}
                  </div>
                  {user.role !== 'admin' && (
                    <Button
                      onClick={() => toggleUserStatus(user.id)}
                      variant="outline"
                      size="sm"
                      className={user.status === 'banned' 
                        ? "border-green-500 text-green-400 hover:bg-green-500/10"
                        : "border-red-500 text-red-400 hover:bg-red-500/10"
                      }
                    >
                      {user.status === 'banned' ? 'Unban' : 'Ban'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LogsTab({ logs, clearLogs, exportData }: { 
  logs: LogEntry[]; 
  clearLogs: () => void;
  exportData: (type: 'logs' | 'users' | 'activity') => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-black/50 border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span>Server Logs</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              onClick={() => exportData('logs')}
              variant="outline"
              size="sm"
              className="border-gray-500 text-gray-400 hover:bg-gray-500/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={clearLogs}
              variant="outline"
              size="sm"
              className="border-red-500 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No logs available
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-800/30 rounded text-sm font-mono">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    log.level === 'error' ? 'bg-red-500' :
                    log.level === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 text-gray-400 text-xs mb-1">
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="uppercase">{log.level}</span>
                      <span>•</span>
                      <span>{log.source}</span>
                    </div>
                    <p className="text-white break-words">{log.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SettingsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid gap-6"
    >
      <Card className="bg-black/50 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-500" />
            <span>System Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Script Management</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Auto-update scripts</Label>
                  <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0 top-0"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Allow user uploads</Label>
                  <div className="w-8 h-4 bg-gray-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute left-0 top-0"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Enable logging</Label>
                  <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0 top-0"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Security</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Two-factor auth</Label>
                  <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0 top-0"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Rate limiting</Label>
                  <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0 top-0"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">IP whitelisting</Label>
                  <div className="w-8 h-4 bg-gray-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute left-0 top-0"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-white mb-4">Danger Zone</h3>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
              >
                Reset Statistics
              </Button>
              <Button
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
              >
                Clear All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatCard({ title, value, icon, trend }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <Card className="bg-black/50 border-blue-500/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-white text-2xl font-bold">{value}</p>
            {trend && (
              <p className={`text-sm ${
                trend === 'high' ? 'text-red-400' :
                trend.startsWith('+') ? 'text-green-400' : 'text-gray-400'
              }`}>
                {trend === 'high' ? '⚠️ High' : trend}
              </p>
            )}
          </div>
          <div className="opacity-80">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}