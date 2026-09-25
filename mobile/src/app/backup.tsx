import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, TextInput } from 'react-native';
import { MascotBubble } from '@/components/MascotBubble';
import { Button, Card, Gap, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { exportBackup, openBackup, WrongPasswordError } from '@/lib/backup';
import { kvGet, kvSet } from '@/lib/db';
import { usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

export default function Backup() {
  const c = useColors();
  const { reload } = useSettings();
  const { refresh } = usePet();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      kvGet('last-backup').then(setLast);
    }, []),
  );

  const input = { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 12, color: c.text, fontSize: 16 } as const;
  const strong = password.length >= 8 && password === confirm;

  const doExport = async () => {
    setBusy('Yedek hazırlanıyor… (şifreleme birkaç saniye sürebilir)');
    try {
      await exportBackup(password);
      const now = new Date().toISOString();
      await kvSet('last-backup', now);
      setLast(now);
      track('backup_exported');
      setPassword('');
      setConfirm('');
    } catch (e) {
      Alert.alert('Yedek alınamadı', e instanceof Error ? e.message : 'Bir sorun oluştu.');
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    setBusy('Yedek açılıyor…');
    try {
      const opened = await openBackup(restorePassword);
      setBusy(null);
      if (!opened) return;
      const { meta } = opened;
      Alert.alert(
        'Bu cihazdaki her şey değiştirilsin mi?',
        `${new Date(meta.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihli yedekte ${meta.tables.entries?.length ?? 0} sayfa ve ${meta.photoCount} fotoğraf var. Bu cihazdaki mevcut günlük silinip yerine yedek yüklenecek.`,
        [
          { text: 'Vazgeç', style: 'cancel', onPress: () => opened.close() },
          {
            text: 'Geri yükle', style: 'destructive',
            onPress: async () => {
              setBusy('Geri yükleniyor…');
              try {
                await opened.restore();
                await reload();
                await refresh();
                setRestorePassword('');
                Alert.alert('Hoş geldin geri! 🌱', 'Günlüğün geri yüklendi.', [{ text: 'Tamam', onPress: () => router.replace('/') }]);
              } catch (e) {
                Alert.alert('Geri yüklenemedi', e instanceof Error ? e.message : 'Bir sorun oluştu.');
              } finally {
                setBusy(null);
              }
            },
          },
        ],
      );
    } catch (e) {
      setBusy(null);
      Alert.alert(e instanceof WrongPasswordError ? 'Şifre yanlış' : 'Açılamadı', e instanceof Error ? e.message : 'Bir sorun oluştu.');
    }
  };

  return (
    <Screen>
      <MascotBubble
        text={last ? `Son yedeğin: ${new Date(last).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}. Ayda bir yedek almak iyi bir alışkanlık.` : 'Günlüğün sadece bu telefonda. Telefon kaybolur ya da değişirse diye bir yedek alalım mı?'}
        size={60}
      />
      <Gap />
      <Card style={{ gap: space.s }}>
        <T v="heading">🔐 Şifreli yedek al</T>
        <T v="muted">
          Sayfaların, fotoğrafların, mektupların, hedeflerin ve sohbetin tek bir dosyada, seçtiğin şifreyle kilitlenir. Dosyayı Google Drive’a, e-postana ya da bilgisayarına kaydedebilirsin.
        </T>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Şifre (en az 8 karakter)" placeholderTextColor={c.muted} style={input} autoCapitalize="none" />
        <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Şifre tekrar" placeholderTextColor={c.muted} style={input} autoCapitalize="none" />
        <T v="small" style={{ color: c.danger }}>Şifreyi unutursan yedek açılamaz; biz de açamayız. Güvenli bir yere not et.</T>
        <Button label="Yedeği oluştur ve kaydet" onPress={doExport} disabled={!strong || !!busy} />
      </Card>
      <Gap />
      <Card style={{ gap: space.s }}>
        <T v="heading">📥 Yedekten geri yükle</T>
        <T v="muted">Yeni telefonuna geçtiysen yedek dosyanı seç. Bu cihazdaki mevcut günlüğün yerini alır.</T>
        <TextInput value={restorePassword} onChangeText={setRestorePassword} secureTextEntry placeholder="Yedeğin şifresi" placeholderTextColor={c.muted} style={input} autoCapitalize="none" />
        <Button label="Yedek dosyasını seç" kind="secondary" onPress={doRestore} disabled={!restorePassword || !!busy} />
      </Card>
      {busy ? (
        <>
          <Gap />
          <ActivityIndicator color={c.accent} />
          <T v="small" style={{ textAlign: 'center' }}>{busy}</T>
        </>
      ) : null}
    </Screen>
  );
}
