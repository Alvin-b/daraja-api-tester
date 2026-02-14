import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Download, Save, Server } from "lucide-react";

interface Settings {
  id?: string;
  router_name: string;
  router_ip: string;
  api_port: number;
  api_username: string;
  api_password: string;
  hotspot_server: string;
  dns_name: string;
  portal_url: string;
}

const defaultSettings: Settings = {
  router_name: 'Main Router',
  router_ip: '',
  api_port: 8728,
  api_username: 'admin',
  api_password: '',
  hotspot_server: 'hotspot1',
  dns_name: '',
  portal_url: '',
};

const MikroTikSettings = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('mikrotik_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) setSettings(data as Settings);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await supabase.from('mikrotik_settings').update(settings).eq('id', settings.id);
      } else {
        const { data } = await supabase.from('mikrotik_settings').insert(settings).select().single();
        if (data) setSettings(data as Settings);
      }
      toast({ title: 'Settings saved' });
    } catch {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    }
    setSaving(false);
  };

  const portalUrl = settings.portal_url || window.location.origin + '/portal';

  const generateRscScript = () => {
    return `/ip hotspot walled-garden
add dst-host=${new URL(portalUrl).hostname} action=allow comment="WiFi Billing Portal"

/ip hotspot walled-garden ip
add dst-address=${new URL(portalUrl).hostname} action=accept comment="WiFi Billing Portal"

# Configure hotspot server profile to use external login page
/ip hotspot profile
set [find name=default] login-by=http-chap,http-pap html-directory=hotspot \\
  http-cookie-lifetime=1d rate-limit=${settings.hotspot_server === 'hotspot1' ? '5M/5M' : '10M/10M'}

# RADIUS client configuration
/radius
add address=${new URL(portalUrl).hostname} secret=radius_shared_secret \\
  service=hotspot comment="WiFi Billing RADIUS"

/ip hotspot profile
set [find name=default] use-radius=yes radius-accounting=yes \\
  radius-interim-update=00:05:00

# Redirect to external portal
/ip hotspot profile
set [find name=default] login-by=http-pap \\
  html-directory=hotspot

# Create hotspot login page redirect
/file print file=hotspot/login.html
# Replace the content of hotspot/login.html with the redirect file

# DNS configuration for captive portal
/ip dns static
add name=${settings.dns_name || 'wifi.local'} address=${settings.router_ip || '192.168.88.1'} comment="Captive Portal DNS"
`;
  };

  const generateLoginHtml = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${portalUrl}?mac=$(mac)&ip=$(ip)&username=$(username)&link-login=$(link-login)&link-login-only=$(link-login-only)&link-orig=$(link-orig)&error=$(error)">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to WiFi portal...</p>
  <script>
    window.location.href = "${portalUrl}?mac=$(mac)&ip=$(ip)&username=$(username)&link-login=$(link-login)&link-login-only=$(link-login-only)&link-orig=$(link-orig)&error=$(error)";
  </script>
</body>
</html>`;
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Router Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">MikroTik Router Settings</CardTitle>
          </div>
          <CardDescription>Configure your MikroTik router connection for hotspot management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Router Name</Label>
              <Input value={settings.router_name} onChange={(e) => setSettings({ ...settings, router_name: e.target.value })} />
            </div>
            <div>
              <Label>Router IP</Label>
              <Input value={settings.router_ip} onChange={(e) => setSettings({ ...settings, router_ip: e.target.value })} placeholder="192.168.88.1" />
            </div>
            <div>
              <Label>API Port</Label>
              <Input type="number" value={settings.api_port} onChange={(e) => setSettings({ ...settings, api_port: parseInt(e.target.value) || 8728 })} />
            </div>
            <div>
              <Label>API Username</Label>
              <Input value={settings.api_username} onChange={(e) => setSettings({ ...settings, api_username: e.target.value })} />
            </div>
            <div>
              <Label>API Password</Label>
              <Input type="password" value={settings.api_password} onChange={(e) => setSettings({ ...settings, api_password: e.target.value })} />
            </div>
            <div>
              <Label>Hotspot Server Name</Label>
              <Input value={settings.hotspot_server} onChange={(e) => setSettings({ ...settings, hotspot_server: e.target.value })} />
            </div>
            <div>
              <Label>DNS Name (for captive portal)</Label>
              <Input value={settings.dns_name} onChange={(e) => setSettings({ ...settings, dns_name: e.target.value })} placeholder="wifi.local" />
            </div>
            <div>
              <Label>Portal URL</Label>
              <Input value={settings.portal_url} onChange={(e) => setSettings({ ...settings, portal_url: e.target.value })} placeholder={portalUrl} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Downloadable Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">MikroTik Configuration Files</CardTitle>
          <CardDescription>Download these files and upload them to your MikroTik router</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-1">Router Configuration Script</h4>
              <p className="text-xs text-muted-foreground mb-3">
                RouterOS script (.rsc) to configure hotspot, RADIUS, and walled garden. Upload via Files in WinBox or drag to terminal.
              </p>
              <Button variant="outline" size="sm" onClick={() => downloadFile(generateRscScript(), 'wifi-billing-setup.rsc')}>
                <Download className="w-4 h-4 mr-1" /> Download .rsc Script
              </Button>
            </div>
            <div className="border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-1">Hotspot Login Page</h4>
              <p className="text-xs text-muted-foreground mb-3">
                HTML redirect page. Replace the default login.html in the hotspot directory on your MikroTik router.
              </p>
              <Button variant="outline" size="sm" onClick={() => downloadFile(generateLoginHtml(), 'login.html')}>
                <Download className="w-4 h-4 mr-1" /> Download login.html
              </Button>
            </div>
          </div>

          {/* Setup instructions */}
          <div className="bg-muted rounded-lg p-4 mt-4">
            <h4 className="font-medium text-foreground mb-2">Setup Instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Download both files above</li>
              <li>Open WinBox and connect to your MikroTik router</li>
              <li>Go to <strong>Files</strong> and upload <code>wifi-billing-setup.rsc</code></li>
              <li>Open <strong>Terminal</strong> and run: <code>/import wifi-billing-setup.rsc</code></li>
              <li>Navigate to the <strong>hotspot</strong> folder in Files</li>
              <li>Replace <code>login.html</code> with the downloaded version</li>
              <li>Configure your FreeRADIUS server to point to: <code>{portalUrl.replace('/portal', '')}/functions/v1/wifi-radius-auth</code></li>
              <li>Test by connecting a device to the hotspot WiFi</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MikroTikSettings;
