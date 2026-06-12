import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../data/constants';
import { FTL_SECTIONS, FTL_ARTICLES, FTL_LIMITS } from '../data/ftl';

export default function FtlScreen({ navigation }) {
  const [openSec, setOpenSec] = useState('gen');

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBlob}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>FLIGHT TIME LIMITATIONS</Text>
          <Text style={s.headTitle}>Limites de Tempo de Voo</Text>
        </View>
        <View style={s.regBadge}><Text style={s.regTxt}>UE 83/2014</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Referência rápida — limites duros */}
        <View style={s.quickCard}>
          <Text style={s.quickTitle}>LIMITES DE SERVIÇO</Text>
          {FTL_LIMITS.duty.map((l, i) => (
            <View key={i} style={[s.quickRow, i > 0 && s.quickDiv]}>
              <Text style={s.quickLbl}>{l.period}</Text>
              <Text style={s.quickVal}>{l.value}</Text>
            </View>
          ))}
        </View>
        <View style={s.quickCard}>
          <Text style={s.quickTitle}>LIMITES DE TEMPO DE VOO</Text>
          {FTL_LIMITS.flight.map((l, i) => (
            <View key={i} style={[s.quickRow, i > 0 && s.quickDiv]}>
              <Text style={s.quickLbl}>{l.period}</Text>
              <Text style={s.quickVal}>{l.value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.tablesBtn} activeOpacity={0.85}
          onPress={() => navigation.navigate('FtlDetail', { code: 'ORO.FTL.205' })}>
          <Ionicons name="grid-outline" size={18} color={C.red} />
          <Text style={s.tablesTxt}>Tabelas de PSV máximo diário</Text>
          <Ionicons name="chevron-forward" size={16} color={C.line} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Artigos por secção (acordeão) */}
        <Text style={s.sectionLabel}>SUBPARTE FTL</Text>
        {FTL_SECTIONS.map(sec => {
          const open = openSec === sec.id;
          const arts = FTL_ARTICLES.filter(a => a.section === sec.id);
          return (
            <View key={sec.id}>
              <TouchableOpacity style={[s.secHeader, open && s.secHeaderOpen]} activeOpacity={0.7}
                onPress={() => setOpenSec(open ? null : sec.id)}>
                <View style={s.secBadge}><Text style={s.secBadgeTxt}>S{sec.n}</Text></View>
                <Text style={s.secTitle} numberOfLines={1}>{sec.title}</Text>
                <Text style={s.secCount}>{arts.length}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.sub} />
              </TouchableOpacity>
              {open && arts.map(a => (
                <TouchableOpacity key={a.code} style={s.row} activeOpacity={0.7}
                  onPress={() => navigation.navigate('FtlDetail', { code: a.code })}>
                  <View style={s.codeBox}><Text style={s.codeBoxTxt}>{a.code.replace('ORO.FTL.', '')}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>{a.title}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>{a.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.line} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        <Text style={s.foot}>Regulamento (UE) n.º 83/2014 · Subparte FTL (ORO.FTL). Resumo para consulta — em caso de dúvida prevalece o texto oficial.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  headerBlob: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.ink, borderRadius: 22, margin: 16, marginBottom: 12, padding: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 6 },
  headTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  regBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  regTxt: { color: '#fff', fontSize: 9, fontFamily: 'monospace', fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  quickCard: { borderWidth: 1, borderColor: C.line, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  quickTitle: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  quickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 11 },
  quickDiv: { borderTopWidth: 1, borderTopColor: C.line },
  quickLbl: { fontSize: 13, color: C.sub },
  quickVal: { fontSize: 15, fontFamily: 'monospace', fontWeight: '700', color: C.text },
  tablesBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginTop: 2, marginBottom: 8 },
  tablesTxt: { fontSize: 13, fontWeight: '500', color: C.text },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600', marginTop: 12, marginBottom: 8, marginLeft: 2 },
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, marginTop: 8, backgroundColor: C.canvas },
  secHeaderOpen: { borderColor: C.ink, marginBottom: 6 },
  secBadge: { backgroundColor: C.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  secBadgeTxt: { color: '#fff', fontSize: 9, fontFamily: 'monospace' },
  secTitle: { flex: 1, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: C.sub, textTransform: 'uppercase' },
  secCount: { fontSize: 11, fontFamily: 'monospace', color: C.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 6, backgroundColor: C.canvas },
  codeBox: { width: 44, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink },
  codeBoxTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
  rowTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  rowSub: { fontSize: 10, color: C.sub, marginTop: 2 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 18, paddingHorizontal: 2 },
});
