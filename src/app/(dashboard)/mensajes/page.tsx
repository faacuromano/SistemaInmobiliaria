import { requireAuth } from "@/lib/auth-guard";
import {
  getMyMessages,
  getSentMessages,
  getActiveUsersForMessaging,
} from "@/server/actions/message.actions";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare } from "lucide-react";
import { MessageComposeDialog } from "./_components/message-compose-dialog";
import {
  ReceivedMessageList,
  SentMessageList,
} from "./_components/message-list";

export default async function MensajesPage() {
  const session = await requireAuth();

  const [received, sent, users] = await Promise.all([
    getMyMessages(),
    getSentMessages(),
    getActiveUsersForMessaging(),
  ]);

  // Filter out current user from the recipient list
  const otherUsers = users.filter((u) => u.id !== session.user.id);

  const unreadCount = received.filter((r) => !r.readAt).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mensajes"
        description="Mensajeria interna entre usuarios del sistema"
        icon={MessageSquare}
        accentColor="border-violet-600"
      >
        <MessageComposeDialog users={otherUsers} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Recibidos</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{received.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Sin leer</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{unreadCount}</p>
        </div>
      </div>

      <Tabs defaultValue="recibidos">
        <TabsList>
          <TabsTrigger value="recibidos">
            Recibidos
            {unreadCount > 0 && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="enviados">Enviados</TabsTrigger>
        </TabsList>
        <TabsContent value="recibidos">
          <ReceivedMessageList messages={received} />
        </TabsContent>
        <TabsContent value="enviados">
          <SentMessageList messages={sent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
