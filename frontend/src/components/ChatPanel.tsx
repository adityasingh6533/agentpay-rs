import {
  Bot,
  Check,
  ChevronRight,
  Loader2,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import "../styles/ChatPanel.css";

type Message = {
  id: number;
  role: "user" | "agent";
  text: string;
  time: string;
};

type ToolActivity = {
  icon: typeof Search;
  name: string;
  description: string;
  done: boolean;
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: "user",
    text: "I need running shoes under ₹1500.",
    time: "10:42:18",
  },
  {
    id: 2,
    role: "agent",
    text:
      "I found a strong match within your budget. I also found a relevant accessory that can improve your running setup.",
    time: "10:42:20",
  },
];

const tools: ToolActivity[] = [
  {
    icon: Search,
    name: "Catalog Search",
    description: "248 products searched",
    done: true,
  },
  {
    icon: Sparkles,
    name: "Intent Analysis",
    description: "High purchase intent",
    done: true,
  },
  {
    icon: TrendingUp,
    name: "Growth Engine",
    description: "Cross-sell detected",
    done: true,
  },
  {
    icon: ShieldCheck,
    name: "Policy Check",
    description: "Merchant limits verified",
    done: true,
  },
];

function ChatPanel() {
  const [messages, setMessages] =
    useState<Message[]>(initialMessages);

  const [input, setInput] = useState("");

  const [thinking, setThinking] = useState(false);

  const sendMessage = () => {
    const text = input.trim();

    if (!text || thinking) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      const agentMessage: Message = {
        id: Date.now() + 1,
        role: "agent",
        text:
          "Got it. I'm checking the merchant catalog and evaluating the best option against your requirements.",
        time: "Just now",
      };

      setMessages((prev) => [...prev, agentMessage]);
      setThinking(false);
    }, 900);
  };

  return (
    <div className="chat-panel">
      {/* HEADER */}

      <div className="chat-panel-header">
        <div className="chat-agent-heading">
          <div className="chat-agent-icon">
            <Bot size={17} />
          </div>

          <div>
            <span>AGENTPAY AI</span>
            <strong>Commerce Agent</strong>
          </div>
        </div>

        <div className="chat-live">
          <span />
          ACTIVE
        </div>
      </div>

      {/* MESSAGES */}

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${
              message.role === "user"
                ? "user-message"
                : "agent-message"
            }`}
          >
            <div
              className={`chat-avatar ${
                message.role === "user"
                  ? "user-avatar"
                  : "agent-avatar"
              }`}
            >
              {message.role === "user" ? (
                <User size={13} />
              ) : (
                <Bot size={13} />
              )}
            </div>

            <div className="chat-message-body">
              <div className="chat-message-meta">
                <strong>
                  {message.role === "user"
                    ? "Customer"
                    : "AgentPay AI"}
                </strong>

                <span>{message.time}</span>
              </div>

              <div className="chat-bubble">
                {message.text}
              </div>
            </div>
          </div>
        ))}

        {/* TOOL EXECUTION */}

        <div className="agent-thinking">
          <div className="thinking-header">
            <div>
              <Zap size={12} />
              <strong>Agent execution</strong>
            </div>

            <span>4 actions</span>
          </div>

          <div className="tool-list">
            {tools.map((tool) => {
              const Icon = tool.icon;

              return (
                <div
                  className="tool-item"
                  key={tool.name}
                >
                  <div className="tool-icon">
                    {tool.done ? (
                      <Check size={10} />
                    ) : (
                      <Icon size={11} />
                    )}
                  </div>

                  <div>
                    <strong>{tool.name}</strong>
                    <span>{tool.description}</span>
                  </div>

                  {tool.done && (
                    <Check
                      className="tool-check"
                      size={11}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RECOMMENDATION */}

        <div className="chat-recommendation">
          <div className="recommendation-top">
            <div className="recommendation-product-icon">
              <Sparkles size={16} />
            </div>

            <div>
              <span>AI RECOMMENDATION</span>
              <strong>Velocity Running Shoes</strong>
            </div>

            <span className="match-badge">
              94% MATCH
            </span>
          </div>

          <div className="recommendation-content">
            <p>
              Best match based on price, running use case,
              rating and customer purchase patterns.
            </p>

            <div className="recommendation-stats">
              <span>₹1,299</span>
              <span>4.8 ★</span>
              <span>Free delivery</span>
            </div>
          </div>

          <button className="recommendation-action">
            View recommendation
            <ChevronRight size={13} />
          </button>
        </div>

        {/* THINKING */}

        {thinking && (
          <div className="chat-thinking">
            <Loader2 size={13} />
            <span>Agent is reasoning...</span>
          </div>
        )}
      </div>

      {/* INPUT */}

      <div className="chat-input-area">
        <div className="chat-input-box">
          <MessageCircle size={15} />

          <input
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            placeholder="Ask the commerce agent..."
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || thinking}
          >
            <Send size={14} />
          </button>
        </div>

        <div className="chat-input-footer">
          <span>
            <ShieldCheck size={9} />
            Actions are bounded by merchant policies
          </span>

          <span>ENTER to send</span>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;