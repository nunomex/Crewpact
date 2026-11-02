// PERÍODO DE GRAÇA — PORTA (2026-11-02, esboço `design/login-v4.html`): faixa de tinta em cima,
// na folha um selo vermelho com a DATA ("Apaga-se a 9 de novembro"), título à esquerda e a ação
// larga no fundo ("Manter a minha conta"); sair fica por baixo, sem competir.
// Lógica intacta — gate do soft-delete: a conta foi agendada para eliminação e o utilizador entrou
// dentro dos 7 dias; oferece REATIVAR (cancela o apagamento) ou continuar a eliminação (sair).
// Prazo terminado → só sair (o servidor recusa).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PELE, TXT, SPACE } from '../data/constants';
import { reactivateAccount } from '../data/auth';
import { success, warning } from '../data/haptics';
import Porta, { portaTxt as P } from '../components/Porta';
import PrimaryButton from '../components/PrimaryButton';

export default function ReactivateScreen({ deletionAt, onReactivated, onDismiss, lang }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const days = Math.max(0, Math.ceil((new Date(deletionAt).getTime() - Date.now()) / 86400000));
  const loc = lang === 'en' ? 'en-GB' : 'pt-PT';
  const dateDay = new Date(deletionAt).toLocaleDateString(loc, { day: 'numeric', month: 'long' });

  const reactivate = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    const res = await reactivateAccount(lang);
    setBusy(false);
    if (!res.ok) { setErr(res.error); warning(); return; }
    success();
    onReactivated && onReactivated(res.user);
  };

  const exitLabel = days > 0 ? l('Sair e continuar a eliminação', 'Sign out and continue deletion') : l('Sair', 'Sign out');
  const footer = (
    <>
      {days > 0 ? <PrimaryButton label={l('Manter a minha conta', 'Keep my account')} onPress={reactivate} loading={busy} /> : null}
      <TouchableOpacity style={s.exit} onPress={onDismiss} disabled={busy} hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }} accessibilityRole="button">
        <Text style={[days > 0 ? P.link : P.linkMuted, P.center]}>{exitLabel}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Porta plate="band" footer={footer}>
      <View style={s.tag}>
        <Text style={s.tagTxt}>{days > 0 ? l(`Apaga-se a ${dateDay}`, `Deleted on ${dateDay}`) : l('Prazo terminado', 'Window closed')}</Text>
      </View>
      <Text style={P.title} accessibilityRole="header">{l('A tua conta vai ser apagada', 'Your account will be deleted')}</Text>
      <Text style={P.body}>
        {days > 0
          ? l(`Pediste para apagar a conta. Faltam ${days} dia${days === 1 ? '' : 's'}: até ${dateDay} podes voltar atrás, e a tua escala e os teus registos ficam como estavam. Se não foste tu, mantém a conta.`,
              `You asked to delete your account. ${days} day${days === 1 ? '' : 's'} left: until ${dateDay} you can undo it, and your roster and records stay as they were. If this was not you, keep your account.`)
          : l('O prazo terminou. A conta vai ser eliminada e já não é possível voltar atrás.',
              'The window has closed. Your account will be deleted and this can no longer be undone.')}
      </Text>
      {err ? <Text style={P.err}>{err}</Text> : null}
    </Porta>
  );
}

const s = StyleSheet.create({
  tag:    { alignSelf: 'flex-start', backgroundColor: PELE.redSoft, borderRadius: 999, paddingHorizontal: SPACE.md, paddingVertical: SPACE.s, marginBottom: SPACE.md },
  tagTxt: { ...TXT.tag, color: PELE.red },
  exit:   { alignSelf: 'center', paddingVertical: SPACE.xs },
});
