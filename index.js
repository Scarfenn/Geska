import { registerRootComponent } from 'expo';

import { registerNotifications } from "./src/features/tasks/services/notifications/registerNotifications";
import App from './App';

registerNotifications();
registerRootComponent(App);
