import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { PAYPAL_CLIENT_ID, PAYPAL_CURRENCY } from '@/constants/paypal';
import { palette } from '@/constants/theme';

export type PaypalApproval = {
  orderId: string;
  email: string;
};

function checkoutHtml(amount: string) {
  const clientId = encodeURIComponent(PAYPAL_CLIENT_ID);
  const value = JSON.stringify(amount);
  const currency = JSON.stringify(PAYPAL_CURRENCY);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: sans-serif; margin: 16px; background: #F7F3EC; color: #2C332E; }
    p { line-height: 1.4; }
  </style>
</head>
<body>
  <p>Sign in with your PayPal Personal sandbox account and approve the test payment.</p>
  <div id="paypal-button-container"></div>
  <script src="https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${PAYPAL_CURRENCY}&intent=capture&disable-funding=card,credit"></script>
  <script>
    paypal.Buttons({
      createOrder: function (data, actions) {
        return actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [{
            description: 'Hilotcare session',
            amount: { currency_code: ${currency}, value: ${value} }
          }]
        });
      },
      onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
          var email = details && details.payer && details.payer.email_address ? details.payer.email_address : '';
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'completed',
            orderId: details.id,
            email: email
          }));
        });
      },
      onCancel: function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'cancelled' }));
      },
      onError: function (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'error', message: String(err) }));
      }
    }).render('#paypal-button-container');
  </script>
</body>
</html>`;
}

export function PaypalCheckout({
  visible,
  amount,
  onClose,
  onApproved,
  onError,
}: {
  visible: boolean;
  amount: number;
  onClose: () => void;
  onApproved: (approval: PaypalApproval) => void;
  onError: (message: string) => void;
}) {
  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        status?: string;
        orderId?: string;
        email?: string;
        message?: string;
      };
      if (payload.status === 'completed' && payload.orderId) {
        onApproved({ orderId: payload.orderId, email: payload.email ?? '' });
        return;
      }
      if (payload.status === 'error') {
        onError(payload.message || 'PayPal could not complete the sandbox payment.');
        return;
      }
      if (payload.status === 'cancelled') onClose();
    } catch {
      onError('PayPal could not complete the sandbox payment.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.bar}>
          <Text style={styles.title}>PayPal sandbox</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <WebView
          style={styles.web}
          originWhitelist={['*']}
          source={{ html: checkoutHtml(amount.toFixed(2)), baseUrl: 'https://www.paypal.com' }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
          onMessage={onMessage}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  bar: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: palette.palm, fontSize: 20, fontWeight: '700' },
  close: { color: palette.orange, fontWeight: '700', fontSize: 16 },
  web: { flex: 1, backgroundColor: palette.bg },
});
