"use client";

import { useState, useTransition } from "react";
import { Mail, MailOpen, Clock } from "lucide-react";
import { markMessageRead } from "@/server/actions/message.actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type MessageUser = {
  id: string;
  name: string;
  lastName: string;
};

type ReceivedMessage = {
  id: string;
  readAt: Date | null;
  message: {
    id: string;
    subject: string | null;
    body: string;
    createdAt: Date;
    sender: MessageUser;
    recipients: {
      user: MessageUser;
    }[];
  };
};

type SentMessage = {
  id: string;
  subject: string | null;
  body: string;
  createdAt: Date;
  sender: MessageUser;
  recipients: {
    id: string;
    readAt: Date | null;
    user: MessageUser;
  }[];
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReceivedMessageList({
  messages,
}: {
  messages: ReceivedMessage[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] =
    useState<ReceivedMessage[]>(messages);
  const [, startTransition] = useTransition();

  const handleClick = (msg: ReceivedMessage) => {
    const newExpanded = expandedId === msg.id ? null : msg.id;
    setExpandedId(newExpanded);

    if (!msg.readAt && newExpanded) {
      startTransition(async () => {
        await markMessageRead(msg.message.id);
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, readAt: new Date() } : m
          )
        );
      });
    }
  };

  if (localMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Mail className="mb-3 h-12 w-12" />
        <p className="text-sm">No hay mensajes recibidos</p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-sm border">
      {localMessages.map((msg) => {
        const isUnread = !msg.readAt;
        const isExpanded = expandedId === msg.id;

        return (
          <div key={msg.id}>
            <button
              type="button"
              onClick={() => handleClick(msg)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                isUnread && "bg-muted/50"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {isUnread ? (
                  <Mail className="h-4 w-4 text-primary" />
                ) : (
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "truncate text-sm",
                      isUnread ? "font-semibold" : "font-medium"
                    )}
                  >
                    {msg.message.subject || "(Sin asunto)"}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {isUnread && <Badge variant="default">Nuevo</Badge>}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(msg.message.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  De: {msg.message.sender.name} {msg.message.sender.lastName}
                </p>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t bg-muted/20 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm">
                  {msg.message.body}
                </p>
                {msg.message.recipients.length > 1 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Para:{" "}
                    {msg.message.recipients
                      .map((r) => `${r.user.name} ${r.user.lastName}`)
                      .join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SentMessageList({ messages }: { messages: SentMessage[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Mail className="mb-3 h-12 w-12" />
        <p className="text-sm">No hay mensajes enviados</p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-sm border">
      {messages.map((msg) => {
        const isExpanded = expandedId === msg.id;

        return (
          <div key={msg.id}>
            <button
              type="button"
              onClick={() =>
                setExpandedId(isExpanded ? null : msg.id)
              }
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <div className="mt-0.5 shrink-0">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {msg.subject || "(Sin asunto)"}
                  </p>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para:{" "}
                  {msg.recipients
                    .map((r) => `${r.user.name} ${r.user.lastName}`)
                    .join(", ")}
                </p>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t bg-muted/20 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.recipients.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      {r.readAt ? (
                        <MailOpen className="h-3 w-3 text-green-600" />
                      ) : (
                        <Mail className="h-3 w-3 text-orange-500" />
                      )}
                      {r.user.name} {r.user.lastName}
                      {r.readAt ? " (leido)" : " (no leido)"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
