"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  systemConfigSchema,
  type SystemConfigInput,
} from "@/schemas/system-config.schema";
import { updateSystemConfig } from "@/server/actions/system-config.actions";
import type { ActionResult } from "@/types/actions";

interface Props {
  config: Record<string, string>;
}

const EXCHANGE_SOURCE_OPTIONS = [
  { value: "blue_sell", label: "Dolar Blue (Venta)" },
  { value: "blue_buy", label: "Dolar Blue (Compra)" },
  { value: "official_sell", label: "Dolar Oficial (Venta)" },
  { value: "official_buy", label: "Dolar Oficial (Compra)" },
  { value: "crypto_sell", label: "Dolar Crypto (Venta)" },
  { value: "crypto_buy", label: "Dolar Crypto (Compra)" },
];

export function SystemConfigSection({ config }: Props) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => updateSystemConfig({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<SystemConfigInput>({
    resolver: zodResolver(systemConfigSchema),
    defaultValues: {
      company_name: config.company_name ?? "",
      company_cuit: config.company_cuit ?? "",
      company_address: config.company_address ?? "",
      company_phone: config.company_phone ?? "",
      company_email: config.company_email ?? "",
      receipt_header: config.receipt_header ?? "",
      receipt_footer: config.receipt_footer ?? "",
      default_exchange_source: config.default_exchange_source ?? "",
      smtp_host: config.smtp_host ?? "",
      smtp_port: config.smtp_port ?? "",
      smtp_user: config.smtp_user ?? "",
      smtp_pass: config.smtp_pass ?? "",
      smtp_from: config.smtp_from ?? "",
    },
  });

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Configuracion guardada");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razon Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_cuit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CUIT</FormLabel>
                    <FormControl>
                      <Input placeholder="30-12345678-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direccion</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Corrientes 1234, CABA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input placeholder="+54 11 1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contacto@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recibos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="receipt_header"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Encabezado del recibo</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Texto que aparece en la parte superior del recibo..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receipt_footer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pie del recibo</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Texto que aparece en la parte inferior del recibo..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cotizacion</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="default_exchange_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuente de cotizacion por defecto</FormLabel>
                  <Select
                    name="default_exchange_source"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar fuente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXCHANGE_SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuracion de Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smtp_host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servidor SMTP</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.gmail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtp_port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puerto</FormLabel>
                    <FormControl>
                      <Input placeholder="587" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smtp_user"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtp_pass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrasena</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="smtp_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remitente</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="recibos@empresa.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-sm text-muted-foreground">
              Configure los datos de su servidor SMTP para el envio automatico de recibos por email.
              Si no se configura, los recibos se generaran pero no se enviaran por correo.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar Configuracion"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
