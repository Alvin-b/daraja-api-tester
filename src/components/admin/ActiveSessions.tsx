import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Wifi } from "lucide-react";

interface Session {
  id: string;
  username: string;
  mac_address: string | null;
  ip_address: string | null;
  started_at: string;
  expires_at: string;
  bytes_in: number;
  bytes_out: number;
  is_active: boolean;
}

interface Voucher {
  id: string;
  code: string;
  phone_number: string;
  status: string;
  amount_paid: number;
  duration_minutes: number;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const ActiveSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  const fetchData = async () => {
    const [sessionsRes, vouchersRes] = await Promise.all([
      supabase.from('wifi_sessions').select('*').eq('is_active', true).order('started_at', { ascending: false }),
      supabase.from('wifi_vouchers').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (vouchersRes.data) setVouchers(vouchersRes.data);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const activeCount = sessions.length;
  const totalRevenue = vouchers.filter(v => v.status !== 'pending').reduce((sum, v) => sum + v.amount_paid, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Wifi className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vouchers</p>
              <p className="text-2xl font-bold text-foreground">{vouchers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue (KES)</p>
              <p className="text-2xl font-bold text-foreground">{totalRevenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No active sessions</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>MAC Address</TableHead>
                  <TableHead>Connected At</TableHead>
                  <TableHead>Time Remaining</TableHead>
                  <TableHead>Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-bold text-primary">{s.username}</TableCell>
                    <TableCell className="text-sm">{s.ip_address || '-'}</TableCell>
                    <TableCell className="text-sm font-mono">{s.mac_address || '-'}</TableCell>
                    <TableCell className="text-sm">{new Date(s.started_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={getTimeRemaining(s.expires_at) === 'Expired' ? 'destructive' : 'default'}>
                        {getTimeRemaining(s.expires_at)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      ↓{formatBytes(s.bytes_in)} ↑{formatBytes(s.bytes_out)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Vouchers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-bold text-primary">{v.code}</TableCell>
                  <TableCell className="text-sm">{v.phone_number}</TableCell>
                  <TableCell className="text-sm">KES {v.amount_paid}</TableCell>
                  <TableCell className="text-sm">{v.duration_minutes >= 1440 ? `${v.duration_minutes / 1440}d` : v.duration_minutes >= 60 ? `${v.duration_minutes / 60}h` : `${v.duration_minutes}m`}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === 'active' ? 'default' : v.status === 'expired' ? 'destructive' : 'secondary'}>
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(v.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveSessions;
