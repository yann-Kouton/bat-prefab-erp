import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COMPANY, COUNTRIES } from '@/lib/constants';
import { formatDate, formatMoney, formatNumber, toDate } from '@/lib/format';
import { lineTotal } from '@/features/quotes/calc';
import type { Quote } from '@/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const multiline = (s: string) => esc(s).replace(/\n/g, '<br/>');
// Espace insécable classique : la fine insécable (U+202F) s'affiche mal dans certains PDF
const money = (n: number) => formatMoney(n).replace(/\u202F/g, '\u00A0');
const num = (n: number) => formatNumber(n).replace(/\u202F/g, '\u00A0');

export function buildQuoteHtml(quote: Quote): string {
  const date = formatDate(toDate(quote.createdAt) ?? new Date());
  const rows = quote.items
    .map(
      (i, idx) => `
      <tr>
        <td class="c">${idx + 1}</td>
        <td>${multiline(i.description)}</td>
        <td class="c">${esc(i.unit)}</td>
        <td class="r">${num(i.quantity)}</td>
        <td class="r">${money(i.unitPrice).replace(' FCFA', '')}</td>
        <td class="r">${money(lineTotal(i)).replace(' FCFA', '')}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/>
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #17212B; font-size: 12px; line-height: 1.45; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #F5B800; padding-bottom: 12px; }
  .brand img { height: 54px; }
  .brand h1 { margin: 6px 0 0; font-size: 18px; color: #22313F; }
  .brand p { margin: 2px 0 0; color: #66737F; }
  .doc { text-align: right; }
  .doc h2 { margin: 0; font-size: 22px; color: #22313F; }
  .doc p { margin: 3px 0 0; color: #66737F; }
  .parties { display: flex; gap: 16px; margin: 18px 0; }
  .box { flex: 1; border: 1px solid #D5DBE0; border-radius: 6px; padding: 10px 12px; }
  .box h3 { margin: 0 0 6px; font-size: 11px; color: #66737F; font-weight: 600; }
  .box strong { font-size: 13px; }
  .subject { margin: 0 0 12px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #22313F; color: #fff; text-align: left; padding: 7px 8px; font-size: 11px; }
  td { border-bottom: 1px solid #E3E7EA; padding: 7px 8px; vertical-align: top; }
  .c { text-align: center; } .r { text-align: right; white-space: nowrap; }
  .totals { margin: 14px 0 0 auto; width: 55%; }
  .totals td { border: 0; padding: 4px 8px; }
  .totals .grand td { background: #FFF3C4; font-weight: 700; font-size: 14px; border-top: 2px solid #22313F; }
  .notes { margin-top: 18px; }
  .notes h3 { margin: 0 0 4px; font-size: 12px; }
  .sign { display: flex; gap: 16px; margin-top: 26px; }
  .sign div { flex: 1; border: 1px solid #D5DBE0; border-radius: 6px; padding: 10px 12px; height: 90px; color: #66737F; }
  .foot { margin-top: 22px; padding-top: 8px; border-top: 1px solid #D5DBE0; color: #66737F; font-size: 10px; text-align: center; }
</style></head>
<body>
  <div class="top">
    <div class="brand">
      <img src="${COMPANY.logoUrl}" alt="${esc(COMPANY.name)}"/>
      <h1>${esc(COMPANY.name)}</h1>
      <p>${esc(COMPANY.tagline)}</p>
    </div>
    <div class="doc">
      <h2>Devis ${esc(quote.number)}</h2>
      <p>Date : ${date}</p>
      <p>Validité : ${quote.validityDays} jours</p>
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
      <h3>Client</h3>
      <strong>${esc(quote.clientName)}</strong><br/>
      ${esc(COUNTRIES[quote.country].label)}
    </div>
  </div>

  <p class="subject"><strong>Objet :</strong> ${esc(quote.projectTitle)}</p>

  <table>
    <thead><tr><th class="c" style="width:28px">N°</th><th>Désignation</th><th class="c" style="width:52px">Unité</th><th class="r" style="width:56px">Qté</th><th class="r" style="width:92px">P.U. (FCFA)</th><th class="r" style="width:100px">Total (FCFA)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    <tr><td>Total HT</td><td class="r">${money(quote.subtotal)}</td></tr>
    ${quote.discountPct > 0 ? `<tr><td>Remise (${num(quote.discountPct)} %)</td><td class="r">- ${money(quote.discountAmount)}</td></tr><tr><td>Net HT</td><td class="r">${money(quote.netHT)}</td></tr>` : ''}
    <tr><td>TVA (${num(quote.vatPct)} %)</td><td class="r">${money(quote.vatAmount)}</td></tr>
    <tr class="grand"><td>Total TTC</td><td class="r">${money(quote.totalTTC)}</td></tr>
  </table>

  ${quote.conditions ? `<div class="notes"><h3>Conditions</h3>${multiline(quote.conditions)}</div>` : ''}
  ${quote.notes ? `<div class="notes"><h3>Remarques</h3>${multiline(quote.notes)}</div>` : ''}

  <div class="sign">
    <div>Pour ${esc(COMPANY.name)}<br/>Nom, date et signature</div>
    <div>Bon pour accord du client<br/>Nom, date et signature</div>
  </div>

  <div class="foot">
    ${esc(COMPANY.name)} · ${esc(COMPANY.website)} · ${esc(COMPANY.email)}
    ${COMPANY.legalLine ? `<br/>${esc(COMPANY.legalLine)}` : ''}
  </div>
</body></html>`;
}

/** Génère le PDF puis ouvre la feuille de partage (WhatsApp, email…). Sur le web : boîte d'impression. */
export async function shareQuotePdf(quote: Quote): Promise<void> {
  const html = buildQuoteHtml(quote);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Devis ${quote.number}`, UTI: 'com.adobe.pdf' });
  }
}
