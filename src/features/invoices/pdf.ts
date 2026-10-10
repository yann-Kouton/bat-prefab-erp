import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COMPANY, COUNTRIES, INVOICE_KIND_LABELS, PAYMENT_LABELS } from '@/lib/constants';
import { LOGO_DATA_URI } from '@/lib/logoData';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { remaining } from '@/services/billing';
import type { Invoice, Payment } from '@/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n: number) => formatMoney(n).replace(/\u202F/g, '\u00A0');
const num = (n: number) => formatNumber(n).replace(/\u202F/g, '\u00A0');

export function buildInvoiceHtml(inv: Invoice, payments: Payment[]): string {
  const paidRows = payments
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => `<tr><td>${formatDate(p.date)}</td><td>${esc(PAYMENT_LABELS[p.method])}${p.reference ? ' · ' + esc(p.reference) : ''}</td><td class="r">${money(p.amount)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/>
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #12233F; font-size: 12px; line-height: 1.45; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #F8B608; padding-bottom: 12px; }
  .brand img { height: 72px; }
  .doc { text-align: right; }
  .doc h2 { margin: 0; font-size: 22px; color: #0B66E4; font-family: Georgia, 'Times New Roman', serif; }
  .doc p { margin: 3px 0 0; color: #5C6B82; }
  .parties { display: flex; gap: 16px; margin: 18px 0; }
  .box { flex: 1; border: 1px solid #D7DFEA; border-radius: 6px; padding: 10px 12px; }
  .box h3 { margin: 0 0 6px; font-size: 11px; color: #5C6B82; font-weight: 600; }
  .box strong { font-size: 13px; }
  .subject { margin: 0 0 12px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0B66E4; color: #fff; text-align: left; padding: 7px 8px; font-size: 11px; }
  td { border-bottom: 1px solid #E4E9F1; padding: 7px 8px; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  .totals { margin: 14px 0 0 auto; width: 55%; }
  .totals td { border: 0; padding: 4px 8px; }
  .totals .grand td { background: #FFF1C2; font-weight: 700; font-size: 14px; border-top: 2px solid #0B66E4; }
  .totals .due td { font-weight: 700; color: #0B66E4; }
  .notes { margin-top: 18px; }
  .notes h3 { margin: 0 0 4px; font-size: 12px; }
  .foot { margin-top: 22px; padding-top: 8px; border-top: 1px solid #D7DFEA; color: #5C6B82; font-size: 10px; text-align: center; }
</style></head>
<body>
  <div class="top">
    <div class="brand"><img src="${LOGO_DATA_URI}" alt="${esc(COMPANY.name)}"/></div>
    <div class="doc">
      <h2>Facture ${esc(inv.number)}</h2>
      <p>Date : ${formatDate(inv.issueDate)}</p>
      <p>Échéance : ${formatDate(inv.dueDate)}</p>
      <p>Réf. devis : ${esc(inv.quoteNumber)}</p>
    </div>
  </div>

  <div class="parties">
    <div class="box">
      <h3>Émetteur</h3>
      <strong>${esc(COMPANY.name)}</strong><br/>
      ${esc(COMPANY.headquarters)}<br/>
      ${COMPANY.phones.map(esc).join(' · ')}<br/>
      ${esc(COMPANY.email)}
    </div>
    <div class="box">
      <h3>Facturé à</h3>
      <strong>${esc(inv.clientName)}</strong><br/>
      ${esc(COUNTRIES[inv.country].label)}
    </div>
  </div>

  <p class="subject"><strong>Objet :</strong> ${esc(inv.label)}</p>

  <table>
    <thead><tr><th>Désignation</th><th class="r" style="width:130px">Montant HT (FCFA)</th></tr></thead>
    <tbody><tr><td>${esc(INVOICE_KIND_LABELS[inv.kind])} — ${esc(inv.label)}</td><td class="r">${money(inv.netHT).replace(' FCFA', '')}</td></tr></tbody>
  </table>

  <table class="totals">
    <tr><td>Total HT</td><td class="r">${money(inv.netHT)}</td></tr>
    <tr><td>TVA (${num(inv.vatPct)} %)</td><td class="r">${money(inv.vatAmount)}</td></tr>
    <tr class="grand"><td>Total TTC</td><td class="r">${money(inv.totalTTC)}</td></tr>
    ${inv.paidAmount > 0 ? `<tr><td>Déjà réglé</td><td class="r">- ${money(inv.paidAmount)}</td></tr><tr class="due"><td>Reste à payer</td><td class="r">${money(remaining(inv))}</td></tr>` : ''}
  </table>

  ${paidRows ? `<div class="notes"><h3>Règlements reçus</h3><table><tbody>${paidRows}</tbody></table></div>` : ''}
  ${inv.notes ? `<div class="notes"><h3>Remarques</h3>${esc(inv.notes).replace(/\n/g, '<br/>')}</div>` : ''}

  <div class="foot">
    ${esc(COMPANY.name)} · ${esc(COMPANY.website)} · ${esc(COMPANY.email)}
    ${COMPANY.legalLine ? `<br/>${esc(COMPANY.legalLine)}` : ''}
  </div>
</body></html>`;
}

export async function shareInvoicePdf(inv: Invoice, payments: Payment[]): Promise<void> {
  const html = buildInvoiceHtml(inv, payments);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Facture ${inv.number}`, UTI: 'com.adobe.pdf' });
  }
}
