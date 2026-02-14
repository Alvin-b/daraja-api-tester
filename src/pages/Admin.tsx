import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi } from "lucide-react";
import ActiveSessions from "@/components/admin/ActiveSessions";
import PackageManagement from "@/components/admin/PackageManagement";
import MikroTikSettings from "@/components/admin/MikroTikSettings";

const Admin = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Wifi className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">WiFi Admin Dashboard</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="settings">MikroTik Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <ActiveSessions />
          </TabsContent>

          <TabsContent value="packages">
            <PackageManagement />
          </TabsContent>

          <TabsContent value="settings">
            <MikroTikSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
