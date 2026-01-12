import { Badge } from "@/components/ui/badge";
import { Zap, Radio } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Daraja API Tester
              </h1>
              <p className="text-xs text-muted-foreground">
                M-Pesa STK Push Integration
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="gap-1.5 bg-primary/20 text-primary border-primary/30">
              <Radio className="h-3 w-3" />
              Production
            </Badge>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
