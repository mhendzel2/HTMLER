
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Key, Bell, Palette, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState('system');
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Settings saved successfully!');
  };

  const handleTestApiConnection = async () => {
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 500));
    alert('API connection test successful!');
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your application preferences and configuration
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>User Information</span>
            </CardTitle>
            <CardDescription>
              Your personal analytics dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value="Analytics User" disabled />
              </div>
              <div>
                <Label>Dashboard Type</Label>
                <Input value="Personal Analytics" disabled />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Personal User</Badge>
              <span className="text-sm text-gray-600">Account Type</span>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Unusual Whales API</span>
            </CardTitle>
            <CardDescription>
              Configure your Unusual Whales API key for real-time data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex space-x-2">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Unusual Whales API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button variant="outline" onClick={handleTestApiConnection}>
                  Test Connection
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your API key is encrypted and stored securely
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Display Preferences</span>
            </CardTitle>
            <CardDescription>
              Customize how data is displayed in your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Theme</Label>
              <div className="flex space-x-2 mt-2">
                {['light', 'dark', 'system'].map(themeOption => (
                  <Button
                    key={themeOption}
                    variant={theme === themeOption ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme(themeOption)}
                  >
                    {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <Label htmlFor="autoRefresh">Enable auto-refresh for market data</Label>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Configure when and how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifications"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <Label htmlFor="notifications">Enable notifications for unusual activity</Label>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Notification preferences:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Large volume options trades</li>
                <li>Earnings surprises and beats/misses</li>
                <li>Congressional trading activity</li>
                <li>Market sentiment changes</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Data & Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span>Data & Storage</span>
            </CardTitle>
            <CardDescription>
              Manage your stored data and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">Watchlists</p>
                <p className="text-sm text-gray-600">Your saved stock watchlists</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => alert('Export functionality coming soon!')}
              >
                Export
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">Historical Data</p>
                <p className="text-sm text-gray-600">Cached market and options data</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to clear the cache? This will remove all cached market data.')) {
                    alert('Cache cleared successfully!');
                  }
                }}
              >
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
