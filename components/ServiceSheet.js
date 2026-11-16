// A FOLHA DO SERVIÇO — a mesma em toda a app (F1 de design/abrir-dia.html, escolhida pelo Nuno a 2026-11-16). Antes, só a Escala
// abria o dia numa folha; o Início e os Números abriam o ecrã do Detalhe DENTRO da aba Escala (a app mudava de aba e o ‹ voltava
// ao mês da Escala, não ao Início — o achado 3 do mapa da app, docs/sitemap.md). Agora o dia abre por cima de onde se está, e
// "Fechar" (ou puxar para baixo) volta exatamente lá.
// A janela nativa do iPhone (pageSheet) com o corpo do Detalhe (DutyDetailBody, screens/DutyDetailScreen.js — o B de
// design/detalhe-3.html): o voo em destaque, o limite, o dinheiro, a pernoita e os outros serviços do dia.
//   <ServiceSheet svc={{ iso, idx }} onClose={…} onPick={(i) => …} onDeleted={…} navigation={navigation} />
//   `svc` = o serviço aberto (idx 0 = o registo principal, n = o extra n) ou null · `onPick(i)` = outro serviço do mesmo dia.
// Para abrir esta folha logo depois de outra (a Auditoria do mês): esperar que a outra acabe de fechar (SHEET_AFTER_MS) — no iOS,
// apresentar um Modal com o anterior ainda a fechar bloqueia o ecrã (components/PeleSheet.js).
import React, { useContext, useRef } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import PillButton from './PillButton';
import { DutyDetailBody } from '../screens/DutyDetailScreen';
import { AppContext } from '../data/appContext';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';
import { prettyRoute } from '../data/escalaDay';
import { t } from '../data/i18n';

const C = CARD.day;
export const SHEET_AFTER_MS = 450;   // a PeleSheet fecha em 240 ms + a folga do iOS (140 ms) — e um pouco de margem
const valid = (d) => !!(d && !d.deleted);

export default function ServiceSheet({ svc, onClose, onPick, onDeleted, navigation }) {
  const { duties, lang } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  // o conteúdo fica enquanto a janela desce (sem ele, a folha ficava vazia a meio da animação)
  const last = useRef(null);
  if (svc) last.current = svc;
  const shown = svc || last.current;
  const svcsAt = (iso) => { const d = duties && duties[iso]; return valid(d) ? [d, ...(Array.isArray(d.extra) ? d.extra : [])] : []; };
  const titleOf = ({ iso, idx }) => {
    const sv = svcsAt(iso)[idx];
    if (!sv) return '';
    const k = sv.kind || 'flight';
    return (k === 'flight' && prettyRoute(sv.route)) || (k === 'flight' ? l('Voo', 'Flight') : t(`duties.kind.${k}`, lang));
  };
  const dayOf = (iso) => {
    const tx = new Date(`${iso}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
    return tx.charAt(0).toUpperCase() + tx.slice(1);
  };

  return (
    <Modal visible={!!svc} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {shown ? (
        <View style={[s.root, { backgroundColor: C.sheet }]}>
          <View style={s.grab}><View style={[s.grabBar, { backgroundColor: C.round }]} /></View>
          <View style={s.head}>
            <View style={s.title}>
              <Text style={[TXT3.slimTitle, { color: C.ink }]} numberOfLines={1} accessibilityRole="header">{titleOf(shown)}</Text>
              <Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={1}>{dayOf(shown.iso)}</Text>
            </View>
            <PillButton label={l('Fechar', 'Close')} onPress={onClose} ink={C.ink} />
          </View>
          <ScrollView style={s.root} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            <DutyDetailBody date={shown.iso} idx={shown.idx} navigation={navigation}
              onDeleted={() => (onDeleted ? onDeleted() : onClose())}
              onOpenService={(i) => onPick && onPick(i)} />
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

// As medidas da folha da Escala (V1, 2026-11-13): a pega, o título com o dia por baixo e o "Fechar" escrito.
const s = StyleSheet.create({
  root: { flex: 1 },
  grab: { alignItems: 'center', paddingTop: SPACE.sm, paddingBottom: SPACE.s },
  grabBar: { width: 40, height: 5, borderRadius: RADIUS.pill },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md },
  title: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: SPACE.md, paddingBottom: SPACE.xxxl },
});
