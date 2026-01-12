import { MapPin, Calendar, HelpCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const quickActions = [
  { icon: MapPin, label: "View Routes", message: "What routes do you have available?" },
  { icon: CreditCard, label: "Check Fares", message: "How much is the fare from Nairobi to Kisumu?" },
  { icon: Calendar, label: "Book Now", message: "I want to book a trip from Nairobi to Mombasa" },
  { icon: HelpCircle, label: "Policies", message: "What are your luggage and cancellation policies?" },
];

const QuickActions = ({ onAction }: QuickActionsProps) => {
  return (
    <div className="py-4">
      <p className="text-xs text-muted-foreground text-center mb-3">Quick actions</p>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-3 px-4 flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-300 transition-all"
            onClick={() => onAction(action.message)}
          >
            <action.icon className="h-5 w-5 text-orange-500" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
