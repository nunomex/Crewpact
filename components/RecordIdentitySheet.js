// CrewPact · A folha da identidade dos documentos (2026-11-14). O Registo ORO.FTL.245, a prova da Disrupção e a da Estabilidade
// saem com o nome e o número de tripulante — pedidos ao gerar e guardados (são dados do Perfil: continuam à mão). Era a mesma folha
// copiada à mão em três ecrãs (Relatórios, Disrupção, Estabilidade); agora é uma peça, na REGRA DAS FOLHAS (design-system §11):
// folha branca, "Fechar" escrito, os dois campos com rótulo pequeno, valor grande e fio (`FieldInput`; a imagem 3417 do Nuno) e a
// ação larga no fundo (`WideButton`).
//
//   <RecordIdentitySheet visible={recOpen} onClose={…} form={recForm} setForm={setRecForm} onGenerate={…} lang={lang}
//     sub="…" cta="Gerar prova (PDF)" hint="…" />
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import PeleSheet from './PeleSheet';
import SheetHeader from './SheetHeader';
import { FieldInput } from './Field';
import { WideButton } from './PillButton';
import { CARD, TXT, TXT3, SPACE } from '../data/constants';
import { t } from '../data/i18n';

export default function RecordIdentitySheet({ visible, onClose, form = {}, setForm, onGenerate, lang = 'pt', title, sub, cta, hint }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const set = (k) => (v) => setForm && setForm((f) => ({ ...f, [k]: v }));
  return (
    <PeleSheet visible={visible} onClose={onClose} bg={CARD.day.sheet}>
      <SheetHeader card title={title || t('duties.recTitle', lang)} onClose={onClose} closeLabel={l('Fechar', 'Close')} style={s.head} />
      <Text style={[TXT3.cardSub, s.sub]}>{sub || t('duties.recSub', lang)}</Text>
      <FieldInput label={t('duties.recName', lang)} value={form.name || ''} onChangeText={set('name')} placeholder={t('duties.recNamePh', lang)}
        autoCapitalize="words" returnKeyType="next" />
      <FieldInput label={t('duties.recId', lang)} value={form.crewId || ''} onChangeText={set('crewId')} placeholder={t('duties.recIdPh', lang)}
        autoCapitalize="characters" returnKeyType="done" />
      <WideButton glyph="doc" label={cta || t('duties.recGenerate', lang)} onPress={onGenerate} style={s.btn} />
      {hint ? <Text style={[TXT.caption, s.hint]}>{hint}</Text> : null}
    </PeleSheet>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 0, paddingTop: 0 },
  sub: { color: CARD.day.tabSub, marginBottom: SPACE.xs },
  btn: { marginTop: SPACE.lg },
  hint: { color: CARD.day.tabSub, textAlign: 'center', marginTop: SPACE.sm },
});
