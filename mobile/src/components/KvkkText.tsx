import { View } from 'react-native';
import { AYDINLATMA } from '@/lib/legal';
import { space } from '@/theme';
import { T } from './ui';

export function KvkkText() {
  return (
    <View style={{ gap: space.m }}>
      <T v="heading">Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni</T>
      {AYDINLATMA.map(([h, b]) => (
        <View key={h} style={{ gap: 4 }}>
          <T v="heading" style={{ fontSize: 15 }}>{h}</T>
          <T v="body">{b}</T>
        </View>
      ))}
    </View>
  );
}
