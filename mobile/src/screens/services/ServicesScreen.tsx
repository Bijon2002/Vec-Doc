import { Platform } from 'react-native';

let ServicesScreen: any;
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ServicesScreen = require('./ServicesScreen.web').default;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ServicesScreen = require('./ServicesScreen.native').default;
}

export default ServicesScreen;