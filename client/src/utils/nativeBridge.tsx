declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export function requestNative(
  type: 'get-location' | 'request-camera' | 'request-microphone',
) {
  window.ReactNativeWebView?.postMessage(
    JSON.stringify({ source: 'nativeBridge', type }),
  );
}

window.addEventListener('message', (event) => {
  try {
    const { data } = event;

    if (
      typeof data !== 'object' ||
      data === null ||
      data.source !== 'nativeBridge' ||
      typeof data.type !== 'string'
    ) {
      return;
    }

    const { type, payload } = data;

    switch (type) {
      case 'location-result':
        console.log('📍 Got location from native:', payload);
        break;
      case 'camera-status':
        console.log('📷 Camera permission status:', payload);
        break;
      case 'microphone-status':
        console.log('🎤 Microphone permission status:', payload);
        break;
      default:
        console.warn('⚠️ Unhandled message type:', type);
    }
  } catch (error) {
    console.error('❌ Error handling message event:', error, event);
  }
});

export async function requestLocationPermission() {
  if (window.ReactNativeWebView) {
    requestNative('get-location');
  } else {
    try {
      const permission = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      });
      console.log('🌐 Web geolocation permission:', permission.state);
    } catch (error) {
      console.error('❌ Error querying geolocation permission:', error);
    }
  }
}
