import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function exportFile(filename: string, content: string, mime: string, uti: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('This device cannot share files. Open the report on a phone to save it.');
  }
  await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: filename, UTI: uti });
}

export async function exportCsv(filename: string, csv: string) {
  await exportFile(filename, csv, 'text/csv', 'public.comma-separated-values-text');
}

export async function exportPdf(filename: string, pdf: string) {
  await exportFile(filename, pdf, 'application/pdf', 'com.adobe.pdf');
}
