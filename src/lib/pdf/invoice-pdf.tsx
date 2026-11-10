import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "@/lib/date";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  h1: { fontSize: 24, fontWeight: "bold" },
  muted: { color: "#666" },
  table: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#e5e5e5" },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
  head: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#111" },
  cellDesc: { flex: 4 },
  cellQty: { flex: 1, textAlign: "right" },
  cellUnit: { flex: 2, textAlign: "right" },
  cellAmt: { flex: 2, textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 2 },
  grand: { borderTopWidth: 1, borderTopColor: "#111", marginTop: 4, paddingTop: 4, fontWeight: "bold" },
});

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export type InvoicePdfData = {
  tenantName: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  number: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  lineItems: { description: string; quantity: number; unitPriceCents: number; amountCents: number }[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>{data.tenantName}</Text>
            <Text style={styles.muted}>Invoice #{data.number}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontWeight: "bold" }}>Billed to</Text>
            <Text>{data.clientName}</Text>
            {data.clientEmail ? <Text style={styles.muted}>{data.clientEmail}</Text> : null}
            {data.clientAddress ? <Text style={styles.muted}>{data.clientAddress}</Text> : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.muted}>Issued {formatDate(data.issueDate)}</Text>
          <Text style={styles.muted}>Due {formatDate(data.dueDate)}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.head}>
            <Text style={[styles.cellDesc, { fontWeight: "bold" }]}>Description</Text>
            <Text style={[styles.cellQty, { fontWeight: "bold" }]}>Qty</Text>
            <Text style={[styles.cellUnit, { fontWeight: "bold" }]}>Rate</Text>
            <Text style={[styles.cellAmt, { fontWeight: "bold" }]}>Amount</Text>
          </View>
          {data.lineItems.map((l, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cellDesc}>{l.description}</Text>
              <Text style={styles.cellQty}>{l.quantity}</Text>
              <Text style={styles.cellUnit}>{money(l.unitPriceCents, data.currency)}</Text>
              <Text style={styles.cellAmt}>{money(l.amountCents, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(data.subtotalCents, data.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax</Text>
            <Text>{money(data.taxCents, data.currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grand]}>
            <Text>Total</Text>
            <Text>{money(data.totalCents, data.currency)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}