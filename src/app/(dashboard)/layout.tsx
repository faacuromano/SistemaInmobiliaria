import { requireAuth } from "@/lib/auth-guard";
import { getRolePermissionsFromDb } from "@/lib/rbac";
import { type Role } from "@/types/enums";
import { Sidebar } from "@/components/shared/sidebar";
import { MobileSidebar } from "@/components/shared/mobile-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBell } from "@/components/shared/notification-bell";
import { HeaderInfo } from "@/components/shared/header-info";
import { notificationModel } from "@/server/models/notification.model";
import { exchangeRateModel } from "@/server/models/exchange-rate.model";
import { fetchDolarApiRates } from "@/lib/exchange-rate";
import { CurrencyProvider } from "@/providers/currency-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const permissions = await getRolePermissionsFromDb(
    session.user.role as Role
  );

  const [unreadCount, notifications, exchangeRate] = await Promise.all([
    notificationModel.countUnread(session.user.id),
    notificationModel.findByUserId(session.user.id, { limit: 20 }),
    exchangeRateModel.findByDate(new Date()).then(async (rate) => {
      if (rate) return rate;
      const apiRates = await fetchDolarApiRates();
      if (!apiRates) return null;
      return exchangeRateModel.upsertByDate(new Date(), {
        source: "dolarapi",
        ...apiRates,
      });
    }).catch(() => null),
  ]);

  const rates = exchangeRate
    ? {
        officialBuy: exchangeRate.officialBuy ? Number(exchangeRate.officialBuy) : null,
        officialSell: exchangeRate.officialSell ? Number(exchangeRate.officialSell) : null,
        blueBuy: exchangeRate.blueBuy ? Number(exchangeRate.blueBuy) : null,
        blueSell: exchangeRate.blueSell ? Number(exchangeRate.blueSell) : null,
        cryptoBuy: exchangeRate.cryptoBuy ? Number(exchangeRate.cryptoBuy) : null,
        cryptoSell: exchangeRate.cryptoSell ? Number(exchangeRate.cryptoSell) : null,
      }
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar
          userRole={session.user.role}
          userName={session.user.name ?? ""}
          permissions={permissions}
        />
      </div>
      <CurrencyProvider blueSellRate={rates?.blueSell ?? null}>
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* ── Top bar ──────────────────────────────────── */}
          <header className="flex h-11 shrink-0 items-center border-b bg-card/80 backdrop-blur-sm px-4 gap-2">
            <MobileSidebar
              userRole={session.user.role}
              userName={session.user.name ?? ""}
              permissions={permissions}
            />
            <div className="flex-1" />
            <HeaderInfo rates={rates} />
            <NotificationBell
              initialCount={unreadCount}
              initialNotifications={notifications}
            />
          </header>
          {/* ── Content area ─────────────────────────────── */}
          <main className="flex-1 overflow-auto bg-background p-4 lg:p-5">
            {children}
          </main>
        </div>
      </CurrencyProvider>
      <Toaster richColors />
    </div>
  );
}
