import { Buffer } from 'buffer';
global.Buffer = Buffer;
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App); 