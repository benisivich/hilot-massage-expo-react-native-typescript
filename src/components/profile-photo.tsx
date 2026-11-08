import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { pickProfilePhoto } from '@/lib/photo';

export function ProfilePhoto({
  photo,
  name,
  onChange,
}: {
  photo: string;
  name: string;
  onChange: (photo: string) => void;
}) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const choose = async () => {
    const next = await pickProfilePhoto();
    if (next) onChange(next);
  };

  return (
    <Pressable accessibilityRole="button" onPress={choose} style={{ alignItems: 'center', gap: 8 }}>
      {photo ? (
        <Image
          source={photo}
          contentFit="cover"
          style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: '#E4D5BE' }}
        />
      ) : (
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 56,
            backgroundColor: '#E4D5BE',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: palette.palm, fontWeight: '700', fontSize: 32 }}>{initials || '?'}</Text>
        </View>
      )}
      <Text style={{ color: palette.orange, fontWeight: '700' }}>{photo ? 'Change photo' : 'Add photo'}</Text>
    </Pressable>
  );
}
