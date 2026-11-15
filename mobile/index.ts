import { registerRootComponent } from 'expo';

import App from './App';
import { demoRoot } from './src/demo';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// demoRoot() is always null on phones and in production web builds (src/demo).
registerRootComponent(demoRoot() ?? App);
