import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT } from '../data/constants';
import { useTheme } from '../data/appContext';
import { reactivateAccount } from '../data/auth';
import { success, warning } from '../data/haptics';

// Gate do PERÍODO DE GRAÇA: a conta foi agendada para eliminação (soft-delete) e o utilizador
// entrou dentro dos 7 dias. Oferece REATIVAR (cancela o apagamento) ou continuar a eliminação (sair).
export default function ReactivateScreen({ deletionAt, onReactivated, onDismiss, lang }) {
  const C = useTheme();
  const s = makeS(C);
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
        <View style={s.icon}><Ionicons name="time-outline" size={30} color={C.red} /></View>
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
            <TouchableOpacity style={s.primary} onPress={reactivate} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryTxt}>{l('Reativar a minha conta', 'Reactivate my account')}</Text>}
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

const makeS = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: { width: 64, height: 64, borderRadius: 99, backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontFamily: FONT.semibold, color: C.text, textAlign: 'center', marginBottom: 10 },
  sub: { fontSize: TYPE.body, fontFamily: FONT.semibold, color: C.red, textAlign: 'center', marginBottom: 14, lineHeight: 22 },
  body: { fontSize: TYPE.sub, color: C.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  err: { color: C.red, fontSize: TYPE.label, marginBottom: 12, textAlign: 'center' },
  primary: { alignSelf: 'stretch', backgroundColor: C.brand, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', marginBottom: 14 },
  primaryTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.bold },
  ghost: { paddingVertical: 10 },
  ghostTxt: { color: C.sub, fontSize: TYPE.sub, fontFamily: FONT.medium },
});
