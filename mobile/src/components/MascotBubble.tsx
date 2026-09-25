import { Alert, Pressable, View } from 'react-native';
import { api } from '@/lib/api';
import { usePet } from '@/lib/pet';
import { space, useColors } from '@/theme';
import { Mascot, type Expression } from './Mascot';
import { T } from './ui';

/** The mascot with a speech bubble. */
export function MascotBubble({
  text, expression = 'idle', name, size = 72, showMascot = true, reportable = false,
}: { text: string; expression?: Expression; name?: string; size?: number; showMascot?: boolean; reportable?: boolean }) {
  const c = useColors();
  const { info } = usePet();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.s }}>
      {showMascot ? <Mascot size={size} expression={expression} look={info.look} /> : null}
      <View style={{ flex: 1, marginBottom: showMascot ? size * 0.35 : 0 }}>
        <View style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 18, borderBottomLeftRadius: 4, padding: space.m }}>
          {name ? <T v="small" style={{ marginBottom: 2, fontWeight: '700' }}>{name}</T> : null}
          <T v="body">{text}</T>
          {reportable ? (
            <Pressable onPress={() => reportMascotText(text)} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
              <T v="small" style={{ fontSize: 12 }}>⚑ Bildir</T>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** In-app flagging of AI output (Google Play AI-generated content policy). */
export function reportMascotText(text: string) {
  const send = (reason: 'harmful' | 'diagnostic' | 'wrong' | 'other') => async () => {
    const ok = await api.report(reason, text);
    Alert.alert(ok ? 'Teşekkürler' : 'Gönderilemedi', ok ? 'Bildirimin incelenecek.' : 'Bağlantını kontrol edip tekrar dener misin?');
  };
  Alert.alert('Bu yanıtı bildir', 'Maskotun bu mesajı incelenmek üzere gönderilir. Senin sayfan gönderilmez.', [
    { text: 'Rahatsız edici / zararlı', onPress: send('harmful') },
    { text: 'Teşhis ya da etiket koyuyor', onPress: send('diagnostic') },
    { text: 'Yanlış ya da uydurma', onPress: send('wrong') },
    { text: 'Vazgeç', style: 'cancel' },
  ]);
}
