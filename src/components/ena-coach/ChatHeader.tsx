import { Bus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChatHeader = () => {
  return (
    <header className="bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Bus className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Ena Coach</h1>
              <p className="text-orange-100 text-xs">Book your journey with Maji AI</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/20"
            onClick={() => window.open('tel:0709832000')}
          >
            <Phone className="h-4 w-4 mr-1" />
            Call Us
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
