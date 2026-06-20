import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext, useTheme } from '../App';
import { t } from '../data/i18n';

// Banner fino no topo quando não há ligação. Só aparece offline — as escritas
// continuam locais (marcadas `dirty`) e sincronizam ao reconectar (flushDuties
// no App, disparado pelo NetInfo). `pointerEvents:none` não bloqueia toques.
export default function OfflineBanner() {
  const ctx = useContext(AppContext);
  const C = useTheme();
  const insets = useSafeAreaInsets();
  if (!ctx || ctx.online) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { paddingTop: insets.top + 5, backgroundColor: C.ink }]}>
      <Ionicons name="cloud-offline-outline" size={13} color="#fff" />
      <Text style={styles.txt}>{t('common.offline', ctx.lang)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingBottom: 6, paddingHorizontal: 16,
  },
  txt: { color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
});
