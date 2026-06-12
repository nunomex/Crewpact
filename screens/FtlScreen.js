import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../data/constants';

export default function FtlScreen({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBlob}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={s.eyebrow}>FLIGHT TIME LIMITATIONS</Text>
          <Text style={s.headTitle}>Limites de Tempo de Voo</Text>
        </View>
      </View>

      <View style={s.empty}>
        <Ionicons name="construct-outline" size={32} color={C.line} />
        <Text style={s.emptyTxt}>Conteúdo FT em preparação</Text>
        <Text style={s.emptySub}>Assim que definires os campos (limites de serviço, voo, descanso…) preencho este ecrã.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  headerBlob: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.ink, borderRadius: 22, margin: 16, marginBottom: 12, padding: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 6 },
  headTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTxt: { fontSize: 15, fontWeight: '500', color: C.text },
  emptySub: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 19 },
});
