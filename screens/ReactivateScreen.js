// PERÍODO DE GRAÇA — PORT À PELE (2026-07-09): disco redSoft com o relógio a vermelho,
// título Hanken pesado, botão ink (raio 16, família do login/lock) e a saída discreta.
// RE-SKIN, NÃO REESCRITA: gate do soft-delete intacto — a conta foi agendada para
// eliminação e o utilizador entrou dentro dos 7 dias; oferece REATIVAR (cancela o
// apagamento) ou continuar a eliminação (sair). Prazo terminado → só sair (o servidor recusa).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PELE, PELE_FONT } from '../data/constants';
import { reactivateAccount } from '../data/auth';
import { success, warning } from '../data/haptics';

export default function ReactivateScreen({ deletionAt, onReactivated, onDismiss, lang }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const days = Math.max(0, Math.ceil((new Date(deletionAt).getTime() - Date.now()) / 86400000));
  const dateStr = new Date(deletionAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

  const reactivate = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    const res = await reactivateAccount(lang);
    setBusy(false);
    if (!res.ok) { setErr(res.error); warning(); return; }
    success();
    onReactivated && onReactivated(res.user);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <View style={s.icon}><Ionicons name="time-outline" size={30} color={PELE.red} /></View>
        <Text style={s.title}>{l('Conta agendada para eliminação', 'Account scheduled for deletion')}</Text>
        <Text style={s.sub}>
          {days > 0
            ? l(`Será eliminada definitivamente em ${days} dia${days === 1 ? '' : 's'} — ${dateStr}.`,
                `It will be permanently deleted in ${days} day${days === 1 ? '' : 's'} — ${dateStr}.`)
            : l('Será eliminada definitivamente muito em breve.', 'It will be permanently deleted very soon.')}
        </Text>
        {days > 0 ? (
          <>
            <Text style={s.body}>
              {l('Se mudaste de ideias ou não foste tu, reativa agora — a tua escala e dados ficam como estavam.',
                 'If you changed your mind or this wasn’t you, reactivate now — your roster and data stay as they were.')}
            </Text>
            {err ? <Text style={s.err}>{err}</Text> : null}
            <TouchableOpacity style={[s.primary, busy && { opacity: 0.55 }]} onPress={reactivate} disabled={busy} activeOpacity={0.85}
              accessibilityRole="button" accessibilityLabel={l('Reativar a minha conta', 'Reactivate my account')}>
              {busy ? <ActivityIndicator color={PELE.yellow} /> : <Text style={s.primaryTxt}>{l('Reativar a minha conta', 'Reactivate my account')}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          // Prazo terminou → não se pode reativar (a guarda do servidor recusa). Só sair.
          <Text style={s.body}>
            {l('O prazo terminou — a conta vai ser eliminada e já não é possível reativar.',
               'The window has closed — your account will be deleted and can no longer be reactivated.')}
          </Text>
        )}
        <TouchableOpacity style={s.ghost} onPress={onDismiss} disabled={busy} hitSlop={8}>
          <Text style={s.ghostTxt}>{days > 0 ? l('Continuar a eliminação · Sair', 'Continue deletion · Sign out') : l('Sair', 'Sign out')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  icon: { width: 64, height: 64, borderRadius: 99, backgroundColor: PELE.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  sub: { fontSize: 13.5, fontFamily: PELE_FONT.bodyBold, color: PELE.red, textAlign: 'center', marginBottom: 14, lineHeight: 21 },
  body: { fontSize: 13, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 300 },
  err: { color: PELE.red, fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, marginBottom: 12, textAlign: 'center' },
  primary: { alignSelf: 'stretch', backgroundColor: PELE.ink, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 14 },
  primaryTxt: { color: PELE.paper, fontSize: 15, fontFamily: PELE_FONT.bodyHeavy },
  ghost: { paddingVertical: 10 },
  ghostTxt: { color: PELE.grey, fontSize: 12.5, fontFamily: PELE_FONT.bodyMed },
});
