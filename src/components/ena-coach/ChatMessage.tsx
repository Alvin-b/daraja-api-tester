import { Bus, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isAssistant = message.role === 'assistant';

  // Format message content with basic markdown
  const formatContent = (content: string) => {
    // Convert markdown bold to HTML
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert markdown lists
    formatted = formatted.replace(/^- /gm, '• ');
    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br />');
    return formatted;
  };

  return (
    <div className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}>
      {isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-md">
          <Bus className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div
        className={cn(
          "rounded-2xl px-4 py-3 max-w-[85%] shadow-sm",
          isAssistant
            ? "bg-card border border-border rounded-bl-md"
            : "bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-br-md"
        )}
      >
        <p 
          className={cn("text-sm leading-relaxed", isAssistant ? "text-foreground" : "text-white")}
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        <span className={cn(
          "text-[10px] mt-1 block",
          isAssistant ? "text-muted-foreground" : "text-orange-100"
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {!isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
