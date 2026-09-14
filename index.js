import { registerRootComponent } from 'expo';

import { registerNotifications } from "@/features/tasks/services/notifications/registerNotifications";
import App from './App';

registerNotifications();
registerRootComponent(App);
