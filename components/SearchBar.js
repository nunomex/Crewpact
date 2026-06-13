import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE } from '../data/constants';

// Barra de pesquisa partilhada (AE e FTL).
export default function SearchBar({ value, onChangeText, placeholder }) {
  return (
    <View style={s.wrap}>
      <Ionicons name="search" size={17} color={C.sub} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={C.sub} style={s.input} autoCorrect={false} />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close" size={16} color={C.sub} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: C.soft, borderRadius: RADIUS.pill, marginHorizontal: SPACE.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: SPACE.sm },
  input: { flex: 1, fontSize: TYPE.body, color: C.text },
});
